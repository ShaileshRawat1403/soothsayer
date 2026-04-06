import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type LegacyPicobotInstanceRow = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  url: string | null;
  status: string;
  health: unknown;
  lastSeenAt: Date | null;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type LegacyPicobotChannelRow = {
  id: string;
  picobotId: string;
  channelType: string;
  name: string;
  enabled: boolean;
  status: string;
  stats: unknown;
  lastActivityAt: Date | null;
  messages24h: number;
  activeSessions: number;
};

type LegacyPicobotSessionRow = {
  id: string;
  channelId: string;
  channelType: string;
  userId: string | null;
  userName: string | null;
  status: string;
  messageCount: number;
  tokenCount: number;
  startedAt: Date;
  lastMessageAt: Date | null;
  endedAt: Date | null;
  metadata: unknown;
};

type LegacyPicobotActivityRow = {
  id: string;
  type: string;
  channelType: string | null;
  userId: string | null;
  userName: string | null;
  message: string;
  metadata: unknown;
  timestamp: Date;
};

type LegacyPicobotCommandRow = {
  id: string;
  commandType: string;
  status: string;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
  acknowledgedAt: Date | null;
  completedAt: Date | null;
};

type LegacyPicobotAggregateRow = {
  totalSessions: number;
  activeSessions: number;
  telegramActiveSessions: number;
  sessions24h: number;
  messages24h: number;
  telegramMessages24h: number;
  pendingCommands: number;
  totalCommands: number;
};

@Injectable()
export class PicobotService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string, workspaceId?: string) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, workspaceId);

    if (!(await this.hasLegacyTables())) {
      return this.buildEmptyOverview(resolvedWorkspaceId);
    }

    const instance =
      (await this.findInstance(resolvedWorkspaceId)) || (await this.findAnyInstance());
    if (!instance) {
      return this.buildEmptyOverview(resolvedWorkspaceId);
    }

    const [channels, sessions, recentLogs, recentCommands, aggregateRows] = await Promise.all([
      this.getChannels(instance.id),
      this.getSessions(instance.id),
      this.getActivities(instance.id, { limit: 18 }),
      this.getCommands(instance.id),
      this.getAggregateStats(instance.id),
    ]);

    const aggregates = aggregateRows[0] ?? {
      totalSessions: 0,
      activeSessions: 0,
      telegramActiveSessions: 0,
      sessions24h: 0,
      messages24h: 0,
      telegramMessages24h: 0,
      pendingCommands: 0,
      totalCommands: 0,
    };

    return {
      workspaceId: instance.workspaceId,
      legacyData: true,
      instance: {
        ...instance,
        description:
          instance.description ||
          'Legacy Picobot runtime data retained for operator visibility while the suite moves to DAX-first execution.',
      },
      stats: {
        status: instance.status,
        totalChannels: channels.length,
        connectedChannels: channels.filter(
          (channel) => channel.enabled && channel.status === 'connected'
        ).length,
        enabledChannels: channels.filter((channel) => channel.enabled).length,
        totalSessions: aggregates.totalSessions,
        activeSessions: aggregates.activeSessions,
        telegramActiveSessions: aggregates.telegramActiveSessions,
        sessions24h: aggregates.sessions24h,
        messages24h: aggregates.messages24h,
        telegramMessages24h: aggregates.telegramMessages24h,
        pendingCommands: aggregates.pendingCommands,
        totalCommands: aggregates.totalCommands,
        lastSeenAt: instance.lastSeenAt,
      },
      channels,
      sessions,
      recentLogs: recentLogs.map((log) => this.mapActivity(log)),
      recentCommands: recentCommands.map((command) => ({
        ...command,
        ageMinutes: Math.max(
          0,
          Math.round((Date.now() - new Date(command.createdAt).getTime()) / 60000)
        ),
      })),
    };
  }

  async getLogs(
    userId: string,
    params: {
      workspaceId?: string;
      channelType?: string;
      limit?: number;
    }
  ) {
    const resolvedWorkspaceId = await this.resolveWorkspaceId(userId, params.workspaceId);

    if (!(await this.hasLegacyTables())) {
      return {
        workspaceId: resolvedWorkspaceId,
        legacyData: false,
        channelType: params.channelType || null,
        logs: [],
      };
    }

    const instance =
      (await this.findInstance(resolvedWorkspaceId)) || (await this.findAnyInstance());
    if (!instance) {
      return {
        workspaceId: resolvedWorkspaceId,
        legacyData: false,
        channelType: params.channelType || null,
        logs: [],
      };
    }

    const limit = this.clampLimit(params.limit);
    const logs = await this.getActivities(instance.id, {
      channelType: params.channelType,
      limit,
    });

    return {
      workspaceId: instance.workspaceId,
      legacyData: true,
      channelType: params.channelType || null,
      logs: logs.map((log) => this.mapActivity(log)),
    };
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string): Promise<string> {
    if (workspaceId) {
      await this.ensureWorkspaceAccess(workspaceId, userId);
      return workspaceId;
    }

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      select: { workspaceId: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to any workspace');
    }

    return membership.workspaceId;
  }

  private async ensureWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
  }

  private async hasLegacyTables(): Promise<boolean> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
        select count(*)::text as count
        from pg_tables
        where schemaname = 'public'
          and tablename in (
            'PicobotInstance',
            'PicobotChannel',
            'PicobotSession',
            'PicobotActivity',
            'PicobotCommand'
          )
      `
    )) as Array<{ count: string }>;

    return Number(rows[0]?.count || '0') === 5;
  }

  private async findInstance(workspaceId: string): Promise<LegacyPicobotInstanceRow | null> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
        select
          id,
          "workspaceId" as "workspaceId",
          name,
          description,
          url,
          status,
          health,
          "lastSeenAt" as "lastSeenAt",
          config,
          "createdAt" as "createdAt",
          "updatedAt" as "updatedAt"
        from "PicobotInstance"
        where "workspaceId" = $1
        limit 1
      `,
      workspaceId
    )) as LegacyPicobotInstanceRow[];

    return rows[0] ?? null;
  }

  private async findAnyInstance(): Promise<LegacyPicobotInstanceRow | null> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
        select
          id,
          "workspaceId" as "workspaceId",
          name,
          description,
          url,
          status,
          health,
          "lastSeenAt" as "lastSeenAt",
          config,
          "createdAt" as "createdAt",
          "updatedAt" as "updatedAt"
        from "PicobotInstance"
        order by "updatedAt" desc
        limit 1
      `
    )) as LegacyPicobotInstanceRow[];

    return rows[0] ?? null;
  }

  private async getChannels(picobotId: string): Promise<LegacyPicobotChannelRow[]> {
    return this.prisma.$queryRawUnsafe(
      `
        select
          c.id,
          c."picobotId" as "picobotId",
          c."channelType" as "channelType",
          c.name,
          c.enabled,
          c.status,
          c.stats,
          c."lastActivityAt" as "lastActivityAt",
          coalesce(logs."messages24h", 0)::int as "messages24h",
          coalesce(active."activeSessions", 0)::int as "activeSessions"
        from "PicobotChannel" c
        left join (
          select
            "channelType",
            count(*)::int as "messages24h"
          from "PicobotActivity"
          where "picobotId" = $1
            and timestamp >= now() - interval '24 hours'
          group by "channelType"
        ) logs on logs."channelType" = c."channelType"
        left join (
          select
            "channelId",
            count(*)::int as "activeSessions"
          from "PicobotSession"
          where "picobotId" = $1
            and status = 'active'
          group by "channelId"
        ) active on active."channelId" = c.id
        where c."picobotId" = $1
        order by case when c."channelType" = 'telegram' then 0 else 1 end, c.name asc
      `,
      picobotId
    ) as Promise<LegacyPicobotChannelRow[]>;
  }

  private async getSessions(picobotId: string): Promise<LegacyPicobotSessionRow[]> {
    return this.prisma.$queryRawUnsafe(
      `
        select
          id,
          "channelId" as "channelId",
          "channelType" as "channelType",
          "userId" as "userId",
          "userName" as "userName",
          status,
          "messageCount" as "messageCount",
          "tokenCount" as "tokenCount",
          "startedAt" as "startedAt",
          "lastMessageAt" as "lastMessageAt",
          "endedAt" as "endedAt",
          metadata
        from "PicobotSession"
        where "picobotId" = $1
        order by coalesce("lastMessageAt", "startedAt") desc
        limit 30
      `,
      picobotId
    ) as Promise<LegacyPicobotSessionRow[]>;
  }

  private async getActivities(
    picobotId: string,
    options: {
      channelType?: string;
      limit: number;
    }
  ): Promise<LegacyPicobotActivityRow[]> {
    const params: Array<string | number> = [picobotId];
    let query = `
      select
        id,
        type,
        "channelType" as "channelType",
        "userId" as "userId",
        "userName" as "userName",
        message,
        metadata,
        timestamp
      from "PicobotActivity"
      where "picobotId" = $1
    `;

    if (options.channelType) {
      params.push(options.channelType);
      query += ` and "channelType" = $${params.length}`;
    }

    params.push(this.clampLimit(options.limit));
    query += ` order by timestamp desc limit $${params.length}`;

    return this.prisma.$queryRawUnsafe(query, ...params) as Promise<LegacyPicobotActivityRow[]>;
  }

  private async getCommands(picobotId: string): Promise<LegacyPicobotCommandRow[]> {
    return this.prisma.$queryRawUnsafe(
      `
        select
          id,
          "commandType" as "commandType",
          status,
          payload,
          "createdAt" as "createdAt",
          "updatedAt" as "updatedAt",
          "sentAt" as "sentAt",
          "acknowledgedAt" as "acknowledgedAt",
          "completedAt" as "completedAt"
        from "PicobotCommand"
        where "picobotId" = $1
        order by "createdAt" desc
        limit 12
      `,
      picobotId
    ) as Promise<LegacyPicobotCommandRow[]>;
  }

  private async getAggregateStats(picobotId: string): Promise<LegacyPicobotAggregateRow[]> {
    return this.prisma.$queryRawUnsafe(
      `
        with session_stats as (
          select
            count(*)::int as "totalSessions",
            count(*) filter (where status = 'active')::int as "activeSessions",
            count(*) filter (where status = 'active' and "channelType" = 'telegram')::int as "telegramActiveSessions",
            count(*) filter (where "startedAt" >= now() - interval '24 hours')::int as "sessions24h"
          from "PicobotSession"
          where "picobotId" = $1
        ),
        activity_stats as (
          select
            count(*) filter (
              where timestamp >= now() - interval '24 hours'
                and type in ('message_received', 'message_sent')
            )::int as "messages24h",
            count(*) filter (
              where timestamp >= now() - interval '24 hours'
                and "channelType" = 'telegram'
                and type in ('message_received', 'message_sent')
            )::int as "telegramMessages24h"
          from "PicobotActivity"
          where "picobotId" = $1
        ),
        command_stats as (
          select
            count(*) filter (where status = 'pending')::int as "pendingCommands",
            count(*)::int as "totalCommands"
          from "PicobotCommand"
          where "picobotId" = $1
        )
        select
          session_stats."totalSessions",
          session_stats."activeSessions",
          session_stats."telegramActiveSessions",
          session_stats."sessions24h",
          activity_stats."messages24h",
          activity_stats."telegramMessages24h",
          command_stats."pendingCommands",
          command_stats."totalCommands"
        from session_stats, activity_stats, command_stats
      `,
      picobotId
    ) as Promise<LegacyPicobotAggregateRow[]>;
  }

  private mapActivity(row: LegacyPicobotActivityRow) {
    const direction = this.resolveDirection(row.type);
    return {
      ...row,
      direction,
      summary: row.message.length > 180 ? `${row.message.slice(0, 177)}...` : row.message,
    };
  }

  private resolveDirection(type: string): 'inbound' | 'outbound' | 'system' {
    const normalized = type.toLowerCase();
    if (
      normalized.includes('received') ||
      normalized.includes('inbound') ||
      normalized === 'message_received'
    ) {
      return 'inbound';
    }

    if (
      normalized.includes('sent') ||
      normalized.includes('outbound') ||
      normalized.includes('send')
    ) {
      return 'outbound';
    }

    return 'system';
  }

  private clampLimit(limit?: number): number {
    if (!Number.isFinite(limit)) {
      return 60;
    }

    return Math.max(10, Math.min(200, Math.floor(limit as number)));
  }

  private buildEmptyOverview(workspaceId: string) {
    return {
      workspaceId,
      legacyData: false,
      instance: null,
      stats: {
        status: 'offline',
        totalChannels: 0,
        connectedChannels: 0,
        enabledChannels: 0,
        totalSessions: 0,
        activeSessions: 0,
        telegramActiveSessions: 0,
        sessions24h: 0,
        messages24h: 0,
        telegramMessages24h: 0,
        pendingCommands: 0,
        totalCommands: 0,
        lastSeenAt: null,
      },
      channels: [],
      sessions: [],
      recentLogs: [],
      recentCommands: [],
    };
  }

  async getPendingCommands(userId: string, picobotId?: string) {
    const workspaceMember = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      select: { workspaceId: true },
    });

    if (!workspaceMember) {
      return [];
    }

    let picobotInstance = null;
    if (picobotId) {
      picobotInstance = await this.prisma.picobotInstance.findUnique({
        where: { id: picobotId, workspaceId: workspaceMember.workspaceId },
      });
    } else {
      picobotInstance = await this.prisma.picobotInstance.findFirst({
        where: { workspaceId: workspaceMember.workspaceId },
      });
    }

    if (!picobotInstance) {
      return [];
    }

    const pendingCommands = await this.prisma.picobotCommand.findMany({
      where: {
        picobotId: picobotInstance.id,
        status: 'pending',
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return pendingCommands;
  }

  async handleWebhookEvent(payload: any) {
    return { success: true, received: true };
  }
}
