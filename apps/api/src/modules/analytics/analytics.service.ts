import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOperatorMetrics(workspaceId: string) {
    const [
      runCounts,
      approvalMetrics,
      providerMetrics,
      blockedMetrics,
    ] = await Promise.all([
      this.getRunCounts(workspaceId),
      this.getApprovalMetrics(workspaceId),
      this.getProviderUsage(workspaceId),
      this.getBlockedReasons(workspaceId),
    ]);

    return {
      runCounts,
      approvalMetrics,
      providerMetrics,
      blockedMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  private async getRunCounts(workspaceId: string) {
    const runs = (await this.prisma.workflowRun.findMany({
      where: { workspaceId },
      select: { status: true },
    })) as Array<{ status: string }>;

    const total = runs.length;
    const successful = runs.filter((r) => r.status === 'completed').length;
    const failed = runs.filter((r) => r.status === 'failed').length;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
    };
  }

  private async getApprovalMetrics(workspaceId: string) {
    const approvals = (await this.prisma.approvalRequest.findMany({
      where: { workspaceId },
      select: {
        status: true,
        createdAt: true,
        decidedAt: true,
      },
    })) as Array<{ status: string; createdAt: Date; decidedAt: Date | null }>;

    const total = approvals.length;
    const approved = approvals.filter((a) => a.status === 'approved').length;
    const rejected = approvals.filter((a) => a.status === 'rejected').length;
    const pending = approvals.filter((a) => a.status === 'pending').length;

    const resolvedApprovals = approvals.filter((a) => a.decidedAt && a.createdAt);
    const avgDelayMs = resolvedApprovals.length > 0
      ? resolvedApprovals.reduce((acc, curr) => 
          acc + (curr.decidedAt!.getTime() - curr.createdAt.getTime()), 0) / resolvedApprovals.length
      : 0;

    return {
      total,
      approved,
      rejected,
      pending,
      avgApprovalDelayMinutes: Math.round(avgDelayMs / 60000),
    };
  }

  private async getProviderUsage(workspaceId: string) {
    // We can infer provider usage from Message metadata for now
    const assistantMessages = (await this.prisma.message.findMany({
      where: {
        role: 'assistant',
        conversation: { workspaceId },
      },
      select: { metadata: true, contentType: true },
      take: 1000, // Sample recent messages
    })) as Array<{ metadata: unknown; contentType: string | null }>;

    const usage: Record<string, number> = {};
    const failures: Record<string, number> = {};

    assistantMessages.forEach((msg) => {
      const meta = (msg.metadata || {}) as { provider?: string; error?: unknown };
      const provider = meta?.provider || 'unknown';
      usage[provider] = (usage[provider] || 0) + 1;
      
      if (meta?.error || msg.contentType === 'error') {
        failures[provider] = (failures[provider] || 0) + 1;
      }
    });

    return {
      usage,
      failures,
    };
  }

  private async getBlockedReasons(workspaceId: string) {
    // This would typically come from an audit log or policy result
    const logs = (await this.prisma.auditLog.findMany({
      where: {
        workspaceId,
        action: 'reject',
        resourceType: 'approval',
      },
      select: { metadata: true },
      take: 100,
    })) as Array<{ metadata: unknown }>;

    const reasons: Record<string, number> = {};
    logs.forEach((log) => {
      const reason = ((log.metadata || {}) as { reason?: string })?.reason || 'Policy Violation';
      reasons[reason] = (reasons[reason] || 0) + 1;
    });

    return reasons;
  }

  async trackEvent(workspaceId: string, userId: string, eventType: string, properties: any = {}) {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          workspaceId,
          userId,
          eventType,
          properties,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to track analytics event: ${eventType}`, error);
    }
  }
}
