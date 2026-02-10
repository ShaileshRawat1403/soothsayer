import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectsController {
  @Get()
  async findAll() {
    return { message: 'projects endpoint - TODO' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { id, message: 'projects detail - TODO' };
  }
}
