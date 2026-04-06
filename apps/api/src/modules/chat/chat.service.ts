import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
    private conversationService: ConversationService
  ) {}

  async createConversation(
    userId: string,
    workspaceId: string,
    personaId: string,
    options: any = {}
  ) {
    return this.conversationService.createConversation(userId, workspaceId, personaId, options);
  }

  async findConversations(userId: string, workspaceId: string, options: any = {}) {
    return this.conversationService.findConversations(userId, workspaceId, options);
  }

  async findConversation(
    id: string,
    userId: string,
    options?: { cursor?: string; limit?: number }
  ) {
    return this.conversationService.findConversation(id, userId, options);
  }

  async evaluateHandoff(conversationId: string, userId: string, content: string) {
    const conversation = await this.findConversation(conversationId, userId);
    return this.handoffService.evaluateHandoff(conversation.workspaceId, content);
  }

  async *streamMessage(
    conversationId: string,
    userId: string,
    content: string,
    options: {
      parentMessageId?: string;
      provider?: string;
      model?: string;
      systemPrompt?: string;
      fileContext?: string;
      fileName?: string;
      mcpToolName?: string;
      mcpToolArgs?: Record<string, unknown>;
    } = {}
  ) {
    const conversation = await this.findConversation(conversationId, userId);
    const requestedProvider = (options.provider || '').trim().toLowerCase() || 'ollama';

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

    let mcpPreflight = null;
    let mcpToolResult = null;

    if (this.mcpService.isEnabled()) {
      mcpPreflight = await this.mcpService.preflight(content, {
        conversationId,
        explicitTool: options.mcpToolName,
        explicitArgs: options.mcpToolArgs,
      });

      if (mcpPreflight?.selectedTool) {
        mcpToolResult = await this.mcpService.executeTool(
          mcpPreflight.selectedTool,
          mcpPreflight.suggestedArgs || {}
        );
      }
    }

    const stream = this.aiProvider.streamGenerateReply(conversation as any, content, {
      ...options,
      userId,
      provider: requestedProvider,
      mcpToolResult,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      fullContent += chunk;
      yield chunk;
    }

    await this.prisma.message.create({
      data: {
        conversationId,
        personaId: conversation.personaId,
        role: 'assistant',
        content: fullContent,
        contentType: 'markdown',
        metadata: {
          provider: requestedProvider,
          model: options.model || this.aiProvider.getDefaultModel(requestedProvider),
          personaId: conversation.personaId,
        } as any,
      },
    });
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
    } = {}
  ) {
    const conversation = await this.findConversation(conversationId, userId);
    const requestedProvider = (options.provider || '').trim().toLowerCase() || 'dax';

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

    if (this.isLightweightGreeting(content)) {
      const assistantMessage = await this.prisma.message.create({
        data: {
          conversationId,
          personaId: conversation.personaId,
          role: 'assistant',
          content:
            'Hey! I’m here. Ask me anything, and I’ll stay inline for lightweight chat or open a governed DAX run only when execution is actually needed.',
          contentType: 'markdown',
          metadata: {
            provider: 'dax',
            model: 'inline-greeting',
            personaId: conversation.personaId,
            inlineConversation: true,
          } as any,
        },
      });

      return {
        userMessage,
        assistantMessage,
        jobId: `job_${Date.now()}`,
      };
    }

    const handoffDecision = await this.handoffService.evaluateHandoff(
      conversation.workspaceId,
      content
    );

    const runHandoff = handoffDecision.shouldHandoff
      ? await this.handoffService.createDaxRunHandoff(
          conversation as any,
          content,
          handoffDecision,
          {
            userId,
            provider: requestedProvider,
            model: options.model,
          }
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
          mcpPreflight.suggestedArgs || {}
        );
      }
    }

    const providerResult = runHandoff
      ? {
          content: this.buildRunHandoffMessage(runHandoff.runId, handoffDecision.reason),
          provider: 'dax',
          model: options.model || 'governed-run',
          metadata: {
            handoff: {
              type: 'dax_run',
              runId: runHandoff.runId,
              status: runHandoff.status,
              targetPath: runHandoff.targetPath,
              targeting: runHandoff.targeting,
              policyDecision: handoffDecision,
            },
          },
        }
      : await this.aiProvider.generateAssistantReply(conversation as any, content, {
          ...options,
          userId,
          provider: requestedProvider,
          mcpToolResult,
        });

    const {
      content: assistantReply,
      provider: providerUsed,
      model: modelUsed,
      metadata: providerMetadata,
    } = providerResult;

    const assistantMetadata: Record<string, unknown> = {
      provider: providerUsed,
      model: modelUsed,
      personaId: conversation.personaId,
      ...(providerMetadata || {}),
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

  async regenerateMessage(
    conversationId: string,
    messageId: string,
    userId: string,
    options: { provider?: string; model?: string } = {}
  ) {
    const conversation = await this.findConversation(conversationId, userId);

    const targetMessage = conversation.messages.find((m: any) => m.id === messageId);
    if (!targetMessage || targetMessage.role !== 'assistant') {
      throw new BadRequestException(
        'Cannot regenerate: message not found or not an assistant message'
      );
    }

    const userMessage = conversation.messages.find(
      (m: any) => m.role === 'user' && m.createdAt < targetMessage.createdAt
    );
    if (!userMessage) {
      throw new BadRequestException('Cannot regenerate: no preceding user message found');
    }

    const provider = (options.provider || 'dax').toLowerCase();

    const providerResult = await this.aiProvider.generateAssistantReply(
      conversation as any,
      userMessage.content,
      {
        userId,
        provider,
        model: options.model,
      }
    );

    await this.prisma.message.delete({ where: { id: messageId } });

    const newAssistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        personaId: conversation.personaId,
        role: 'assistant',
        content: providerResult.content,
        contentType: 'markdown',
        metadata: {
          provider: providerResult.provider,
          model: providerResult.model,
          personaId: conversation.personaId,
          regeneratedFrom: messageId,
          ...(providerResult.metadata || {}),
        } as any,
      },
    });

    return newAssistantMessage;
  }

  async archiveConversation(id: string, userId: string) {
    return this.conversationService.archiveConversation(id, userId);
  }

  private buildRunHandoffMessage(runId: string, reason?: string): string {
    const summary = reason?.trim()
      ? `I moved this into a governed DAX run because ${reason.trim().replace(/\.$/, '')}.`
      : 'I moved this into a governed DAX run because the request needs live execution.';

    return `${summary}\n\nRun ID: \`${runId}\`\n\nOpen the live run to continue with approvals, execution, and replay.`;
  }

  private isLightweightGreeting(input: string): boolean {
    const normalized = input.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.length > 80) return false;

    const greetingPattern =
      /^(hi|hello|hey|yo|hola|sup|good\s*(morning|afternoon|evening)|thanks|thank you|ok|okay|cool|nice|bye|goodbye|gn|good night)[!.? ]*$/;

    return greetingPattern.test(normalized);
  }
}
