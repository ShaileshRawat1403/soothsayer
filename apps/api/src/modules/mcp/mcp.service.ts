import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private readonly defaultAllowedTools = new Set([
    'kernel_version',
    'self_check',
    'workspace_info',
    'repo_search',
    'read_file',
  ]);
  private inflightCalls = 0;
  private readonly queuedCalls: Array<{
    id: number;
    run: () => void;
    timer?: NodeJS.Timeout;
  }> = [];
  private queueCounter = 0;
  private asyncQueue: Queue | null = null;
  private asyncQueueConnection: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return this.configService.get<boolean>('MCP_ENABLED', false);
  }

  async kernelVersion(): Promise<any> {
    return this.callTool('kernel_version', {});
  }

  async selfCheck(): Promise<any> {
    return this.callTool('self_check', {});
  }

  async getHealth(): Promise<{
    enabled: boolean;
    connected: boolean;
    kernelVersion?: any;
    selfCheck?: any;
    error?: string;
  }> {
    if (!this.isEnabled()) {
      return {
        enabled: false,
        connected: false,
      };
    }

    try {
      const [kernelVersion, selfCheck] = await Promise.all([
        this.kernelVersion(),
        this.selfCheck(),
      ]);

      return {
        enabled: true,
        connected: true,
        kernelVersion,
        selfCheck,
      };
    } catch (error) {
      return {
        enabled: true,
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    if (!this.isEnabled()) {
      throw new Error('MCP integration is disabled. Set MCP_ENABLED=true');
    }

    const startedAt = Date.now();
    try {
      const result = await this.callWithConcurrencyLimit(name, () =>
        this.callToolProcess(name, args)
      );
      this.logger.log(
        `MCP tool "${name}" succeeded in ${Date.now() - startedAt}ms (inflight=${this.inflightCalls}, queued=${this.queuedCalls.length})`
      );
      return result;
    } catch (error) {
      this.logger.warn(
        `MCP tool "${name}" failed in ${Date.now() - startedAt}ms: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private async callToolProcess(name: string, args: Record<string, unknown>): Promise<any> {
    const bin = this.configService.get<string>('MCP_SERVER_BIN', 'workspace-mcp');
    const workspaceRoot = this.configService.get<string>('MCP_WORKSPACE_ROOT', process.cwd());
    const profile = this.configService.get<string>('MCP_PROFILE', 'dev');
    const policyPath = this.configService.get<string>('MCP_POLICY_PATH');
    const cwd = this.configService.get<string>('MCP_WORKDIR', process.cwd());
    const timeoutMs = this.configService.get<number>('MCP_TIMEOUT_MS', 15000);

    const argsFromEnv = this.parseArgs(this.configService.get<string>('MCP_SERVER_ARGS', ''));
    const fullArgs = [...argsFromEnv];

    if (!argsFromEnv.includes('--workspace-root')) {
      fullArgs.push('--workspace-root', workspaceRoot);
    }
    if (!argsFromEnv.includes('--profile')) {
      fullArgs.push('--profile', profile);
    }
    if (policyPath && !argsFromEnv.includes('--policy-path')) {
      fullArgs.push('--policy-path', policyPath);
    }

    const initRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'soothsayer-api', version: '1.0.0' },
      },
    };

    const initNotification: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    };

    const toolCallRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };

    return new Promise((resolve, reject) => {
      const child = spawn(bin, fullArgs, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
      });

      let buffer = '';
      let stderr = '';
      let settled = false;
      let initialized = false;

      const finishError = (error: string) => {
        if (settled) return;
        settled = true;
        child.kill('SIGTERM');
        reject(new Error(error));
      };

      const finishOk = (value: any) => {
        if (settled) return;
        settled = true;
        child.kill('SIGTERM');
        resolve(value);
      };

      const timer = setTimeout(() => {
        finishError(`MCP call timed out after ${timeoutMs}ms`);
      }, timeoutMs);

      child.on('error', (error) => {
        clearTimeout(timer);
        finishError(`Failed to start MCP process: ${error.message}`);
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      child.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        let newlineIndex = buffer.indexOf('\n');

        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line) {
            this.handleLine({
              line,
              initialized,
              onInitialized: () => {
                initialized = true;
                this.writeJson(child, initNotification);
                this.writeJson(child, toolCallRequest);
              },
              onResult: (result) => {
                clearTimeout(timer);
                finishOk(result);
              },
              onError: (message) => {
                clearTimeout(timer);
                finishError(message);
              },
            });
          }

          newlineIndex = buffer.indexOf('\n');
        }
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (!settled && code !== 0) {
          finishError(
            `MCP process exited with code ${code}. stderr: ${stderr.trim() || '<empty>'}`
          );
        }
      });

      this.writeJson(child, initRequest);
    });
  }

  private async callWithConcurrencyLimit<T>(
    toolName: string,
    invoke: () => Promise<T>
  ): Promise<T> {
    const maxConcurrent = this.configService.get<number>('MCP_MAX_CONCURRENT_CALLS', 2);
    const maxQueue = this.configService.get<number>('MCP_MAX_QUEUE_SIZE', 25);
    const maxQueueWaitMs = this.configService.get<number>('MCP_MAX_QUEUE_WAIT_MS', 5000);

    if (this.inflightCalls < maxConcurrent) {
      return this.startCall(invoke);
    }

    if (this.queuedCalls.length >= maxQueue) {
      throw new Error(
        `MCP queue is full (${this.queuedCalls.length}/${maxQueue}) while calling "${toolName}"`
      );
    }

    return new Promise<T>((resolve, reject) => {
      const id = ++this.queueCounter;
      const run = () => {
        this.startCall(invoke).then(resolve).catch(reject);
      };

      const queued = {
        id,
        run,
        timer: undefined as NodeJS.Timeout | undefined,
      };

      queued.timer = setTimeout(() => {
        const index = this.queuedCalls.findIndex((item) => item.id === id);
        if (index >= 0) {
          this.queuedCalls.splice(index, 1);
        }
        reject(
          new Error(`MCP queue wait exceeded ${maxQueueWaitMs}ms while calling "${toolName}"`)
        );
      }, maxQueueWaitMs);

      this.queuedCalls.push(queued);
      this.logger.warn(
        `MCP call queued for "${toolName}" (inflight=${this.inflightCalls}, queued=${this.queuedCalls.length})`
      );
    });
  }

  private async startCall<T>(invoke: () => Promise<T>): Promise<T> {
    this.inflightCalls += 1;
    try {
      return await invoke();
    } finally {
      this.inflightCalls = Math.max(0, this.inflightCalls - 1);
      this.drainQueue();
    }
  }

  private drainQueue(): void {
    const maxConcurrent = this.configService.get<number>('MCP_MAX_CONCURRENT_CALLS', 2);

    while (this.inflightCalls < maxConcurrent && this.queuedCalls.length > 0) {
      const next = this.queuedCalls.shift();
      if (!next) {
        return;
      }

      if (next.timer) {
        clearTimeout(next.timer);
      }

      next.run();
    }
  }

  async callAllowedTool(name: string, args: Record<string, unknown>): Promise<any> {
    const allowed = this.getAllowedTools();
    if (!allowed.has(name)) {
      throw new ForbiddenException(
        `Tool "${name}" is not allowlisted. Allowed tools: ${Array.from(allowed).join(', ')}`
      );
    }
    return this.callTool(name, args);
  }

  async preflight(
    content: string,
    options: { conversationId: string; explicitTool?: string; explicitArgs?: any }
  ) {
    if (options.explicitTool) {
      return {
        selectedTool: options.explicitTool,
        suggestedArgs: options.explicitArgs || {},
        reason: 'Explicit tool requested',
      };
    }

    const autoTriggerEnabled = this.configService.get<boolean>('MCP_AUTO_TRIGGER_ENABLED', false);
    if (autoTriggerEnabled) {
      try {
        const classification = await this.classifyToolIntent(content);
        if (classification?.tool) {
          return {
            selectedTool: classification.tool,
            suggestedArgs: classification.args || {},
            reason: 'AI-classified tool recommendation',
          };
        }
      } catch (error) {
        this.logger.warn(`MCP auto-trigger classification failed: ${error}`);
      }
    }

    return null;
  }

  private async classifyToolIntent(
    content: string
  ): Promise<{ tool: string; args: Record<string, unknown> } | null> {
    const configuredModel = this.configService.get<string>('DAX_DEFAULT_MODEL', 'gemini-2.5-pro');
    const ollamaModels = [
      'llama3.2:1b',
      'llama3.2',
      'llama3:8b',
      'llama3:70b',
      'phi3:mini',
      'mistral',
      'mixtral',
      'ministral',
    ];
    const isOllamaModel = ollamaModels.some((m) =>
      configuredModel.toLowerCase().includes(m.toLowerCase())
    );
    const model = isOllamaModel ? configuredModel : 'llama3.2:1b';
    const baseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://127.0.0.1:11434');
    const allowedTools = Array.from(this.getAllowedTools());

    const classificationPrompt = `Available MCP tools: ${allowedTools.join(', ')}

Analyze this user message and determine if any tool should be called.

User message: "${content.replace(/"/g, '\\"')}"

Respond with ONLY valid JSON (no markdown, no explanation):
{"tool": "tool_name" or null, "args": {"param": "value"} or {}}

Example responses:
- For "list files in the repo": {"tool": "repo_search", "args": {"query": "list all files"}}
- For "read the config file": {"tool": "read_file", "args": {"path": "config"}}
- For general chat: {"tool": null, "args": {}}`;

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: classificationPrompt }],
          stream: false,
          options: { temperature: 0.1 },
        }),
      });

      if (!response.ok) {
        throw new Error(`Classification failed: ${response.status}`);
      }

      const data = (await response.json()) as { message?: { content?: string } };
      const responseText = data.message?.content?.trim() || '';

      let parsed: { tool: string | null; args: Record<string, unknown> };
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          this.logger.warn(`Could not parse tool classification response: ${responseText}`);
          return null;
        }
      }

      if (parsed.tool && allowedTools.includes(parsed.tool)) {
        this.logger.log(`MCP auto-trigger: ${parsed.tool} for input: ${content.slice(0, 50)}...`);
        return { tool: parsed.tool, args: parsed.args || {} };
      }

      return null;
    } catch (error) {
      throw new Error(`MCP tool classification error: ${error}`);
    }
  }

  async executeTool(name: string, args: Record<string, unknown>) {
    return this.callAllowedTool(name, args);
  }

  async callAllowedToolSmart(
    name: string,
    args: Record<string, unknown>,
    options?: {
      preferAsync?: boolean;
      asyncTimeoutMs?: number;
      asyncPollIntervalMs?: number;
    }
  ): Promise<any> {
    const preferAsync = options?.preferAsync ?? false;
    if (!preferAsync) {
      return this.callAllowedTool(name, args);
    }

    const queued = await this.callAllowedToolAsync(name, args);
    const timeoutMs =
      options?.asyncTimeoutMs ?? this.configService.get<number>('MCP_ASYNC_POLL_TIMEOUT_MS', 30000);
    const pollIntervalMs =
      options?.asyncPollIntervalMs ??
      this.configService.get<number>('MCP_ASYNC_POLL_INTERVAL_MS', 500);

    return this.waitForToolJobResult(queued.jobId, {
      timeoutMs,
      pollIntervalMs,
    });
  }

  async callAllowedToolAsync(
    name: string,
    args: Record<string, unknown>
  ): Promise<{
    mode: 'worker-queue';
    queue: string;
    jobId: string;
    status: string;
  }> {
    const allowed = this.getAllowedTools();
    if (!allowed.has(name)) {
      throw new ForbiddenException(
        `Tool "${name}" is not allowlisted. Allowed tools: ${Array.from(allowed).join(', ')}`
      );
    }

    const queue = this.ensureAsyncQueue();
    if (!queue) {
      throw new Error('MCP async queue is disabled. Set DEV_DISABLE_QUEUES=false to enable.');
    }
    const timeoutMs = this.configService.get<number>('MCP_WORKER_JOB_TIMEOUT_MS', 30000);
    const job = await queue.add(
      'mcp-tool-call',
      {
        name,
        args,
        timeoutMs,
      },
      {}
    );

    return {
      mode: 'worker-queue',
      queue: queue.name,
      jobId: String(job.id),
      status: 'queued',
    };
  }

  async getToolJobStatus(jobId: string): Promise<{
    mode: 'worker-queue';
    queue: string;
    jobId: string;
    state: string;
    progress: unknown;
    attemptsMade: number;
    result?: unknown;
    error?: string;
  }> {
    const queue = this.ensureAsyncQueue();
    if (!queue) {
      throw new Error('MCP async queue is disabled. Set DEV_DISABLE_QUEUES=false to enable.');
    }
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`MCP job not found: ${jobId}`);
    }

    const state = await job.getState();
    const progress = job.progress ?? 0;
    const payload: {
      mode: 'worker-queue';
      queue: string;
      jobId: string;
      state: string;
      progress: unknown;
      attemptsMade: number;
      result?: unknown;
      error?: string;
    } = {
      mode: 'worker-queue',
      queue: queue.name,
      jobId,
      state,
      progress,
      attemptsMade: job.attemptsMade,
    };

    if (state === 'completed') {
      payload.result = job.returnvalue;
    } else if (state === 'failed') {
      payload.error = job.failedReason || 'MCP worker job failed';
    }

    return payload;
  }

  private async waitForToolJobResult(
    jobId: string,
    options: { timeoutMs: number; pollIntervalMs: number }
  ): Promise<unknown> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < options.timeoutMs) {
      const status = await this.getToolJobStatus(jobId);
      if (status.state === 'completed') {
        return status.result;
      }
      if (status.state === 'failed') {
        throw new Error(status.error || `MCP async job failed: ${jobId}`);
      }
      await new Promise((resolve) => setTimeout(resolve, options.pollIntervalMs));
    }
    throw new Error(`MCP async job timed out after ${options.timeoutMs}ms (${jobId})`);
  }

  private handleLine(params: {
    line: string;
    initialized: boolean;
    onInitialized: () => void;
    onResult: (result: any) => void;
    onError: (message: string) => void;
  }) {
    const { line, initialized, onInitialized, onResult, onError } = params;

    let payload: JsonRpcResponse;
    try {
      payload = JSON.parse(line) as JsonRpcResponse;
    } catch {
      return;
    }

    if (payload.error) {
      const base = payload.error.message || 'Unknown MCP error';
      onError(`MCP error: ${base}`);
      return;
    }

    if (!initialized && payload.id === 1 && payload.result) {
      onInitialized();
      return;
    }

    if (initialized && payload.id === 2) {
      const structured = payload.result?.structuredContent;
      const content = payload.result?.content;

      if (structured) {
        onResult(structured);
        return;
      }

      if (Array.isArray(content) && content[0]?.text) {
        try {
          onResult(JSON.parse(content[0].text));
          return;
        } catch {
          onResult({ raw: content[0].text });
          return;
        }
      }

      onResult(payload.result);
    }
  }

  private writeJson(child: ReturnType<typeof spawn>, payload: JsonRpcRequest) {
    if (!child.stdin) {
      this.logger.warn('MCP child stdin unavailable while sending JSON-RPC payload');
      return;
    }
    child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  private parseArgs(raw: string): string[] {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    // Basic shell-like splitting for quoted segments.
    const tokens = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    return tokens.map((token) => token.replace(/^['"]|['"]$/g, ''));
  }

  private getAllowedTools(): Set<string> {
    const configured = this.configService.get<string>('MCP_ALLOWED_TOOLS', '').trim();
    if (!configured) {
      return this.defaultAllowedTools;
    }

    const parsed = configured
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return new Set(parsed.length ? parsed : Array.from(this.defaultAllowedTools));
  }

  private ensureAsyncQueue(): Queue | null {
    const devDisableQueues = this.configService.get<boolean>('DEV_DISABLE_QUEUES', false);
    if (devDisableQueues) {
      this.logger.warn(
        'Queues disabled in development mode (DEV_DISABLE_QUEUES=true). MCP async calls will be disabled.'
      );
      return null;
    }

    if (this.asyncQueue) {
      return this.asyncQueue;
    }

    const queueName = this.configService.get<string>('MCP_WORKER_QUEUE', 'mcp-tool-execution');
    const retries = this.configService.get<number>('MCP_WORKER_RETRIES', 1);

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl?.trim()) {
      this.asyncQueueConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
      });
    } else {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);
      const password = this.configService.get<string>('REDIS_PASSWORD');
      const tls = this.configService.get<boolean>('REDIS_TLS', false);

      this.asyncQueueConnection = new Redis({
        host,
        port,
        password: password || undefined,
        tls: tls ? {} : undefined,
        maxRetriesPerRequest: null,
      });
    }

    this.asyncQueue = new Queue(queueName, {
      connection: this.asyncQueueConnection,
      defaultJobOptions: {
        attempts: retries,
        removeOnComplete: 100,
        removeOnFail: 500,
        backoff: {
          type: 'exponential',
          delay: 500,
        },
      },
    });

    return this.asyncQueue;
  }
}
