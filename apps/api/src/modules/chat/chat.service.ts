import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { PrismaService } from '../../prisma/prisma.service';
import { McpService } from '../mcp/mcp.service';

type ChatCompletionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mcpService: McpService,
  ) {}

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

  async findConversation(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        persona: {
          select: { id: true, name: true, avatarUrl: true, category: true, config: true },
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

    let assistantReply = '';
    let providerUsed = options.provider ?? 'unknown';
    let modelUsed = options.model ?? 'unknown';
    let mcpPreflight: Record<string, unknown> | null = null;
    let mcpToolResult: Record<string, unknown> | null = null;

    if (
      this.configService.get<boolean>('MCP_ENABLED', false) &&
      this.configService.get<boolean>('CHAT_MCP_PREFLIGHT_ENABLED', false)
    ) {
      try {
        const [kernelVersion, selfCheck] = await Promise.all([
          this.mcpService.kernelVersion(),
          this.mcpService.selfCheck(),
        ]);
        mcpPreflight = {
          ok: true,
          kernelVersion: kernelVersion?.data?.kernel_version,
          contractVersion: kernelVersion?.data?.contract_version,
          selfCheckStatus: selfCheck?.data?.status,
        };
      } catch (error) {
        this.logger.warn(`MCP preflight failed, continuing chat without MCP context: ${String(error)}`);
        mcpPreflight = {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    if (
      this.configService.get<boolean>('MCP_ENABLED', false) &&
      this.configService.get<boolean>('CHAT_MCP_TOOL_CALL_ENABLED', false) &&
      options.mcpToolName
    ) {
      try {
        const toolName = options.mcpToolName.trim();
        const result = await this.mcpService.callAllowedTool(toolName, options.mcpToolArgs || {});
        mcpToolResult = {
          ok: true,
          name: toolName,
          result,
        };
      } catch (error) {
        this.logger.warn(`MCP tool call failed, continuing chat without MCP tool result: ${String(error)}`);
        mcpToolResult = {
          ok: false,
          name: options.mcpToolName,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    try {
      const completion = await this.generateAssistantReply(conversation, content, {
        ...options,
        mcpToolResult,
      });
      assistantReply = completion.content;
      providerUsed = completion.provider;
      modelUsed = completion.model;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'unknown provider/inference error';
      this.logger.error(
        `Provider inference failed (${String(options.provider || 'default')}): ${String(error)}`,
      );
      throw new BadGatewayException(
        `Model inference failed. Configure a working provider/model. Root cause: ${errorMessage}`,
      );
    }

    const assistantMetadata: Record<string, unknown> = {
      provider: providerUsed,
      model: modelUsed,
      personaId: conversation.personaId,
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

  private async resolvePersonaId(params: {
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
        `Requested persona "${requested}" not found in workspace ${params.workspaceId}; falling back`,
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
      'No active persona is available. Create a persona in this workspace first.',
    );
  }

  private async generateAssistantReply(
    conversation: {
      persona: { name?: string; config?: unknown } | null;
      messages: Array<{ role: string; content: string }>;
    },
    latestUserInput: string,
    options: {
      provider?: string;
      model?: string;
      systemPrompt?: string;
      fileContext?: string;
      fileName?: string;
      mcpToolResult?: Record<string, unknown> | null;
    },
  ): Promise<{ content: string; provider: string; model: string }> {
    const provider = (options.provider || 'openai').toLowerCase();
    const model = this.normalizeModelId(
      provider,
      options.model || this.getDefaultModel(provider),
    );

    const personaConfig =
      conversation.persona?.config && typeof conversation.persona.config === 'object'
        ? (conversation.persona.config as Record<string, unknown>)
        : null;
    const systemPrompt =
      (options.systemPrompt || '').trim() ||
      this.buildSystemPrompt(conversation.persona?.name || 'Assistant', personaConfig);

    const augmentedInput = this.buildAugmentedUserInput(latestUserInput, options);

    const messages: ChatCompletionMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages
        .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
        .slice(-12)
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      { role: 'user', content: augmentedInput },
    ];

    if (provider === 'ollama') {
      const content = await this.callOllama(model, messages);
      return { content, provider: 'ollama', model };
    }

    if (provider === 'openai') {
      const content = await this.callOpenAiCompatible({
        baseUrl: this.configService.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        apiKey: this.configService.get<string>('OPENAI_API_KEY'),
        model,
        messages,
      });
      return { content, provider: 'openai', model };
    }

    if (provider === 'groq') {
      const content = await this.callOpenAiCompatible({
        baseUrl: this.configService.get<string>('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
        apiKey: this.configService.get<string>('GROQ_API_KEY'),
        model,
        messages,
      });
      return { content, provider: 'groq', model };
    }

    if (provider === 'bedrock') {
      const content = await this.callBedrock({
        modelId: model,
        systemPrompt,
        messages,
      });
      return { content, provider: 'bedrock', model };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  private buildSystemPrompt(
    personaName: string,
    personaConfig: Record<string, unknown> | null,
  ): string {
    const configPrompt =
      typeof personaConfig?.systemPromptTemplate === 'string'
        ? personaConfig.systemPromptTemplate
        : '';

    if (configPrompt.trim()) {
      return configPrompt;
    }

    return `You are ${personaName}. Be practical, concise, and helpful. Prefer actionable responses over generic advice.`;
  }

  private buildAugmentedUserInput(
    latestUserInput: string,
    options: {
      fileContext?: string;
      fileName?: string;
      mcpToolResult?: Record<string, unknown> | null;
    },
  ): string {
    const sections = [latestUserInput];
    const fileContext = (options.fileContext || '').trim();

    if (fileContext) {
      const contextName = (options.fileName || 'attachment').trim();
      const boundedContext = fileContext.slice(0, 12000);
      sections.push(
        `[Attached file context: ${contextName}]`,
        boundedContext,
        '[End of attached file context]',
      );
    }

    if (options.mcpToolResult) {
      const serialized = JSON.stringify(options.mcpToolResult, null, 2).slice(0, 6000);
      sections.push('[MCP tool context]', serialized, '[End of MCP tool context]');
    }

    return sections.join('\n\n');
  }

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case 'groq':
        return 'llama3-70b-8192';
      case 'ollama':
        return 'llama3.2:1b';
      case 'bedrock':
        return this.configService.get<string>('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20240620-v1:0');
      case 'openai':
      default:
        return 'gpt-4o-mini';
    }
  }

  private normalizeModelId(provider: string, model: string): string {
    if (provider !== 'ollama') {
      return model;
    }

    const normalized = model.trim().toLowerCase();
    const aliases: Record<string, string> = {
      'lama3.2:1b': 'llama3.2:1b',
      'llama3.2:latest': 'llama3.2:1b',
      'phi3:latest': 'phi3:mini',
      'ministral:3b': 'ministral-3:3b',
      'ministral:latest': 'ministral-3:3b',
    };

    return aliases[normalized] ?? model;
  }

  private async callBedrock(params: {
    modelId: string;
    systemPrompt: string;
    messages: ChatCompletionMessage[];
  }): Promise<string> {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    const client = new BedrockRuntimeClient({ region });
    const maxRetries = this.configService.get<number>('BEDROCK_MAX_RETRIES', 4);
    const baseBackoffMs = this.configService.get<number>('BEDROCK_BASE_BACKOFF_MS', 500);
    const maxTokens = this.configService.get<number>('BEDROCK_MAX_TOKENS', 512);

    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const result = await client.send(
          new ConverseCommand({
            modelId: params.modelId,
            system: [{ text: params.systemPrompt }],
            messages: params.messages
              .filter((m) => m.role !== 'system')
              .map((message) => ({
                role: message.role === 'assistant' ? 'assistant' : 'user',
                content: [{ text: message.content }],
              })),
            inferenceConfig: {
              maxTokens,
              temperature: 0.7,
              topP: 0.9,
            },
          }),
        );

        const content = result.output?.message?.content?.[0];
        if (!content || !('text' in content) || !content.text?.trim()) {
          throw new Error('Empty Bedrock completion');
        }

        return content.text.trim();
      } catch (error) {
        lastError = error;
        const shouldRetry = attempt < maxRetries && this.isBedrockThrottleError(error);
        if (!shouldRetry) {
          throw error;
        }

        const jitter = Math.floor(Math.random() * 250);
        const delayMs = baseBackoffMs * 2 ** attempt + jitter;
        this.logger.warn(
          `Bedrock throttled (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delayMs}ms`,
        );
        await this.sleep(delayMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Bedrock request failed');
  }

  private async callOpenAiCompatible(params: {
    baseUrl: string;
    apiKey?: string;
    model: string;
    messages: ChatCompletionMessage[];
  }): Promise<string> {
    if (!params.apiKey) {
      throw new Error('Missing API key');
    }

    const isAzureEndpoint =
      params.baseUrl.includes('azure.com') || params.baseUrl.includes('services.ai.azure.com');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    };
    if (isAzureEndpoint) {
      headers['api-key'] = params.apiKey;
    }

    const response = await this.fetchWithTimeout(`${params.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Provider error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
      }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty completion');
    }

    return content;
  }

  private async callOllama(
    model: string,
    messages: ChatCompletionMessage[],
  ): Promise<string> {
    const baseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://127.0.0.1:11434');
    const keepAlive = this.configService.get<string>('OLLAMA_KEEP_ALIVE', '30m');
    const numPredict = this.configService.get<number>('OLLAMA_NUM_PREDICT', 192);
    const numCtx = this.configService.get<number>('OLLAMA_NUM_CTX', 1024);
    const response = await this.fetchWithTimeout(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        keep_alive: keepAlive,
        options: {
          num_predict: numPredict,
          num_ctx: numCtx,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      message?: {
        content?: string;
      };
    };

    const content = data.message?.content?.trim();
    if (!content) {
      throw new Error('Empty completion');
    }

    return content;
  }

  private async fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit,
    timeoutMs = this.configService.get<number>('AI_REQUEST_TIMEOUT_MS', 600000),
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private isBedrockThrottleError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message.toLowerCase();
    const name = (error as { name?: string }).name?.toLowerCase() || '';
    return (
      name.includes('throttling') ||
      name.includes('toomanyrequests') ||
      message.includes('throttl') ||
      message.includes('too many request') ||
      message.includes('rate exceeded') ||
      message.includes('429')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
