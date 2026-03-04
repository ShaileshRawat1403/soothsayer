import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommandsService } from './commands.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExecuteCommandDto, ExecuteTerminalDto, ListCommandsQueryDto } from './dto/commands.dto';

@ApiTags('commands')
@Controller('commands')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Get()
  @ApiOperation({ summary: 'List commands' })
  @ApiQuery({ name: 'workspaceId', required: true })
  async findAll(@Query() query: ListCommandsQueryDto) {
    return this.commandsService.findAll(query.workspaceId, {
      category: query.category,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
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
    @Body() dto: ExecuteCommandDto
  ) {
    return this.commandsService.execute(id, user.id, dto.workspaceId, dto);
  }

  @Post('execute-terminal')
  @ApiOperation({ summary: 'Execute an ad-hoc terminal command (dev-safe mode)' })
  async executeTerminal(@GetCurrentUser() user: CurrentUser, @Body() dto: ExecuteTerminalDto) {
    return this.commandsService.executeTerminal(
      user.id,
      dto.workspaceId,
      dto.commandId || dto.command || '',
      dto.cwd
    );
  }
}
