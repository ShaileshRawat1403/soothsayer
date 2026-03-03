import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import { spawn } from 'child_process';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Queue definitions
const QUEUES = {
  COMMAND_EXECUTION: 'command-execution',
  WORKFLOW_EXECUTION: 'workflow-execution',
  AI_PROCESSING: 'ai-processing',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
  SCHEDULED_TASKS: 'scheduled-tasks',
  MCP_TOOL_EXECUTION: process.env.MCP_WORKER_QUEUE || 'mcp-tool-execution',
} as const;

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id?: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

const parseArgs = (raw: string): string[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const tokens = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  return tokens.map((token) => token.replace(/^['"]|['"]$/g, ''));
};

const runMcpToolCall = async (name: string, args: Record<string, unknown>, timeoutMs: number): Promise<any> => {
  const bin = process.env.MCP_SERVER_BIN || 'workspace-mcp';
  const workspaceRoot = process.env.MCP_WORKSPACE_ROOT || process.cwd();
  const profile = process.env.MCP_PROFILE || 'dev';
  const policyPath = process.env.MCP_POLICY_PATH;
  const cwd = process.env.MCP_WORKDIR || process.cwd();

  const argsFromEnv = parseArgs(process.env.MCP_SERVER_ARGS || '');
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
      clientInfo: { name: 'soothsayer-worker', version: '1.0.0' },
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
          let payload: JsonRpcResponse;
          try {
            payload = JSON.parse(line) as JsonRpcResponse;
          } catch {
            newlineIndex = buffer.indexOf('\n');
            continue;
          }

          if (payload.error) {
            clearTimeout(timer);
            finishError(`MCP error: ${payload.error.message || 'unknown error'}`);
            return;
          }

          if (!initialized && payload.id === 1 && payload.result) {
            initialized = true;
            child.stdin?.write(`${JSON.stringify(initNotification)}\n`);
            child.stdin?.write(`${JSON.stringify(toolCallRequest)}\n`);
            newlineIndex = buffer.indexOf('\n');
            continue;
          }

          if (initialized && payload.id === 2) {
            clearTimeout(timer);
            const structured = payload.result?.structuredContent;
            const content = payload.result?.content;
            if (structured) {
              finishOk(structured);
              return;
            }
            if (Array.isArray(content) && content[0]?.text) {
              try {
                finishOk(JSON.parse(content[0].text));
              } catch {
                finishOk({ raw: content[0].text });
              }
              return;
            }
            finishOk(payload.result);
            return;
          }
        }

        newlineIndex = buffer.indexOf('\n');
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (!settled && code !== 0) {
        finishError(`MCP process exited with code ${code}. stderr: ${stderr.trim() || '<empty>'}`);
      }
    });

    child.stdin?.write(`${JSON.stringify(initRequest)}\n`);
  });
};

// Command Execution Worker
const commandWorker = new Worker(
  QUEUES.COMMAND_EXECUTION,
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing command execution job');
    
    const { commandId, command, workspaceId, userId, projectId } = job.data;
    
    try {
      // Simulate command execution
      await job.updateProgress(10);
      
      // Policy check
      logger.info({ commandId, command }, 'Running policy check');
      await new Promise((resolve) => setTimeout(resolve, 500));
      await job.updateProgress(30);
      
      // Execute command
      logger.info({ commandId, command }, 'Executing command');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await job.updateProgress(70);
      
      // Store results
      await new Promise((resolve) => setTimeout(resolve, 500));
      await job.updateProgress(100);
      
      return {
        success: true,
        output: `Simulated output for: ${command}`,
        exitCode: 0,
        duration: 2000,
      };
    } catch (error) {
      logger.error({ commandId, error }, 'Command execution failed');
      throw error;
    }
  },
  { connection }
);

// Workflow Execution Worker
const workflowWorker = new Worker(
  QUEUES.WORKFLOW_EXECUTION,
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing workflow execution job');
    
    const { workflowId, runId, steps, inputs } = job.data;
    
    try {
      const results: Record<string, unknown> = {};
      const totalSteps = steps?.length || 1;
      
      for (let i = 0; i < totalSteps; i++) {
        const step = steps?.[i] || { id: `step-${i}`, type: 'action' };
        
        logger.info({ runId, stepId: step.id }, 'Executing workflow step');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        results[step.id] = { status: 'completed', output: {} };
        await job.updateProgress(((i + 1) / totalSteps) * 100);
      }
      
      return {
        success: true,
        results,
        duration: totalSteps * 1000,
      };
    } catch (error) {
      logger.error({ workflowId, runId, error }, 'Workflow execution failed');
      throw error;
    }
  },
  { connection }
);

// AI Processing Worker
const aiWorker = new Worker(
  QUEUES.AI_PROCESSING,
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing AI job');
    
    const { conversationId, messageId, prompt, personaId } = job.data;
    
    try {
      // Simulate AI processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      return {
        success: true,
        response: `AI response for conversation ${conversationId}`,
        tokens: { prompt: 100, completion: 200 },
      };
    } catch (error) {
      logger.error({ conversationId, messageId, error }, 'AI processing failed');
      throw error;
    }
  },
  { connection }
);

// Notifications Worker
const notificationWorker = new Worker(
  QUEUES.NOTIFICATIONS,
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing notification job');
    
    const { type, userId, data } = job.data;
    
    try {
      // Send notification (email, push, in-app)
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      logger.info({ type, userId }, 'Notification sent');
      
      return { success: true };
    } catch (error) {
      logger.error({ type, userId, error }, 'Notification failed');
      throw error;
    }
  },
  { connection }
);

// Analytics Worker
const analyticsWorker = new Worker(
  QUEUES.ANALYTICS,
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing analytics job');
    
    const { eventType, eventData } = job.data;
    
    try {
      // Store analytics event
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      return { success: true };
    } catch (error) {
      logger.error({ eventType, error }, 'Analytics processing failed');
      throw error;
    }
  },
  { connection }
);

// Scheduled Tasks Worker
const scheduledWorker = new Worker(
  QUEUES.SCHEDULED_TASKS,
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing scheduled task');
    
    const { taskType, taskData } = job.data;
    
    try {
      switch (taskType) {
        case 'cleanup':
          logger.info('Running cleanup task');
          break;
        case 'report':
          logger.info('Generating scheduled report');
          break;
        case 'workflow':
          logger.info('Running scheduled workflow');
          break;
        default:
          logger.warn({ taskType }, 'Unknown task type');
      }
      
      return { success: true };
    } catch (error) {
      logger.error({ taskType, error }, 'Scheduled task failed');
      throw error;
    }
  },
  { connection }
);

const mcpToolWorker = new Worker(
  QUEUES.MCP_TOOL_EXECUTION,
  async (job) => {
    const { name, args, timeoutMs } = job.data as {
      name: string;
      args: Record<string, unknown>;
      timeoutMs?: number;
    };
    logger.info({ jobId: job.id, tool: name }, 'Processing MCP tool execution job');
    await job.updateProgress(10);
    const result = await runMcpToolCall(
      name,
      args || {},
      timeoutMs || Number(process.env.MCP_WORKER_JOB_TIMEOUT_MS || 30000),
    );
    await job.updateProgress(100);
    return {
      success: true,
      tool: name,
      result,
    };
  },
  { connection, concurrency: Number(process.env.MCP_WORKER_CONCURRENCY || 2) }
);

// Event handlers
const workers = [
  commandWorker,
  workflowWorker,
  aiWorker,
  notificationWorker,
  analyticsWorker,
  scheduledWorker,
  mcpToolWorker,
];

workers.forEach((worker) => {
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, queue: job.queueName }, 'Job completed');
  });
  
  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, queue: job?.queueName, error: error.message }, 'Job failed');
  });
  
  worker.on('error', (error) => {
    logger.error({ error: error.message }, 'Worker error');
  });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down workers...');
  
  await Promise.all(workers.map((worker) => worker.close()));
  await connection.quit();
  
  logger.info('Workers shut down successfully');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info({ queues: Object.values(QUEUES) }, 'Workers started');
