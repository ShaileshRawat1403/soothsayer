import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueueHealthService {
  private readonly logger = new Logger(QueueHealthService.name);
  private connection: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getConnection(): Redis {
    if (this.connection) return this.connection;

    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    } else {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);
      this.connection = new Redis({ host, port, maxRetriesPerRequest: null });
    }
    return this.connection;
  }

  async getQueueStatus(queueName: string) {
    const queue = new Queue(queueName, { connection: this.getConnection() });
    try {
      const [waiting, active, completed, failed, delayed, workers] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.getWorkers(),
      ]);

      return {
        name: queueName,
        status: workers.length > 0 ? 'up' : 'down',
        backlog: waiting,
        active,
        completed,
        failed,
        delayed,
        workerCount: workers.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get status for queue ${queueName}`, error);
      return {
        name: queueName,
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await queue.close();
    }
  }

  async getAllQueuesStatus() {
    const queueNames = [
      'command-execution',
      'workflow-execution',
      'ai-processing',
      'notifications',
      'analytics',
      'scheduled-tasks',
      'mcp-tool-execution',
    ];

    return Promise.all(queueNames.map((name) => this.getQueueStatus(name)));
  }
}
