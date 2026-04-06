import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateConversationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  personaId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  repoPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: ['session', 'project', 'persistent'] })
  @IsOptional()
  @IsIn(['session', 'project', 'persistent'])
  memoryMode?: string;
}

export class ListConversationsQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personaId?: string;

  @ApiPropertyOptional({ enum: ['active', 'archived', 'deleted'] })
  @IsOptional()
  @IsIn(['active', 'archived', 'deleted'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentMessageId?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  attachments?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileContext?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mcpToolName?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  mcpToolArgs?: Record<string, unknown>;
}

export class RegenerateMessageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;
}
