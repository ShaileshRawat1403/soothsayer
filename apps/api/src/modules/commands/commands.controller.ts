import { Controller, Get, Post, Body, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Request, Response } from 'express';
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

  @Post('execute-terminal-stream')
  @ApiOperation({ summary: 'Execute a terminal command and stream output chunks' })
  async executeTerminalStream(
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: ExecuteTerminalDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const encoder = (event: string, payload: unknown) =>
      `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      await this.commandsService.executeTerminalStream(
        user.id,
        dto.workspaceId,
        dto.commandId || dto.command || '',
        dto.cwd,
        {
          onStart: (payload) => res.write(encoder('terminal.started', payload)),
          onChunk: (payload) => res.write(encoder('terminal.chunk', payload)),
          onComplete: (payload) => res.write(encoder('terminal.completed', payload)),
          onError: (payload) => res.write(encoder('terminal.error', payload)),
        },
        abortController.signal
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terminal stream failed';
      res.write(encoder('terminal.error', { message }));
    } finally {
      res.end();
    }
  }
}
