import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

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

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // TODO: Validate JWT from handshake auth and set userId
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization;
    
    if (!token) {
      this.logger.warn(`Client ${client.id} connected without authentication`);
      // Allow connection for now, but mark as unauthenticated
      client.userId = undefined;
    }
    
    // Track connection
    if (client.userId) {
      if (!this.connectedClients.has(client.userId)) {
        this.connectedClients.set(client.userId, new Set());
      }
      this.connectedClients.get(client.userId)!.add(client.id);
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
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);
    this.logger.debug(`Client ${client.id} joined conversation ${data.conversationId}`);
    return { event: 'chat:joined', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('chat:leave')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    this.logger.debug(`Client ${client.id} left conversation ${data.conversationId}`);
    return { event: 'chat:left', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('chat:stop')
  handleStopGeneration(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
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
    @MessageBody() data: { executionId: string },
  ) {
    client.join(`execution:${data.executionId}`);
    return { event: 'command:subscribed', data };
  }

  @SubscribeMessage('command:unsubscribe')
  handleUnsubscribeCommand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { executionId: string },
  ) {
    client.leave(`execution:${data.executionId}`);
    return { event: 'command:unsubscribed', data };
  }

  @SubscribeMessage('command:cancel')
  handleCancelCommand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { executionId: string; reason?: string },
  ) {
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
    @MessageBody() data: { runId: string },
  ) {
    client.join(`workflow:${data.runId}`);
    return { event: 'workflow:subscribed', data };
  }

  @SubscribeMessage('workflow:unsubscribe')
  handleUnsubscribeWorkflow(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { runId: string },
  ) {
    client.leave(`workflow:${data.runId}`);
    return { event: 'workflow:unsubscribed', data };
  }

  // ============================================
  // APPROVAL EVENTS
  // ============================================

  @SubscribeMessage('approval:subscribe')
  handleSubscribeApprovals(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { workspaceId: string },
  ) {
    client.join(`approvals:${data.workspaceId}`);
    return { event: 'approval:subscribed', data };
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

  emitChatError(conversationId: string, messageId: string, error: { code: string; message: string }) {
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
