import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  workspaceId?: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/ws',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private connectedClients = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    const rawToken = this.extractToken(client);
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const allowUnauthenticatedDev =
      nodeEnv !== 'production' && this.configService.get<boolean>('WS_AUTH_ALLOW_IN_DEV', false);

    if (!rawToken) {
      if (allowUnauthenticatedDev) {
        this.logger.warn(
          `Client ${client.id} connected without authentication (WS_AUTH_ALLOW_IN_DEV=true)`
        );
        return;
      }

      this.logger.warn(`Client ${client.id} rejected: missing websocket authentication token`);
      client.disconnect(true);
      return;
    }

    const token = this.normalizeToken(rawToken);

    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string }>(token);
      if (!payload?.sub) {
        throw new Error('JWT payload missing subject');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      client.userId = user.id;
      if (!this.connectedClients.has(user.id)) {
        this.connectedClients.set(user.id, new Set());
      }
      this.connectedClients.get(user.id)!.add(client.id);
      this.logger.log(`Authenticated websocket client connected: ${client.id} (user=${user.id})`);
    } catch (error) {
      this.logger.warn(
        `Client ${client.id} rejected: invalid websocket token (${error instanceof Error ? error.message : 'unknown'})`
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from tracking
    if (client.userId) {
      const userSockets = this.connectedClients.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedClients.delete(client.userId);
        }
      }
    }
  }

  // ============================================
  // CHAT EVENTS
  // ============================================

  @SubscribeMessage('chat:join')
  handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    this.ensureAuthenticated(client);
    client.join(`conversation:${data.conversationId}`);
    this.logger.debug(`Client ${client.id} joined conversation ${data.conversationId}`);
    return { event: 'chat:joined', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('chat:leave')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    this.ensureAuthenticated(client);
    client.leave(`conversation:${data.conversationId}`);
    this.logger.debug(`Client ${client.id} left conversation ${data.conversationId}`);
    return { event: 'chat:left', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('chat:stop')
  handleStopGeneration(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string }
  ) {
    this.ensureAuthenticated(client);
    // TODO: Cancel the AI generation job
    this.logger.log(`Stop generation requested for message ${data.messageId}`);
    return { event: 'chat:stopped', data };
  }

  // ============================================
  // COMMAND EVENTS
  // ============================================

  @SubscribeMessage('command:subscribe')
  handleSubscribeCommand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { executionId: string }
  ) {
    this.ensureAuthenticated(client);
    client.join(`execution:${data.executionId}`);
    return { event: 'command:subscribed', data };
  }

  @SubscribeMessage('command:unsubscribe')
  handleUnsubscribeCommand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { executionId: string }
  ) {
    this.ensureAuthenticated(client);
    client.leave(`execution:${data.executionId}`);
    return { event: 'command:unsubscribed', data };
  }

  @SubscribeMessage('command:cancel')
  handleCancelCommand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { executionId: string; reason?: string }
  ) {
    this.ensureAuthenticated(client);
    // TODO: Cancel the command execution
    this.logger.log(`Cancel requested for execution ${data.executionId}`);
    return { event: 'command:cancelled', data };
  }

  // ============================================
  // WORKFLOW EVENTS
  // ============================================

  @SubscribeMessage('workflow:subscribe')
  handleSubscribeWorkflow(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { runId: string }
  ) {
    this.ensureAuthenticated(client);
    client.join(`workflow:${data.runId}`);
    return { event: 'workflow:subscribed', data };
  }

  @SubscribeMessage('workflow:unsubscribe')
  handleUnsubscribeWorkflow(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { runId: string }
  ) {
    this.ensureAuthenticated(client);
    client.leave(`workflow:${data.runId}`);
    return { event: 'workflow:unsubscribed', data };
  }

  // ============================================
  // APPROVAL EVENTS
  // ============================================

  @SubscribeMessage('approval:subscribe')
  handleSubscribeApprovals(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { workspaceId: string }
  ) {
    this.ensureAuthenticated(client);
    client.join(`approvals:${data.workspaceId}`);
    return { event: 'approval:subscribed', data };
  }

  private extractToken(client: AuthenticatedSocket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken;
    }

    const headerToken = client.handshake.headers?.authorization;
    if (typeof headerToken === 'string' && headerToken.trim()) {
      return headerToken;
    }

    return undefined;
  }

  private normalizeToken(token: string): string {
    const trimmed = token.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      return trimmed.slice(7).trim();
    }
    return trimmed;
  }

  private ensureAuthenticated(client: AuthenticatedSocket): void {
    if (!client.userId) {
      throw new WsException('Authentication required');
    }
  }

  // ============================================
  // SERVER -> CLIENT EMISSION HELPERS
  // ============================================

  // Chat streaming
  emitChatToken(conversationId: string, messageId: string, token: string, index: number) {
    this.server.to(`conversation:${conversationId}`).emit('chat:token', {
      conversationId,
      messageId,
      token,
      index,
      timestamp: new Date(),
    });
  }

  emitChatComplete(conversationId: string, messageId: string, data: Record<string, unknown>) {
    this.server.to(`conversation:${conversationId}`).emit('chat:message:complete', {
      conversationId,
      messageId,
      ...data,
      timestamp: new Date(),
    });
  }

  emitChatError(
    conversationId: string,
    messageId: string,
    error: { code: string; message: string }
  ) {
    this.server.to(`conversation:${conversationId}`).emit('chat:error', {
      conversationId,
      messageId,
      error,
      timestamp: new Date(),
    });
  }

  // Command execution
  emitCommandOutput(executionId: string, stream: 'stdout' | 'stderr', content: string) {
    this.server.to(`execution:${executionId}`).emit(`command:${stream}`, {
      executionId,
      content,
      timestamp: new Date(),
    });
  }

  emitCommandComplete(executionId: string, data: Record<string, unknown>) {
    this.server.to(`execution:${executionId}`).emit('command:complete', {
      executionId,
      ...data,
      timestamp: new Date(),
    });
  }

  // Workflow progress
  emitWorkflowStepUpdate(runId: string, event: string, data: Record<string, unknown>) {
    this.server.to(`workflow:${runId}`).emit(`workflow:${event}`, {
      runId,
      ...data,
      timestamp: new Date(),
    });
  }

  // Approval notifications
  emitApprovalRequest(workspaceId: string, data: Record<string, unknown>) {
    this.server.to(`approvals:${workspaceId}`).emit('approval:new', {
      ...data,
      timestamp: new Date(),
    });
  }

  emitApprovalResolved(workspaceId: string, data: Record<string, unknown>) {
    this.server.to(`approvals:${workspaceId}`).emit('approval:resolved', {
      ...data,
      timestamp: new Date(),
    });
  }

  // Direct user notification
  emitToUser(userId: string, event: string, data: Record<string, unknown>) {
    const userSockets = this.connectedClients.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, {
          ...data,
          timestamp: new Date(),
        });
      });
    }
  }
}
