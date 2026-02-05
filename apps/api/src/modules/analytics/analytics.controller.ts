import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('$(echo $module)')
@Controller('$(echo $module)')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class $(echo $module | sed 's/.*/\u&/')Controller {
  @Get()
  async findAll() {
    return { message: '$(echo $module) endpoint - TODO' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { id, message: '$(echo $module) detail - TODO' };
  }
}
