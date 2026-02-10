import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis, RedisOptions } from 'ioredis';
import { ServerOptions } from 'socket.io';

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value == null) {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase().trim());
}

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private readonly configService: ConfigService;
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(appOrHttpServer: INestApplicationContext) {
    super(appOrHttpServer);
    this.configService = appOrHttpServer.get(ConfigService);
  }

  async connectToRedis(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const tlsEnabled = parseBoolean(this.configService.get('REDIS_TLS'));

    const redisOptions: RedisOptions = {
      host,
      port,
      password,
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 100, 2000),
      reconnectOnError: () => false,
    };

    if (tlsEnabled) {
      redisOptions.tls = {};
    }

    const pubClient = new Redis(redisOptions);
    const subClient = new Redis(redisOptions);

    pubClient.on('error', (error) => {
      this.logger.error(`Redis pub client error: ${error.message}`);
    });
    subClient.on('error', (error) => {
      this.logger.error(`Redis sub client error: ${error.message}`);
    });
    pubClient.on('end', () => {
      this.logger.warn('Redis pub client connection ended');
    });
    subClient.on('end', () => {
      this.logger.warn('Redis sub client connection ended');
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.logger.log(`Connected Socket.IO adapter to Redis at ${host}:${port} (tls=${tlsEnabled})`);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    if (!this.adapterConstructor) {
      throw new Error('Redis adapter is not initialized. Call connectToRedis() before createIOServer().');
    }

    server.adapter(this.adapterConstructor);
    return server;
  }
}
