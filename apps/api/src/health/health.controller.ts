import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

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
    }> = [];

    // Check database
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
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // TODO: Add Redis health check
    // TODO: Add external service health checks

    const allHealthy = services.every((s) => s.status === 'up');

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date(),
      services,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async ready() {
    // Check if all required services are available
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
    return { alive: true, timestamp: new Date() };
  }
}
