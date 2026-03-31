import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PicobotService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(workspaceId: string, userId: string) {
    return this.prisma.picobotInstance.findUnique({
      where: { workspaceId },
      include: {
        channels: true,
      },
    });
  }

  async create(data: { workspaceId: string; name?: string }) {
    return this.prisma.picobotInstance.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name || 'Picobot',
        status: 'active',
      },
    });
  }

  async getStats(workspaceId: string) {
    const picobot = await this.prisma.picobotInstance.findUnique({
      where: { workspaceId },
      include: {
        channels: {
          include: {
            sessions: {
              where: {
                startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
              },
            },
          },
        },
        sessions: true,
        activities: {
          where: {
            timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        },
      },
    });

    if (!picobot) {
      return {
        health: { status: 'offline', uptime: {} },
        channels: [],
        stats: {
          totalSessions: 0,
          activeSessions: 0,
          todaySessions: 0,
          messagesToday: 0,
        },
        recentActivity: [],
      };
    }

    const todaySessions = picobot.sessions.filter((s: any) => 
      s.startedAt >= new Date(new Date().setHours(0, 0, 0, 0))
    ).length;

    const messagesToday = picobot.activities.filter((a: any) => 
      a.type === 'message_received' || a.type === 'message_sent'
    ).length;

    return {
      health: {
        status: picobot.status,
        uptime: {},
      },
      channels: picobot.channels.map((ch: any) => ({
        id: ch.id,
        name: ch.channelType.charAt(0).toUpperCase() + ch.channelType.slice(1),
        enabled: ch.enabled,
        status: ch.enabled ? 'connected' : 'disconnected',
        sessions: picobot.sessions.filter((s: any) => 
          s.channelId === ch.id && s.status === 'active'
        ).length,
        messagesToday: picobot.activities.filter((a: any) => 
          a.channelType === ch.channelType && 
          (a.type === 'message_received' || a.type === 'message_sent')
        ).length,
      })),
      stats: {
        totalSessions: picobot.sessions.length,
        activeSessions: picobot.sessions.filter((s: any) => s.status === 'active').length,
        todaySessions,
        messagesToday,
      },
      recentActivity: picobot.activities.slice(0, 20),
    };
  }

  async getChannels(picobotId: string) {
    return this.prisma.picobotChannel.findMany({
      where: { picobotId },
    });
  }

  async toggleChannel(channelId: string, enabled: boolean) {
    return this.prisma.picobotChannel.update({
      where: { id: channelId },
      data: { enabled },
    });
  }

  async createCommand(data: {
    picobotId: string;
    commandType: string;
    payload: Record<string, unknown>;
  }) {
    return this.prisma.picobotCommand.create({
      data: {
        picobotId: data.picobotId,
        commandType: data.commandType,
        payload: data.payload as Prisma.InputJsonValue,
        status: 'pending',
      },
    });
  }

  async getPendingCommands(picobotId: string) {
    return this.prisma.picobotCommand.findMany({
      where: { picobotId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
  }

  async acknowledgeCommand(commandId: string) {
    return this.prisma.picobotCommand.update({
      where: { id: commandId },
      data: { status: 'acknowledged' },
    });
  }

  async completeCommand(commandId: string, result: Record<string, unknown>) {
    return this.prisma.picobotCommand.update({
      where: { id: commandId },
      data: {
        status: 'completed',
        result: result as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
  }

  async syncActivity(picobotId: string, data: {
    type: string;
    channelType?: string;
    userId?: string;
    userName?: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    let channel = null;
    if (data.channelType) {
      channel = await this.prisma.picobotChannel.findFirst({
        where: { picobotId, channelType: data.channelType },
      });
    }

    return this.prisma.picobotActivity.create({
      data: {
        picobotId,
        type: data.type,
        channelType: data.channelType,
        userId: data.userId,
        userName: data.userName,
        message: data.message,
        metadata: (data.metadata || {}) as Prisma.InputJsonValue,
      },
    });
  }

  async updateHealth(picobotId: string, data: { status?: string }) {
    return this.prisma.picobotInstance.update({
      where: { id: picobotId },
      data: { status: data.status },
    });
  }
}
