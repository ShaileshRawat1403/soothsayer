import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListProjectsQueryDto } from './dto/projects.dto';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List workspace projects' })
  @ApiQuery({ name: 'workspaceId', required: true })
  async findAll(@GetCurrentUser() user: CurrentUser, @Query() query: ListProjectsQueryDto) {
    return this.projectsService.findAll(user.id, query.workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  async findOne(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    return this.projectsService.findOne(id, user.id);
  }
}
