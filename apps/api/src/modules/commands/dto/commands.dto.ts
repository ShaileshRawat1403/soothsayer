import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class ListCommandsQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

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

export class ExecuteCommandDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ type: Object, default: {} })
  @IsOptional()
  @IsObject()
  parameters: Record<string, unknown> = {};

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  tier?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class ExecuteTerminalDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Allowlisted command id or name' })
  @ValidateIf((dto: ExecuteTerminalDto) => !dto.commandId)
  @IsString()
  @IsNotEmpty()
  command?: string;

  @ApiPropertyOptional({ description: 'Allowlisted command id' })
  @ValidateIf((dto: ExecuteTerminalDto) => !dto.command)
  @IsString()
  @IsNotEmpty()
  commandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cwd?: string;
}
