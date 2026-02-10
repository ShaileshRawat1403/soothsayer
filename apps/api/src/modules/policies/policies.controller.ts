import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('policies')
@Controller('policies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PoliciesController {
  @Get()
  async findAll() {
    return { message: 'policies endpoint - TODO' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { id, message: 'policies detail - TODO' };
  }
}
