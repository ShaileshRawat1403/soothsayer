import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PersonasService } from './personas.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('personas')
@Controller('personas')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Get()
  @ApiOperation({ summary: 'List personas' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'includeBuiltIn', required: false, type: Boolean })
  @ApiQuery({ name: 'includeCustom', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of personas' })
  async findAll(
    @Query('workspaceId') workspaceId?: string,
    @Query('category') category?: string,
    @Query('includeBuiltIn') includeBuiltIn?: boolean,
    @Query('includeCustom') includeCustom?: boolean,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.personasService.findAll({
      workspaceId,
      category,
      includeBuiltIn: includeBuiltIn !== false,
      includeCustom: includeCustom !== false,
      search,
      page: page || 1,
      limit: limit || 20,
    });
  }

  @Get('recommend')
  @ApiOperation({ summary: 'Get auto-persona recommendation' })
  @ApiQuery({ name: 'input', required: true })
  @ApiQuery({ name: 'workspaceId', required: false })
  @ApiResponse({ status: 200, description: 'Persona recommendations' })
  async getRecommendation(
    @Query('input') input: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.personasService.getAutoPersonaRecommendation(input, workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get persona details' })
  @ApiResponse({ status: 200, description: 'Persona details' })
  @ApiResponse({ status: 404, description: 'Persona not found' })
  async findOne(@Param('id') id: string) {
    return this.personasService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create custom persona' })
  @ApiResponse({ status: 201, description: 'Persona created' })
  async create(
    @GetCurrentUser() user: CurrentUser,
    @Body()
    dto: {
      name: string;
      category: string;
      description: string;
      avatarUrl?: string;
      workspaceId?: string;
      config: Record<string, unknown>;
    },
  ) {
    return this.personasService.create(user.id, dto as Parameters<typeof this.personasService.create>[1]);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update persona' })
  @ApiResponse({ status: 200, description: 'Persona updated' })
  @ApiResponse({ status: 403, description: 'Cannot modify built-in personas' })
  async update(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body()
    dto: {
      name?: string;
      description?: string;
      avatarUrl?: string;
      config?: Record<string, unknown>;
      changelog?: string;
    },
  ) {
    return this.personasService.update(id, user.id, dto as Parameters<typeof this.personasService.update>[2]);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete persona' })
  @ApiResponse({ status: 204, description: 'Persona deleted' })
  @ApiResponse({ status: 403, description: 'Cannot delete built-in personas' })
  async delete(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.personasService.delete(id, user.id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone persona' })
  @ApiResponse({ status: 201, description: 'Persona cloned' })
  async clone(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: { name: string; workspaceId?: string },
  ) {
    return this.personasService.clone(id, user.id, dto.name, dto.workspaceId);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export persona as JSON' })
  @ApiResponse({ status: 200, description: 'Persona export' })
  async exportPersona(@Param('id') id: string) {
    return this.personasService.exportPersona(id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import persona from JSON' })
  @ApiResponse({ status: 201, description: 'Persona imported' })
  async importPersona(
    @GetCurrentUser() user: CurrentUser,
    @Body()
    dto: {
      data: {
        persona: {
          name: string;
          category: string;
          description: string;
          config: Record<string, unknown>;
        };
      };
      workspaceId?: string;
      overrideName?: string;
    },
  ) {
    return this.personasService.importPersona(
      user.id,
      dto.data.persona as Parameters<typeof this.personasService.importPersona>[1],
      dto.workspaceId,
      dto.overrideName,
    );
  }

  @Post(':id/rollback')
  @ApiOperation({ summary: 'Rollback persona to previous version' })
  @ApiResponse({ status: 200, description: 'Persona rolled back' })
  async rollback(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: { targetVersion: number },
  ) {
    return this.personasService.rollback(id, user.id, dto.targetVersion);
  }

  @Post(':id/preference')
  @ApiOperation({ summary: 'Set persona preference' })
  @ApiResponse({ status: 201, description: 'Preference saved' })
  async setPreference(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: { workspaceId?: string; isDefault?: boolean },
  ) {
    return this.personasService.setPreference(user.id, id, dto.workspaceId, dto.isDefault);
  }

  @Post(':id/rate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rate persona' })
  @ApiResponse({ status: 204, description: 'Rating recorded' })
  async rate(
    @Param('id') id: string,
    @Body() dto: { rating: number },
  ) {
    return this.personasService.ratePersona(id, dto.rating);
  }
}
