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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateConversationDto,
  ListConversationsQueryDto,
  SendMessageDto,
  RegenerateMessageDto,
} from './dto/chat.dto';

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
  async findConversation(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number
  ) {
    return this.chatService.findConversation(id, user.id, { cursor, limit });
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

  @Post('conversations/:id/messages/stream')
  @ApiOperation({ summary: 'Send a message with streaming response' })
  @ApiResponse({ status: 200, description: 'Streaming response' })
  async sendMessageStream(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: SendMessageDto,
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const conversation = await this.chatService.findConversation(id, user.id);
      const handoffDecision = await this.chatService.evaluateHandoff(id, user.id, dto.content);

      if (handoffDecision.shouldHandoff) {
        res.write(`data: ${JSON.stringify({ type: 'handoff', decision: handoffDecision })}\n\n`);
        res.end();
        return;
      }

      const stream = this.chatService.streamMessage(id, user.id, dto.content, {
        parentMessageId: dto.parentMessageId,
        provider: dto.provider,
        model: dto.model,
        systemPrompt: dto.systemPrompt,
        fileContext: dto.fileContext,
        fileName: dto.fileName,
      });

      let fullContent = '';
      let messageId: string | null = null;

      for await (const chunk of stream) {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'done', content: fullContent })}\n\n`);
      res.end();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Stream error';
      res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
      res.end();
    }
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

  @Post('conversations/:id/messages/:messageId/regenerate')
  @ApiOperation({ summary: 'Regenerate an assistant message' })
  @ApiResponse({ status: 201, description: 'Message regenerated' })
  async regenerateMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: RegenerateMessageDto
  ) {
    return this.chatService.regenerateMessage(id, messageId, user.id, {
      provider: dto.provider,
      model: dto.model,
    });
  }
}
