import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  AuthResponseDto,
  TokenResponseDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    const userAgent = request.headers['user-agent'];
    const ipAddress = request.ip;
    
    const result = await this.authService.login(dto, userAgent, ipAddress);
    
    return {
      user: {
        id: result.user.sub,
        email: result.user.email,
        name: result.user.name,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'Registration successful', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto);
    
    return {
      user: {
        id: result.user.sub,
        email: result.user.email,
        name: result.user.name,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    const result = await this.authService.refreshToken(dto);
    
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(
    @GetCurrentUser() user: CurrentUser,
    @Body('refreshToken') refreshToken?: string,
  ): Promise<void> {
    await this.authService.logout(user.id, refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 204, description: 'Password reset email sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 204, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }
}
