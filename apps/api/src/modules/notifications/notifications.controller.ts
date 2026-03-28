import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async findAll(
    @GetCurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId: string,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.findAll(user.id, workspaceId, { unreadOnly });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for a workspace' })
  @ApiQuery({ name: 'workspaceId', required: true })
  async markAllAsRead(
    @GetCurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.notificationsService.markAllAsRead(user.id, workspaceId);
  }
}
