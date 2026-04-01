import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { DaxCreateRunRequest, DaxRunStatus, DaxRunSummary } from '@soothsayer/types';
import { DaxService } from '../dax/dax.service';
import { PersonaMapperService } from './persona-mapper.service';
import { ChatHandoffService } from './chat-handoff.service';

export type ChatCompletionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

@Injectable()
export class AIProviderService {
  private readonly logger = new Logger(AIProviderService.name);

  constructor(
    private configService: ConfigService,
    private readonly daxService: DaxService,
    private readonly personaMapper: PersonaMapperService,
    private readonly handoffService: ChatHandoffService,
  ) {}

  async generateAssistantReply(
    conversation: {
      id: string;
      workspaceId: string;
      projectId?: string | null;
      personaId?: string;
      metadata?: unknown;
      persona: { name?: string; config?: unknown } | null;
      messages: Array<{ role: string; content: string }>;
    },
    latestUserInput: string,
    options: {
      userId?: string;
      provider?: string;
      model?: string;
      systemPrompt?: string;
      fileContext?: string;
      fileName?: string;
      mcpToolResult?: Record<string, unknown> | null;
    },
  ): Promise<{
    content: string;
    provider: string;
    model: string;
    metadata?: Record<string, unknown>;
  }> {
    const provider = (options.provider || 'dax').toLowerCase();
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

    if (provider === 'dax') {
      return this.callDaxAssistant({
        conversation,
        userId: options.userId,
        model,
        systemPrompt,
        latestUserInput: augmentedInput,
      });
    }

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
      case 'dax':
        return this.configService.get<string>('DAX_DEFAULT_MODEL', 'gemini-2.5-pro');
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

  private async callDaxAssistant(params: {
    conversation: {
      id: string;
      workspaceId: string;
      projectId?: string | null;
      personaId?: string;
      metadata?: unknown;
      persona: { name?: string; config?: unknown } | null;
      messages: Array<{ role: string; content: string }>;
    };
    userId?: string;
    model: string;
    systemPrompt: string;
    latestUserInput: string;
  }): Promise<{
    content: string;
    provider: string;
    model: string;
    metadata?: Record<string, unknown>;
  }> {
    const targeting = await this.handoffService.resolveConversationTargeting(params.conversation);
    const repoPath = targeting.repoPath;
    const personaId = params.conversation.personaId || 'standard';
    const personaPreset = this.personaMapper.buildDaxPersonaPreset(
      {
        id: personaId,
        name: params.conversation.persona?.name,
        config: params.conversation.persona?.config,
      },
      {
        provider: 'dax',
        model: params.model,
      },
    );

    const request: DaxCreateRunRequest = {
      intent: {
        input: this.buildDaxIntentInput({
          systemPrompt: params.systemPrompt,
          history: params.conversation.messages,
          latestUserInput: params.latestUserInput,
        }),
        kind: 'general',
        ...(repoPath ? { repoPath } : {}),
      },
      personaPreset,
      metadata: {
        source: 'soothsayer',
        initiatedBy: params.userId,
        workspaceId: params.conversation.workspaceId,
        projectId: params.conversation.projectId || undefined,
        chatId: params.conversation.id,
        targeting,
      },
    };

    const createdRun = await this.daxService.createRun(
      { id: params.userId || 'system' } as any,
      request,
    );
    const terminal = await this.waitForDaxTerminal(createdRun.runId, repoPath);
    const executionProfile = terminal.snapshot.executionProfile;
    const resolvedModel = executionProfile?.model || params.model;

    if (terminal.snapshot.status === 'waiting_approval') {
      return {
        content:
          'This request is paused in DAX because it needs approval before the assistant can continue.',
        provider: 'dax',
        model: resolvedModel,
        metadata: {
          daxRun: {
            runId: createdRun.runId,
            status: terminal.snapshot.status,
            targeting,
            executionProfile,
          },
          handoff: {
            type: 'dax_run',
            runId: createdRun.runId,
            status: terminal.snapshot.status,
            targetPath: this.handoffService.buildRunTargetPath(createdRun.runId, targeting),
            targeting,
          },
        },
      };
    }

    if (terminal.snapshot.status === 'failed' || terminal.snapshot.status === 'cancelled') {
      throw new Error(
        terminal.summary?.outcome?.summaryText ||
          terminal.summary?.terminalReason ||
          terminal.snapshot.failureDescription ||
          `DAX run ${createdRun.runId} ended with status ${terminal.snapshot.status}`,
      );
    }

    return {
      content:
        terminal.summary?.outcome?.summaryText ||
        'DAX completed the run but did not return summary text.',
      provider: 'dax',
      model: resolvedModel,
      metadata: {
        daxRun: {
          runId: createdRun.runId,
          status: terminal.snapshot.status,
          targeting,
          executionProfile,
        },
      },
    };
  }

  private buildDaxIntentInput(params: {
    systemPrompt: string;
    history: Array<{ role: string; content: string }>;
    latestUserInput: string;
  }): string {
    const history = params.history
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-12)
      .map((message) => {
        const speaker = message.role === 'assistant' ? 'Assistant' : 'User';
        return `${speaker}:\n${message.content.trim()}`;
      })
      .join('\n\n');

    const sections = [
      'Respond as the primary Soothsayer assistant running through DAX.',
      'Stay in conversational assistant mode by default. Only move into approval-gated or execution-heavy behavior when the task clearly requires it.',
      '[System Prompt]',
      params.systemPrompt,
    ];

    if (history) {
      sections.push('[Recent Conversation]', history);
    }

    sections.push('[Latest User Message]', params.latestUserInput);
    return sections.join('\n\n');
  }

  private async waitForDaxTerminal(
    runId: string,
    repoPath?: string,
  ): Promise<{
    snapshot: Awaited<ReturnType<DaxService['getRunSnapshot']>>;
    summary?: DaxRunSummary;
  }> {
    const timeoutMs = this.configService.get<number>('AI_REQUEST_TIMEOUT_MS', 600000);
    const pollIntervalMs = this.configService.get<number>('DAX_CHAT_POLL_INTERVAL_MS', 1500);
    const startedAt = Date.now();
    let lastStatus: DaxRunStatus | null = null;

    while (Date.now() - startedAt < timeoutMs) {
      const snapshot = await this.daxService.getRunSnapshot(runId, repoPath);

      if (snapshot.status !== lastStatus) {
        lastStatus = snapshot.status;
        this.logger.log(`DAX chat run ${runId} status: ${snapshot.status}`);
      }

      if (
        snapshot.status === 'completed' ||
        snapshot.status === 'failed' ||
        snapshot.status === 'cancelled'
      ) {
        return {
          snapshot,
          summary: await this.daxService.getSummary(runId, repoPath),
        };
      }

      if (snapshot.status === 'waiting_approval') {
        return { snapshot };
      }

      await this.sleep(pollIntervalMs);
    }

    throw new Error(`Timed out waiting for DAX run ${runId} to finish`);
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
}
