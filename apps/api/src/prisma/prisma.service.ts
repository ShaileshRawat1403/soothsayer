import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');

    // Log slow queries in development
    if (process.env.NODE_ENV === 'development') {
      // @ts-ignore
      this.$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration > 100) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  // Soft delete extension for models that support it
  async softDelete(model: string, id: string): Promise<void> {
    // @ts-ignore - Dynamic model access
    await this[model].update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Restore soft deleted record
  async restore(model: string, id: string): Promise<void> {
    // @ts-ignore - Dynamic model access
    await this[model].update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  // Transaction helper with retry logic
  async executeInTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(fn, {
          maxWait: 5000,
          timeout: 10000,
        });
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a retryable error (deadlock, serialization failure)
        if (
          error instanceof PrismaClientKnownRequestError &&
          ['P2034'].includes(error.code)
        ) {
          this.logger.warn(`Transaction retry ${attempt}/${maxRetries}: ${error.message}`);
          await this.delay(Math.pow(2, attempt) * 100);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
