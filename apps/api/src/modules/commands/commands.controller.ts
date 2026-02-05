import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommandsService } from './commands.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('commands')
@Controller('commands')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Get()
  @ApiOperation({ summary: 'List commands' })
  @ApiQuery({ name: 'workspaceId', required: true })
  async findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.commandsService.findAll(workspaceId, { category, search, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get command details' })
  async findOne(@Param('id') id: string) {
    return this.commandsService.findOne(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute command' })
  async execute(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: {
      workspaceId: string;
      projectId?: string;
      parameters: Record<string, unknown>;
      tier?: number;
      personaId?: string;
      conversationId?: string;
      dryRun?: boolean;
    },
  ) {
    return this.commandsService.execute(id, user.id, dto.workspaceId, dto);
  }
}
