import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createConversation(
    userId: string,
    workspaceId: string,
    personaId: string,
    options: {
      projectId?: string;
      title?: string;
      memoryMode?: string;
    } = {},
  ) {
    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceId,
        projectId: options.projectId,
        userId,
        personaId,
        title: options.title || 'New Conversation',
        memoryMode: options.memoryMode || 'session',
        metadata: {},
      },
    });

    return conversation;
  }

  async findConversations(
    userId: string,
    workspaceId: string,
    options: {
      projectId?: string;
      personaId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { projectId, personaId, status, search, page = 1, limit = 20 } = options;

    const where: Record<string, unknown> = {
      workspaceId,
      userId,
      deletedAt: null,
    };

    if (projectId) where.projectId = projectId;
    if (personaId) where.personaId = personaId;
    if (status) where.status = status;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          persona: {
            select: { id: true, name: true, avatarUrl: true },
          },
          _count: { select: { messages: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        personaId: c.personaId,
        personaName: c.persona.name,
        status: c.status,
        messageCount: c._count.messages,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  async findConversation(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        persona: {
          select: { id: true, name: true, avatarUrl: true, category: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
    options: {
      parentMessageId?: string;
      attachments?: unknown[];
    } = {},
  ) {
    const conversation = await this.findConversation(conversationId, userId);

    // Create user message
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId,
        userId,
        role: 'user',
        content,
        contentType: 'text',
        parentMessageId: options.parentMessageId,
        metadata: {},
      },
    });

    // Update conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        metadata: {
          ...(conversation.metadata as Record<string, unknown>),
          lastMessageAt: new Date(),
        },
      },
    });

    // TODO: Queue AI response job
    // For now, create a placeholder response
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        personaId: conversation.personaId,
        role: 'assistant',
        content: `[AI Response placeholder - Would process: "${content.substring(0, 50)}..."]`,
        contentType: 'markdown',
        metadata: {
          model: 'placeholder',
          personaId: conversation.personaId,
        },
      },
    });

    return {
      userMessage,
      assistantMessage,
      jobId: `job_${Date.now()}`,
    };
  }

  async deleteConversation(id: string, userId: string) {
    await this.findConversation(id, userId);

    await this.prisma.conversation.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'deleted' },
    });
  }

  async archiveConversation(id: string, userId: string) {
    await this.findConversation(id, userId);

    await this.prisma.conversation.update({
      where: { id },
      data: { status: 'archived' },
    });
  }
}
