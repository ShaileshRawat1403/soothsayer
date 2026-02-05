import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';

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
} as const;

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

// Event handlers
const workers = [
  commandWorker,
  workflowWorker,
  aiWorker,
  notificationWorker,
  analyticsWorker,
  scheduledWorker,
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
