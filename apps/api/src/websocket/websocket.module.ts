import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../modules/auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WebsocketGateway } from './websocket.gateway';

@Module({
  imports: [ConfigModule, AuthModule, PrismaModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
