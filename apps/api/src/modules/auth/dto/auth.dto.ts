import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@soothsayer.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  rememberMe?: boolean;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'My Company' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  organizationName?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

// Response DTOs
export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresAt: number;
}

export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresAt: number;
}
