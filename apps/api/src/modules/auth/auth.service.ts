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
import { v4 as uuidv4 } from 'uuid';
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
    private usersService: UsersService,
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

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string): Promise<AuthTokens & { user: TokenPayload }> {
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
    const result = await this.prisma.$transaction(async (tx) => {
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
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: dto.refreshToken },
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
        refreshToken: tokens.refreshToken,
        expiresAt: this.getRefreshTokenExpiry(),
        lastActiveAt: new Date(),
      },
    });

    return tokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Invalidate specific session
      await this.prisma.session.deleteMany({
        where: { userId, refreshToken },
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

    // Generate password reset token (in real app, send via email)
    const resetToken = uuidv4();
    
    // Store token (in real app, would use a dedicated table or cache)
    this.logger.log(`Password reset requested for: ${dto.email} (Token: ${resetToken})`);
    
    // TODO: Send email with reset link
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    // TODO: Validate reset token and update password
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    
    this.logger.log(`Password reset completed for token: ${dto.token}`);
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
    ipAddress?: string,
  ): Promise<void> {
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        userAgent,
        ipAddress,
        expiresAt: this.getRefreshTokenExpiry(),
      },
    });
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
