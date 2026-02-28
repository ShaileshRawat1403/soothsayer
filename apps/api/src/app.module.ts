import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { PersonasModule } from './modules/personas/personas.module';
import { ChatModule } from './modules/chat/chat.module';
import { CommandsModule } from './modules/commands/commands.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { ToolsModule } from './modules/tools/tools.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FilesModule } from './modules/files/files.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { McpModule } from './modules/mcp/mcp.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthModule } from './health/health.module';
import { validateEnv } from './config/env.validation';

const envFilePath = [
  '.env.local',
  '.env',
  '../.env.local',
  '../.env',
  '../../.env.local',
  '../../.env',
];

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([
        {
          ttl: config.get('RATE_LIMIT_TTL', 60) * 1000,
          limit: config.get('RATE_LIMIT_MAX', 100),
        },
      ]),
    }),

    // Database
    PrismaModule,

    // Core modules
    AuthModule,
    UsersModule,
    WorkspacesModule,
    PersonasModule,
    ChatModule,
    CommandsModule,
    WorkflowsModule,
    ToolsModule,
    PoliciesModule,
    AnalyticsModule,
    FilesModule,
    NotificationsModule,
    McpModule,

    // Real-time
    WebsocketModule,

    // Health checks
    HealthModule,
  ],
})
export class AppModule {}
