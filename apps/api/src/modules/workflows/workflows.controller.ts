import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkflowsService } from './workflows.service';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.workflowsService.findAll(user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.workflowsService.findOne(id, user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: { status: 'draft' | 'active' | 'paused' | 'archived' },
  ) {
    return this.workflowsService.updateStatus(id, user.id, dto.status);
  }

  @Post(':id/run')
  async run(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: { inputs?: Record<string, unknown>; projectId?: string; conversationId?: string },
  ) {
    return this.workflowsService.run(id, user.id, dto);
  }
}
