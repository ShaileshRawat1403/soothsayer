import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService
  ) {}

  async validateUser(email: string, password: string): Promise<TokenPayload | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
  }

  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthTokens & { user: TokenPayload }> {
    const authBypass = this.configService.get<boolean>('AUTH_BYPASS', false);
    if (authBypass) {
      const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
      if (nodeEnv === 'production') {
        throw new UnauthorizedException('AUTH_BYPASS is not allowed in production');
      }

      this.logger.warn('AUTH_BYPASS is enabled in non-production. Password checks are skipped.');
      const fallbackEmail = this.configService.get<string>(
        'AUTH_BYPASS_EMAIL',
        'admin@soothsayer.local'
      );
      const email = (dto.email || fallbackEmail).toLowerCase();
      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        const generatedPassword = `Bypass${uuidv4()}Aa1!`;
        const generatedName = dto.email
          ? dto.email.split('@')[0]
          : this.configService.get<string>('AUTH_BYPASS_NAME', 'Admin User');
        const provisioned = await this.register({
          email,
          password: generatedPassword,
          name: generatedName,
          organizationName: `${generatedName}'s Workspace`,
        });
        return provisioned;
      }

      // Ensure bypass user stays active for local testing.
      if (!user.isActive) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: true },
        });
      }

      const bypassPayload: TokenPayload = {
        sub: user.id,
        email: user.email,
        name: user.name,
      };
      const bypassTokens = await this.generateTokens(bypassPayload);
      await this.createSession(user.id, bypassTokens.refreshToken, userAgent, ipAddress);
      this.logger.warn(`AUTH_BYPASS enabled. Logged in without password check: ${user.email}`);
      return {
        ...bypassTokens,
        user: bypassPayload,
      };
    }

    const payload = await this.validateUser(dto.email, dto.password);

    if (!payload) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(payload);

    // Create session
    await this.createSession(payload.sub, tokens.refreshToken, userAgent, ipAddress);

    this.logger.log(`User logged in: ${payload.email}`);

    return {
      ...tokens,
      user: payload,
    };
  }

  async register(dto: RegisterDto): Promise<AuthTokens & { user: TokenPayload }> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    // Create user and organization in a transaction
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          preferences: {
            theme: 'dark',
            language: 'en',
            notifications: {
              email: true,
              inApp: true,
              approvalRequests: true,
              workflowCompletions: true,
              mentions: true,
            },
          },
        },
      });

      // Create personal organization
      const orgName = dto.organizationName || `${dto.name}'s Organization`;
      const orgSlug = this.generateSlug(orgName);

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          settings: {
            allowSignup: true,
            defaultWorkspaceRole: 'editor',
            maxWorkspaces: 5,
            enableAuditLogs: true,
            dataRetentionDays: 90,
          },
        },
      });

      // Add user as organization owner
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'owner',
        },
      });

      // Create default workspace
      const workspace = await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: 'Main Workspace',
          slug: 'main',
          isDefault: true,
          settings: {
            maxConcurrentJobs: 5,
            retentionDays: 90,
          },
        },
      });

      // Add user as workspace admin
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'admin',
        },
      });

      return user;
    });

    const payload: TokenPayload = {
      sub: result.id,
      email: result.email,
      name: result.name,
    };

    const tokens = await this.generateTokens(payload);

    // Create session
    await this.createSession(result.id, tokens.refreshToken);

    this.logger.log(`User registered: ${result.email}`);

    return {
      ...tokens,
      user: payload,
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokens> {
    const refreshTokenHash = this.hashToken(dto.refreshToken);
    const session = await this.prisma.session.findFirst({
      where: {
        OR: [{ refreshTokenHash }, { refreshToken: dto.refreshToken }],
      },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    const payload: TokenPayload = {
      sub: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };

    const tokens = await this.generateTokens(payload);

    // Update session with new refresh token
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: null,
        refreshTokenHash: this.hashToken(tokens.refreshToken),
        expiresAt: this.getRefreshTokenExpiry(),
        lastActiveAt: new Date(),
      },
    });

    return tokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const refreshTokenHash = this.hashToken(refreshToken);
      // Invalidate specific session
      await this.prisma.session.deleteMany({
        where: {
          userId,
          OR: [{ refreshTokenHash }, { refreshToken }],
        },
      });
    } else {
      // Invalidate all sessions
      await this.prisma.session.deleteMany({
        where: { userId },
      });
    }

    this.logger.log(`User logged out: ${userId}`);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return;
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = this.hashToken(resetToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: resetTokenHash,
        passwordResetExpiresAt: this.getPasswordResetExpiry(),
        passwordResetUsedAt: null,
      },
    });

    this.logger.log(`Password reset requested for: ${dto.email}`);
    this.logger.debug('Password reset token generated and stored as hash.');
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const resetTokenHash = this.hashToken(dto.token);
    const user = await this.prisma.user.findUnique({
      where: { passwordResetTokenHash: resetTokenHash },
      select: {
        id: true,
        passwordResetExpiresAt: true,
        passwordResetUsedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.passwordResetUsedAt) {
      throw new BadRequestException('Reset token has already been used');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetUsedAt: new Date(),
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      }),
      this.prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    this.logger.log('Password reset completed successfully');
  }

  private async generateTokens(payload: TokenPayload): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    const accessExpiration = this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m');
    const expiresAt = Date.now() + this.parseExpiration(accessExpiration);

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  private async createSession(
    userId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken: null,
        refreshTokenHash: this.hashToken(refreshToken),
        userAgent,
        ipAddress,
        expiresAt: this.getRefreshTokenExpiry(),
      },
    });
  }

  private getPasswordResetExpiry(): Date {
    const expiration = this.configService.get<string>('PASSWORD_RESET_TOKEN_EXPIRATION', '1h');
    return new Date(Date.now() + this.parseExpiration(expiration));
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenExpiry(): Date {
    const expiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
    return new Date(Date.now() + this.parseExpiration(expiration));
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 15 * 60 * 1000; // Default 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}
