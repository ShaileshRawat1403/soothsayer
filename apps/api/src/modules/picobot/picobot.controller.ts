import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PicobotService } from './picobot.service';

@ApiTags('picobot')
@Controller('picobot')
export class PicobotController {
  constructor(private readonly picobotService: PicobotService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get Picobot operator overview from legacy runtime tables' })
  @ApiQuery({ name: 'workspaceId', required: false })
  async getOverview(
    @GetCurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId?: string
  ) {
    return this.picobotService.getOverview(user.id, workspaceId);
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get Picobot activity logs from legacy runtime tables' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @ApiQuery({ name: 'channelType', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLogs(
    @GetCurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId?: string,
    @Query('channelType') channelType?: string,
    @Query('limit') limit?: string
  ) {
    return this.picobotService.getLogs(user.id, {
      workspaceId,
      channelType,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('commands/pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get pending commands for Picobot' })
  @ApiQuery({ name: 'picobotId', required: false })
  async getPendingCommands(
    @GetCurrentUser() user: CurrentUser,
    @Query('picobotId') picobotId?: string
  ) {
    return this.picobotService.getPendingCommands(user.id, picobotId);
  }

  @Post('webhook/activity')
  @ApiOperation({ summary: 'Webhook for Picobot activity events' })
  async handleWebhook(@Body() payload: any) {
    return this.picobotService.handleWebhookEvent(payload);
  }
}
