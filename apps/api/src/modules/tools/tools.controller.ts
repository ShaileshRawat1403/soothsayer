import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('tools')
@Controller('tools')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ToolsController {
  @Get()
  async findAll() {
    return { message: 'tools endpoint - TODO' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { id, message: 'tools detail - TODO' };
  }
}
