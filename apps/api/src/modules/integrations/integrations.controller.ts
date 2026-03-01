import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GetCurrentUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IntegrationsService, IntegrationName } from './integrations.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('integrations')
@Controller('integrations')
@ApiBearerAuth('JWT-auth')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get status for supported integrations' })
  async status(
    @GetCurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.integrationsService.getStatus(user.id, workspaceId);
  }

  @Post(':name/test')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Test a specific integration connection' })
  async test(
    @Param('name') name: IntegrationName,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto?: { workspaceId?: string },
  ) {
    return this.integrationsService.test(name, user.id, dto?.workspaceId);
  }

  @Get(':name/connect')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get OAuth connect URL for provider' })
  async connect(
    @Param('name') name: 'github' | 'slack' | 'google_drive' | 'jira' | 'notion' | 'linear' | 'discord',
    @GetCurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.integrationsService.getConnectUrl(name, user.id, workspaceId);
  }

  @Get(':name/callback')
  @ApiOperation({ summary: 'OAuth callback for provider' })
  async callback(
    @Param('name') name: 'github' | 'slack' | 'google_drive' | 'jira' | 'notion' | 'linear' | 'discord',
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.integrationsService.handleOAuthCallback(name, code, state);
      const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173').replace(/\/+$/, '');
      return res.redirect(`${appUrl}/settings?integration=${name}&connected=1`);
    } catch (error) {
      const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173').replace(/\/+$/, '');
      const message = encodeURIComponent(error instanceof Error ? error.message : 'OAuth callback failed');
      return res.redirect(`${appUrl}/settings?integration=${name}&connected=0&error=${message}`);
    }
  }

  @Delete(':name')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Disconnect integration' })
  async disconnect(
    @Param('name') name: 'github' | 'slack' | 'google_drive' | 'jira' | 'notion' | 'linear' | 'discord',
    @GetCurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.integrationsService.disconnect(name, user.id, workspaceId);
  }
}
