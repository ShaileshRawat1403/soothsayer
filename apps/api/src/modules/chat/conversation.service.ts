import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private prisma: PrismaService) {}

  async createConversation(
    userId: string,
    workspaceId: string,
    personaId: string,
    options: {
      projectId?: string;
      repoPath?: string;
      title?: string;
      memoryMode?: string;
    } = {}
  ) {
    const resolvedPersonaId = await this.resolvePersonaId({
      userId,
      workspaceId,
      requestedPersonaId: personaId,
    });

    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceId,
        projectId: options.projectId,
        userId,
        personaId: resolvedPersonaId,
        title: options.title || 'New Conversation',
        memoryMode: options.memoryMode || 'session',
        metadata: options.repoPath
          ? {
              targeting: {
                mode: 'explicit_repo_path',
                repoPath: options.repoPath,
              },
            }
          : {},
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
    } = {}
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
      conversations: conversations.map((c: any) => ({
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

  async findConversation(
    id: string,
    userId: string,
    options: { cursor?: string; limit?: number } = {}
  ) {
    const { cursor, limit = 50 } = options;

    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        persona: {
          select: { id: true, name: true, avatarUrl: true, category: true, config: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          skip: cursor ? 1 : 0,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = conversation.messages.reverse();
    const hasMore = conversation.messages.length > limit;
    const nextCursor = hasMore ? messages[messages.length - 1]?.id : undefined;

    return {
      ...conversation,
      messages,
      hasMore,
      nextCursor,
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

  async resolvePersonaId(params: {
    userId: string;
    workspaceId: string;
    requestedPersonaId?: string;
  }): Promise<string> {
    const requested = (params.requestedPersonaId || '').trim();

    const resolveById = async (id: string) =>
      this.prisma.persona.findFirst({
        where: {
          id,
          isActive: true,
          deletedAt: null,
          OR: [{ workspaceId: params.workspaceId }, { isBuiltIn: true }],
        },
        select: { id: true },
      });

    const resolveBySlug = async (slug: string) =>
      this.prisma.persona.findFirst({
        where: {
          slug,
          isActive: true,
          deletedAt: null,
          OR: [{ workspaceId: params.workspaceId }, { isBuiltIn: true }],
        },
        select: { id: true },
      });

    // 1) Explicit persona id or slug from UI.
    if (requested && requested.toLowerCase() !== 'auto') {
      const byId = await resolveById(requested);
      if (byId) return byId.id;

      const bySlug = await resolveBySlug(requested.toLowerCase());
      if (bySlug) return bySlug.id;

      this.logger.warn(
        `Requested persona "${requested}" not found in workspace ${params.workspaceId}; falling back`
      );
    }

    // 2) User default persona for this workspace.
    const preferred = await this.prisma.personaPreference.findFirst({
      where: {
        userId: params.userId,
        workspaceId: params.workspaceId,
        isDefault: true,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        persona: {
          select: { id: true, isActive: true, deletedAt: true },
        },
      },
    });
    if (preferred?.persona?.isActive && !preferred.persona.deletedAt) {
      return preferred.persona.id;
    }

    // 3) Any active custom persona in this workspace.
    const workspacePersona = await this.prisma.persona.findFirst({
      where: {
        workspaceId: params.workspaceId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ totalUsages: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    if (workspacePersona) {
      return workspacePersona.id;
    }

    // 4) Any built-in persona.
    const builtInPersona = await this.prisma.persona.findFirst({
      where: {
        isBuiltIn: true,
        isActive: true,
        deletedAt: null,
      },
      orderBy: [{ totalUsages: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    if (builtInPersona) {
      return builtInPersona.id;
    }

    throw new BadRequestException(
      'No active persona is available. Create a persona in this workspace first.'
    );
  }
}
