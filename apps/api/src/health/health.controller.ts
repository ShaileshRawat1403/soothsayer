import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { DaxService } from '../dax/dax.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private daxService: DaxService,
    private configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    const services: Array<{
      name: string;
      status: 'up' | 'down';
      latencyMs?: number;
      message?: string;
      version?: string;
    }> = [];

    // 1. Database Check
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.push({
        name: 'database',
        status: 'up',
        latencyMs: Date.now() - dbStart,
      });
    } catch (error) {
      services.push({
        name: 'database',
        status: 'down',
        message: error instanceof Error ? error.message : 'Prisma connection failed',
      });
    }

    // 2. Redis Check (Optional but recommended)
    const redisStart = Date.now();
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const redis = new Redis(redisUrl, { connectTimeout: 2000, maxRetriesPerRequest: 0 });
        const ping = await redis.ping();
        if (ping === 'PONG') {
          services.push({
            name: 'redis',
            status: 'up',
            latencyMs: Date.now() - redisStart,
          });
        } else {
          throw new Error('Redis ping failed');
        }
        await redis.quit();
      } catch (error) {
        services.push({
          name: 'redis',
          status: 'down',
          message: error instanceof Error ? error.message : 'Redis connection failed',
        });
      }
    }

    // 3. DAX Engine Check
    const daxStart = Date.now();
    try {
      const daxHealth = await this.daxService.getHealth();
      services.push({
        name: 'dax-engine',
        status: daxHealth.healthy ? 'up' : 'down',
        version: daxHealth.version,
        latencyMs: Date.now() - daxStart,
      });
    } catch (error) {
      services.push({
        name: 'dax-engine',
        status: 'down',
        message: 'DAX endpoint unreachable',
      });
    }

    const allHealthy = services.every((s) => s.status === 'up');

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      services,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch {
      return { ready: false };
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live() {
    return { alive: true, timestamp: new Date().toISOString() };
  }
}
