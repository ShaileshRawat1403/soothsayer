import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateConversationDto, ListConversationsQueryDto, SendMessageDto } from './dto/chat.dto';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: CreateConversationDto
  ) {
    return this.chatService.createConversation(user.id, dto.workspaceId, dto.personaId, {
      projectId: dto.projectId,
      repoPath: dto.repoPath,
      title: dto.title,
      memoryMode: dto.memoryMode,
    });
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async findConversations(
    @GetCurrentUser() user: CurrentUser,
    @Query() query: ListConversationsQueryDto
  ) {
    return this.chatService.findConversations(user.id, query.workspaceId, {
      projectId: query.projectId,
      personaId: query.personaId,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation with messages' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async findConversation(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    return this.chatService.findConversation(id, user.id);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: SendMessageDto
  ) {
    return this.chatService.sendMessage(id, user.id, dto.content, {
      parentMessageId: dto.parentMessageId,
      attachments: dto.attachments,
      provider: dto.provider,
      model: dto.model,
      systemPrompt: dto.systemPrompt,
      fileContext: dto.fileContext,
      fileName: dto.fileName,
      mcpToolName: dto.mcpToolName,
      mcpToolArgs: dto.mcpToolArgs,
    });
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete conversation' })
  @ApiResponse({ status: 204, description: 'Conversation deleted' })
  async deleteConversation(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    return this.chatService.deleteConversation(id, user.id);
  }

  @Post('conversations/:id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive conversation' })
  @ApiResponse({ status: 204, description: 'Conversation archived' })
  async archiveConversation(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    return this.chatService.archiveConversation(id, user.id);
  }
}
