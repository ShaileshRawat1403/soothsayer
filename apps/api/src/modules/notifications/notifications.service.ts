import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

export type NotificationType = 
  | 'approval_request' 
  | 'approval_resolved' 
  | 'workflow_complete' 
  | 'workflow_failed' 
  | 'mention' 
  | 'system';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: WebsocketGateway,
  ) {}

  async create(params: {
    workspaceId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: any;
  }) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          workspaceId: params.workspaceId,
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          actionUrl: params.actionUrl,
          metadata: params.metadata || {},
        },
      });

      // Real-time delivery
      this.wsGateway.emitToUser(params.userId, 'notification:new', notification);
      
      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${params.title}`, error);
      throw error;
    }
  }

  async findAll(userId: string, workspaceId: string, options: { unreadOnly?: boolean; limit?: number } = {}) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        workspaceId,
        ...(options.unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string, workspaceId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, workspaceId, read: false },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }
}
