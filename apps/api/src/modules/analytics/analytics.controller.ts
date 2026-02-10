import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AnalyticsController {
  @Get()
  async findAll() {
    return { message: 'analytics endpoint - TODO' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { id, message: 'analytics detail - TODO' };
  }
}
