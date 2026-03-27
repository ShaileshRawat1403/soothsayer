import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { McpService } from '../mcp/mcp.service';
import { ChatHandoffService } from './chat-handoff.service';
import { AIProviderService } from './ai-provider.service';
import { ConversationService } from './conversation.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private mcpService: McpService,
    private handoffService: ChatHandoffService,
    private aiProvider: AIProviderService,
    private conversationService: ConversationService,
  ) {}

  async createConversation(
    userId: string,
    workspaceId: string,
    personaId: string,
    options: any = {},
  ) {
    return this.conversationService.createConversation(userId, workspaceId, personaId, options);
  }

  async findConversations(userId: string, workspaceId: string, options: any = {}) {
    return this.conversationService.findConversations(userId, workspaceId, options);
  }

  async findConversation(id: string, userId: string) {
    return this.conversationService.findConversation(id, userId);
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
    options: {
      parentMessageId?: string;
      attachments?: unknown[];
      provider?: string;
      model?: string;
      systemPrompt?: string;
      fileContext?: string;
      fileName?: string;
      mcpToolName?: string;
      mcpToolArgs?: Record<string, unknown>;
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

    const handoffDecision = await this.handoffService.evaluateHandoff(
      conversation.workspaceId,
      content,
    );

    const runHandoff = handoffDecision.shouldHandoff
      ? await this.handoffService.createDaxRunHandoff(
          conversation as any,
          content,
          handoffDecision,
          {
            userId,
            provider: options.provider,
            model: options.model,
          },
        )
      : null;

    let mcpPreflight = null;
    let mcpToolResult = null;

    if (!runHandoff) {
      mcpPreflight = await this.mcpService.preflight(content, {
        conversationId,
        explicitTool: options.mcpToolName,
        explicitArgs: options.mcpToolArgs,
      });

      if (mcpPreflight?.selectedTool) {
        mcpToolResult = await this.mcpService.executeTool(
          mcpPreflight.selectedTool,
          mcpPreflight.suggestedArgs || {},
        );
      }
    }

    const {
      content: assistantReply,
      provider: providerUsed,
      model: modelUsed,
    } = await this.aiProvider.generateAssistantReply(conversation as any, content, {
      ...options,
      mcpToolResult,
    });

    const handoffTargetPath = runHandoff?.targeting?.repoPath;
    const assistantMetadata: Record<string, unknown> = {
      provider: providerUsed,
      model: modelUsed,
      personaId: conversation.personaId,
      ...(runHandoff
        ? {
            handoff: {
              type: 'dax_run',
              runId: runHandoff.runId,
              status: runHandoff.status,
              targetPath: handoffTargetPath,
              targeting: runHandoff.targeting,
              policyDecision: handoffDecision,
            },
          }
        : {}),
      ...(mcpPreflight ? { mcp: mcpPreflight } : {}),
      ...(mcpToolResult ? { mcpTool: mcpToolResult } : {}),
    };

    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        personaId: conversation.personaId,
        role: 'assistant',
        content: assistantReply,
        contentType: 'markdown',
        metadata: assistantMetadata as any,
      },
    });

    return {
      userMessage,
      assistantMessage,
      jobId: `job_${Date.now()}`,
    };
  }

  async deleteConversation(id: string, userId: string) {
    return this.conversationService.deleteConversation(id, userId);
  }

  async archiveConversation(id: string, userId: string) {
    return this.conversationService.archiveConversation(id, userId);
  }
}
