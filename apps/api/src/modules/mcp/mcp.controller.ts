import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { McpService } from './mcp.service';

class McpToolCallDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsObject()
  arguments?: Record<string, unknown>;
}

@ApiTags('mcp')
@Controller('mcp')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get('health')
  @ApiOperation({ summary: 'MCP kernel health check (kernel_version + self_check)' })
  @ApiResponse({ status: 200, description: 'MCP health status' })
  async health() {
    return this.mcpService.getHealth();
  }

  @Post('tools/call')
  @ApiOperation({ summary: 'Call an allowlisted MCP tool' })
  @ApiResponse({ status: 201, description: 'MCP tool call result' })
  async callTool(@Body() dto: McpToolCallDto) {
    const name = (dto.name || '').trim();
    if (!name) {
      throw new BadRequestException('Tool name is required');
    }

    return this.mcpService.callAllowedTool(name, dto.arguments || {});
  }
}
