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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';

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
    @Body()
    dto: {
      workspaceId: string;
      personaId: string;
      projectId?: string;
      title?: string;
      memoryMode?: string;
    },
  ) {
    return this.chatService.createConversation(user.id, dto.workspaceId, dto.personaId, {
      projectId: dto.projectId,
      title: dto.title,
      memoryMode: dto.memoryMode,
    });
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations' })
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'personaId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async findConversations(
    @GetCurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId: string,
    @Query('projectId') projectId?: string,
    @Query('personaId') personaId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.findConversations(user.id, workspaceId, {
      projectId,
      personaId,
      status,
      search,
      page,
      limit,
    });
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation with messages' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async findConversation(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.chatService.findConversation(id, user.id);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body()
    dto: {
      content: string;
      parentMessageId?: string;
      attachments?: unknown[];
      provider?: string;
      model?: string;
      systemPrompt?: string;
      fileContext?: string;
      fileName?: string;
    },
  ) {
    return this.chatService.sendMessage(id, user.id, dto.content, {
      parentMessageId: dto.parentMessageId,
      attachments: dto.attachments,
      provider: dto.provider,
      model: dto.model,
      systemPrompt: dto.systemPrompt,
      fileContext: dto.fileContext,
      fileName: dto.fileName,
    });
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete conversation' })
  @ApiResponse({ status: 204, description: 'Conversation deleted' })
  async deleteConversation(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.chatService.deleteConversation(id, user.id);
  }

  @Post('conversations/:id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive conversation' })
  @ApiResponse({ status: 204, description: 'Conversation archived' })
  async archiveConversation(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.chatService.archiveConversation(id, user.id);
  }
}
