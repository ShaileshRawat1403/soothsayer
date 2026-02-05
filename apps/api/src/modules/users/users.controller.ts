import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService, UpdateProfileData, UpdatePreferencesData } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getCurrentUser(@GetCurrentUser() user: CurrentUser) {
    return this.usersService.getCurrentUser(user.id);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @GetCurrentUser() user: CurrentUser,
    @Body() data: UpdateProfileData,
  ) {
    return this.usersService.updateProfile(user.id, data);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update current user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @GetCurrentUser() user: CurrentUser,
    @Body() data: UpdatePreferencesData,
  ) {
    return this.usersService.updatePreferences(user.id, data);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 204, description: 'Password changed' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @GetCurrentUser() user: CurrentUser,
    @Body() data: { currentPassword: string; newPassword: string },
  ) {
    await this.usersService.changePassword(user.id, data.currentPassword, data.newPassword);
  }

  @Get('me/sessions')
  @ApiOperation({ summary: 'Get current user sessions' })
  @ApiResponse({ status: 200, description: 'User sessions' })
  async getSessions(@GetCurrentUser() user: CurrentUser) {
    return this.usersService.getSessions(user.id);
  }

  @Delete('me/sessions/:sessionId')
  @ApiOperation({ summary: 'Delete a specific session' })
  @ApiResponse({ status: 204, description: 'Session deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(
    @GetCurrentUser() user: CurrentUser,
    @Param('sessionId') sessionId: string,
  ) {
    await this.usersService.deleteSession(user.id, sessionId);
  }

  @Delete('me/sessions')
  @ApiOperation({ summary: 'Delete all sessions except current' })
  @ApiResponse({ status: 204, description: 'Sessions deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllSessions(@GetCurrentUser() user: CurrentUser) {
    await this.usersService.deleteAllSessions(user.id);
  }
}
