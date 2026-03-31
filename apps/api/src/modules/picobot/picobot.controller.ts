import { Controller, Get, Post, Patch, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PicobotService } from './picobot.service';

@Controller('picobot')
export class PicobotController {
  constructor(private readonly picobotService: PicobotService) {}

  @Post()
  async createPicobot(@Body() body: { workspaceId: string; name?: string }) {
    return this.picobotService.create({ workspaceId: body.workspaceId, name: body.name });
  }

  @Public()
  @Post('webhook/health')
  async webhookHealth(@Body() body: { picobotId?: string; status?: string }) {
    try {
      if (body.picobotId) {
        await this.picobotService.updateHealth(body.picobotId, { status: body.status });
      }
    } catch {}
    return { received: true };
  }

  @Public()
  @Post('webhook/activity')
  async webhookActivity(@Body() body: { picobotId: string; activity: any }) {
    try {
      await this.picobotService.syncActivity(body.picobotId, body.activity);
    } catch {}
    return { received: true };
  }

  @Public()
  @Post('commands/:commandId/acknowledge')
  async acknowledgeCommand(@Param('commandId') commandId: string) {
    try {
      await this.picobotService.acknowledgeCommand(commandId);
    } catch {}
    return { received: true };
  }

  @Public()
  @Post('commands/:commandId/complete')
  async completeCommand(@Param('commandId') commandId: string, @Body() body: { result: Record<string, unknown> }) {
    try {
      await this.picobotService.completeCommand(commandId, body.result);
    } catch {}
    return { received: true };
  }

  @Public()
  @Get('commands/pending')
  async getPendingCommands(@Query('picobotId') picobotId: string) {
    if (!picobotId) throw new BadRequestException('picobotId required');
    return this.picobotService.getPendingCommands(picobotId);
  }

  @Get('stats')
  async getStats(@Query('workspaceId') workspaceId: string) {
    const wsId = workspaceId || 'cmnejcjub000i13m3k5wxt81k';
    let picobot = await this.picobotService.findById(wsId, '');
    if (!picobot) {
      picobot = await this.picobotService.create({ workspaceId: wsId });
    }
    return this.picobotService.getStats(wsId);
  }

  @Post('send')
  async sendMessage(@Body() body: { channelId: string; message: string; userId?: string }) {
    const workspaceId = 'cmnejcjub000i13m3k5wxt81k';
    let picobot = await this.picobotService.findById(workspaceId, '');
    if (!picobot) {
      picobot = await this.picobotService.create({ workspaceId });
    }
    const command = await this.picobotService.createCommand({
      picobotId: picobot.id,
      commandType: 'send_message',
      payload: {
        channel: body.channelId,
        message: body.message,
        userId: body.userId,
      },
    });
    return { commandId: command.id, status: 'queued', channel: body.channelId };
  }
}
