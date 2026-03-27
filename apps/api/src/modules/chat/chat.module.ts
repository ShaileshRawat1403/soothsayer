import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { McpModule } from '../mcp/mcp.module';
import { DaxModule } from '../dax/dax.module';
import { PersonaMapperService } from './persona-mapper.service';
import { ChatHandoffService } from './chat-handoff.service';
import { ConversationService } from './conversation.service';
import { AIProviderService } from './ai-provider.service';
import { PoliciesModule } from '../policies/policies.module';

@Module({
  imports: [McpModule, DaxModule, PoliciesModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    PersonaMapperService,
    ChatHandoffService,
    ConversationService,
    AIProviderService,
  ],
  exports: [
    ChatService,
    PersonaMapperService,
    ChatHandoffService,
    ConversationService,
    AIProviderService,
  ],
})
export class ChatModule {}
