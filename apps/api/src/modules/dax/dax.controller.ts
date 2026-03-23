import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GetCurrentUser, type CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DaxService } from './dax.service';
import type {
  DaxApprovalDecision,
  DaxCreateRunRequest,
  DaxResolveApprovalRequest,
} from './dax.types';
import type { DaxRecoverySummary } from '@soothsayer/types';

@ApiTags('dax')
@Controller('dax')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DaxController {
  constructor(private readonly daxService: DaxService) {}

  @Get('health')
  async getHealth() {
    return this.daxService.getHealth();
  }

  @Get('overview')
  async getOverview(@Query('repoPath') repoPath?: string) {
    return this.daxService.getOverview(repoPath);
  }

  @Post('runs')
  async createRun(@GetCurrentUser() user: CurrentUser, @Body() payload: DaxCreateRunRequest) {
    return this.daxService.createRun(user, payload);
  }

  @Get('runs/:id')
  async getRun(@Param('id') id: string, @Query('repoPath') repoPath?: string) {
    return this.daxService.getRunSnapshot(id, repoPath);
  }

  @Get('runs/:id/events')
  async streamEvents(
    @Param('id') id: string,
    @Query('cursor') cursor: string | undefined,
    @Query('repoPath') repoPath: string | undefined,
    @Res() res: Response
  ) {
    const upstream = await this.daxService.getEventStream(id, cursor, repoPath);

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const reader = upstream.body?.getReader();
    if (!reader) {
      res.end();
      return;
    }

    const abort = () => {
      void reader.cancel().catch(() => undefined);
    };

    res.on('close', abort);
    res.on('finish', abort);

    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) {
          break;
        }
        res.write(Buffer.from(chunk.value));
      }
    } finally {
      res.off('close', abort);
      res.off('finish', abort);
      res.end();
    }
  }

  @Get('runs/:id/approvals')
  async getApprovals(@Param('id') id: string, @Query('repoPath') repoPath?: string) {
    return this.daxService.getApprovals(id, repoPath);
  }

  @Post('runs/:id/approvals/:approvalId')
  async resolveApproval(
    @Param('id') id: string,
    @Param('approvalId') approvalId: string,
    @GetCurrentUser() user: CurrentUser,
    @Query('repoPath') repoPath: string | undefined,
    @Body() payload: { decision: DaxApprovalDecision; comment?: string; requestId?: string }
  ) {
    const request: DaxResolveApprovalRequest = {
      decision: payload.decision,
      actorId: user.id,
      source: 'soothsayer',
      ...(payload.comment ? { comment: payload.comment } : {}),
      ...(payload.requestId ? { requestId: payload.requestId } : {}),
    };

    return this.daxService.resolveApproval(id, approvalId, request, repoPath);
  }

  @Get('runs/:id/summary')
  async getSummary(@Param('id') id: string, @Query('repoPath') repoPath?: string) {
    return this.daxService.getSummary(id, repoPath);
  }

  @Get('runs/:id/artifacts')
  async getArtifacts(@Param('id') id: string, @Query('repoPath') repoPath?: string) {
    return this.daxService.getArtifacts(id, repoPath);
  }

  @Get('runs/:id/recovery')
  async getRecoverySummary(@Param('id') id: string, @Query('repoPath') repoPath?: string) {
    return this.daxService.getRecoverySummary(id, repoPath);
  }

  @Post('runs/:id/recover')
  async recoverRun(@Param('id') id: string, @Query('repoPath') repoPath?: string) {
    return this.daxService.recoverRun(id, repoPath);
  }

  @Post('runs/recovery-status')
  async getBatchRecoveryStatus(
    @Body() payload: { runIds: string[]; repoPath?: string }
  ): Promise<Record<string, DaxRecoverySummary>> {
    const { runIds, repoPath } = payload;
    if (!Array.isArray(runIds) || runIds.length === 0) {
      return {};
    }

    const results: Record<string, DaxRecoverySummary> = {};
    await Promise.all(
      runIds.map(async (runId) => {
        try {
          const summary = await this.daxService.getRecoverySummary(runId, repoPath);
          results[runId] = summary;
        } catch {
          results[runId] = {
            hasState: false,
            isTerminal: false,
            needsRecovery: false,
            eventCount: 0,
          };
        }
      })
    );
    return results;
  }
}
