import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workspaces')
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'List all workspaces for current user' })
  @ApiResponse({ status: 200, description: 'List of workspaces' })
  async findAll(@GetCurrentUser() user: CurrentUser) {
    return this.workspacesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace details' })
  @ApiResponse({ status: 200, description: 'Workspace details' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async findOne(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.workspacesService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created' })
  async create(
    @Body() data: { organizationId: string; name: string; slug?: string; description?: string },
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.workspacesService.create(data.organizationId, user.id, data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace' })
  @ApiResponse({ status: 200, description: 'Workspace updated' })
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; settings?: Record<string, unknown> },
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.workspacesService.update(id, user.id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiResponse({ status: 204, description: 'Workspace deleted' })
  async delete(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.workspacesService.delete(id, user.id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to workspace' })
  @ApiResponse({ status: 201, description: 'Member added' })
  async addMember(
    @Param('id') id: string,
    @Body() data: { email: string; role: string },
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.workspacesService.addMember(id, user.id, data.email, data.role);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from workspace' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.workspacesService.removeMember(id, user.id, memberId);
  }
}
