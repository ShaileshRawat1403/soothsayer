import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ToolsService } from './tools.service';

@ApiTags('tools')
@Controller('tools')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  @ApiOperation({ summary: 'List available tools' })
  @ApiQuery({ name: 'workspaceId', required: false })
  async findAll(@GetCurrentUser() user: CurrentUser, @Query('workspaceId') workspaceId?: string) {
    return this.toolsService.findAll(user.id, workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tool details' })
  @ApiQuery({ name: 'workspaceId', required: false })
  async findOne(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId?: string
  ) {
    return this.toolsService.findOne(id, user.id, workspaceId);
  }
}
