import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RedisIoAdapter } from './websocket/redis-io.adapter';

const envPaths = [
  '.env.local',
  '.env',
  '../.env.local',
  '../.env',
  '../../.env.local',
  '../../.env',
];

for (const path of envPaths) {
  dotenv.config({ path, override: true });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3000);
  const appUrl = configService.get<string>('APP_URL', 'http://localhost:5173');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
    })
  );

  // CORS configuration
  app.enableCors({
    origin: [appUrl, 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-Id'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // WebSocket adapter for horizontal scaling
  const wsRedisEnabled = configService.get<boolean>('WS_REDIS_ENABLED', false);
  // Safety default: do not run Redis adapter outside production.
  // This avoids noisy reconnect loops and startup/runtime instability in EC2 dev/testing.
  const shouldUseRedisAdapter = nodeEnv === 'production' && wsRedisEnabled;

  if (shouldUseRedisAdapter) {
    const redisIoAdapter = new RedisIoAdapter(app);
    try {
      await redisIoAdapter.connectToRedis();
      app.useWebSocketAdapter(redisIoAdapter);
      logger.log('WebSocket Redis adapter enabled');
    } catch (error) {
      logger.warn(`Redis adapter unavailable, continuing without Redis scaling: ${String(error)}`);
    }
  } else {
    logger.log(
      `WebSocket Redis adapter disabled (NODE_ENV=${nodeEnv}, WS_REDIS_ENABLED=${wsRedisEnabled})`,
    );
  }

  // Swagger documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('The Soothsayer API')
      .setDescription('Enterprise-grade AI workspace platform API')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('workspaces', 'Workspace management')
      .addTag('personas', 'Persona management')
      .addTag('chat', 'Chat & conversations')
      .addTag('commands', 'Command execution')
      .addTag('workflows', 'Workflow management')
      .addTag('tools', 'Tool registry')
      .addTag('analytics', 'Analytics & audit')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
  }

  // Start server
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📝 Environment: ${nodeEnv}`);
}

bootstrap();
