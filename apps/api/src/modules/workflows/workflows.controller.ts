import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkflowsController {
  @Get()
  async findAll() {
    return { message: 'workflows endpoint - TODO' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { id, message: 'workflows detail - TODO' };
  }
}
