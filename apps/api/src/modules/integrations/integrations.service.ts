import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

export type IntegrationName =
  | 'slack'
  | 'github'
  | 'google_drive'
  | 'jira'
  | 'linear'
  | 'notion'
  | 'discord';

export interface IntegrationStatus {
  name: IntegrationName;
  configured: boolean;
  connected: boolean;
  message: string;
}

type OAuthProvider = 'github' | 'slack' | 'google_drive' | 'jira' | 'notion' | 'linear' | 'discord';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getStatus(userId: string, workspaceId?: string): Promise<IntegrationStatus[]> {
    const wsId = await this.resolveWorkspaceId(userId, workspaceId);
    const [github, slack, drive, jira, linear, notion, discord] = await Promise.all([
      this.testGitHub(wsId),
      this.testSlack(wsId),
      this.testGoogleDrive(wsId),
      this.testJira(wsId),
      this.testLinear(wsId),
      this.testNotion(wsId),
      this.testDiscord(wsId),
    ]);
    return [github, slack, drive, jira, linear, notion, discord];
  }

  async test(name: IntegrationName, userId: string, workspaceId?: string): Promise<IntegrationStatus> {
    const wsId = await this.resolveWorkspaceId(userId, workspaceId);
    switch (name) {
      case 'slack':
        return this.testSlack(wsId);
      case 'github':
        return this.testGitHub(wsId);
      case 'google_drive':
        return this.testGoogleDrive(wsId);
      case 'jira':
        return this.testJira(wsId);
      case 'linear':
        return this.testLinear(wsId);
      case 'notion':
        return this.testNotion(wsId);
      case 'discord':
        return this.testDiscord(wsId);
      default:
        return {
          name,
          configured: false,
          connected: false,
          message: `Unknown integration: ${name}`,
        };
    }
  }

  async getConnectUrl(provider: OAuthProvider, userId: string, workspaceId?: string) {
    const wsId = await this.resolveWorkspaceId(userId, workspaceId);
    const apiBaseUrl = this.config.get<string>('API_PUBLIC_URL', 'http://localhost:3000').replace(/\/+$/, '');
    const redirectUri = this.getProviderRedirectUri(provider, apiBaseUrl);
    const state = this.signState({
      provider,
      userId,
      workspaceId: wsId,
      exp: Date.now() + 10 * 60 * 1000,
    });

    if (provider === 'github') {
      const clientId = this.config.get<string>('GITHUB_CLIENT_ID', '').trim();
      if (!clientId) {
        throw new BadRequestException('Missing GITHUB_CLIENT_ID');
      }
      const authUrl = new URL('https://github.com/login/oauth/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'read:user repo');
      authUrl.searchParams.set('state', state);
      return { provider, authUrl: authUrl.toString() };
    }

    if (provider === 'slack') {
      const clientId = this.config.get<string>('SLACK_CLIENT_ID', '').trim();
      if (!clientId) {
        throw new BadRequestException('Missing SLACK_CLIENT_ID');
      }
      const authUrl = new URL('https://slack.com/oauth/v2/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('scope', 'chat:write,channels:read');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      return { provider, authUrl: authUrl.toString() };
    }

    if (provider === 'google_drive') {
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID', '').trim();
      if (!clientId) {
        throw new BadRequestException('Missing GOOGLE_CLIENT_ID');
      }
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set(
        'scope',
        'https://www.googleapis.com/auth/drive.metadata.readonly openid email profile',
      );
      authUrl.searchParams.set('state', state);
      return { provider, authUrl: authUrl.toString() };
    }

    if (provider === 'jira') {
      const clientId = this.config.get<string>('JIRA_CLIENT_ID', '').trim();
      if (!clientId) {
        throw new BadRequestException('Missing JIRA_CLIENT_ID');
      }
      const authUrl = new URL('https://auth.atlassian.com/authorize');
      authUrl.searchParams.set('audience', 'api.atlassian.com');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('scope', 'read:jira-user read:jira-work offline_access');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('prompt', 'consent');
      return { provider, authUrl: authUrl.toString() };
    }

    if (provider === 'notion') {
      const clientId = this.config.get<string>('NOTION_CLIENT_ID', '').trim();
      if (!clientId) {
        throw new BadRequestException('Missing NOTION_CLIENT_ID');
      }
      const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('owner', 'user');
      authUrl.searchParams.set('state', state);
      return { provider, authUrl: authUrl.toString() };
    }

    if (provider === 'linear') {
      const clientId = this.config.get<string>('LINEAR_CLIENT_ID', '').trim();
      if (!clientId) {
        throw new BadRequestException('Missing LINEAR_CLIENT_ID');
      }
      const authUrl = new URL('https://linear.app/oauth/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'read');
      authUrl.searchParams.set('state', state);
      return { provider, authUrl: authUrl.toString() };
    }

    const clientId = this.config.get<string>('DISCORD_CLIENT_ID', '').trim();
    if (!clientId) {
      throw new BadRequestException('Missing DISCORD_CLIENT_ID');
    }
    const authUrl = new URL('https://discord.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'identify');
    authUrl.searchParams.set('state', state);
    return { provider, authUrl: authUrl.toString() };
  }

  async handleOAuthCallback(provider: OAuthProvider, code: string, state: string) {
    const payload = this.verifyState(state);
    if (payload.provider !== provider) {
      throw new BadRequestException('OAuth state/provider mismatch');
    }
    if (Date.now() > payload.exp) {
      throw new BadRequestException('OAuth state expired');
    }

    const apiBaseUrl = this.config.get<string>('API_PUBLIC_URL', 'http://localhost:3000').replace(/\/+$/, '');
    const redirectUri = this.getProviderRedirectUri(provider, apiBaseUrl);

    if (provider === 'github') {
      const tokenData = await this.exchangeGitHubToken(code, redirectUri);
      const user = await this.fetchGitHubUser(tokenData.access_token);
      await this.upsertConnection({
        workspaceId: payload.workspaceId,
        createdById: payload.userId,
        provider: 'github',
        accountId: user.id ? String(user.id) : undefined,
        accountName: user.login || undefined,
        accessToken: tokenData.access_token,
        refreshToken: undefined,
        scopes: tokenData.scope ? tokenData.scope.split(',').map((s) => s.trim()).filter(Boolean) : [],
        metadata: { tokenType: tokenData.token_type || 'bearer' },
      });
      return {
        provider: 'github',
        accountName: user.login || 'github-user',
      };
    }

    if (provider === 'slack') {
      const tokenData = await this.exchangeSlackToken(code, redirectUri);
      await this.upsertConnection({
        workspaceId: payload.workspaceId,
        createdById: payload.userId,
        provider: 'slack',
        accountId: tokenData.team?.id || tokenData.authed_user?.id,
        accountName: tokenData.team?.name || tokenData.authed_user?.id || 'slack-team',
        accessToken: tokenData.access_token,
        refreshToken: undefined,
        scopes: tokenData.scope ? tokenData.scope.split(',').map((s) => s.trim()).filter(Boolean) : [],
        metadata: {
          team: tokenData.team || null,
          botUserId: tokenData.bot_user_id || null,
        },
      });
      return {
        provider: 'slack',
        accountName: tokenData.team?.name || 'slack-team',
      };
    }

    if (provider === 'google_drive') {
      const tokenData = await this.exchangeGoogleToken(code, redirectUri);
      const profile = await this.fetchGoogleProfile(tokenData.access_token);
      await this.upsertConnection({
        workspaceId: payload.workspaceId,
        createdById: payload.userId,
        provider: 'google_drive',
        accountId: profile.sub,
        accountName: profile.email || profile.name || 'google-user',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        scopes: tokenData.scope ? tokenData.scope.split(' ').filter(Boolean) : [],
        metadata: {
          tokenType: tokenData.token_type || 'Bearer',
        },
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
      });
      return {
        provider: 'google_drive',
        accountName: profile.email || profile.name || 'google-user',
      };
    }

    if (provider === 'jira') {
      const tokenData = await this.exchangeJiraToken(code, redirectUri);
      const resources = await this.fetchJiraAccessibleResources(tokenData.access_token);
      const primary = resources[0];
      if (!primary?.id) {
        throw new BadRequestException('No Jira cloud resource available for this account');
      }
      const me = await this.fetchJiraMyself(tokenData.access_token, primary.id);
      await this.upsertConnection({
        workspaceId: payload.workspaceId,
        createdById: payload.userId,
        provider: 'jira',
        accountId: me.accountId || primary.id,
        accountName: me.displayName || primary.name || 'jira-user',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        scopes: tokenData.scope ? tokenData.scope.split(' ').filter(Boolean) : [],
        metadata: {
          cloudId: primary.id,
          cloudName: primary.name || null,
          cloudUrl: primary.url || null,
        },
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
      });
      return {
        provider: 'jira',
        accountName: me.displayName || primary.name || 'jira-user',
      };
    }

    if (provider === 'notion') {
      const tokenData = await this.exchangeNotionToken(code, redirectUri);
      await this.upsertConnection({
        workspaceId: payload.workspaceId,
        createdById: payload.userId,
        provider: 'notion',
        accountId: tokenData.workspace_id || tokenData.bot_id,
        accountName: tokenData.workspace_name || tokenData.owner?.user?.name || 'notion-workspace',
        accessToken: tokenData.access_token,
        refreshToken: undefined,
        scopes: [],
        metadata: {
          workspaceId: tokenData.workspace_id || null,
          workspaceName: tokenData.workspace_name || null,
          botId: tokenData.bot_id || null,
        },
      });
      return {
        provider: 'notion',
        accountName: tokenData.workspace_name || 'notion-workspace',
      };
    }

    if (provider === 'linear') {
      const tokenData = await this.exchangeLinearToken(code, redirectUri);
      const viewer = await this.fetchLinearViewer(tokenData.access_token);
      await this.upsertConnection({
        workspaceId: payload.workspaceId,
        createdById: payload.userId,
        provider: 'linear',
        accountId: viewer.id,
        accountName: viewer.email || viewer.name || 'linear-user',
        accessToken: tokenData.access_token,
        refreshToken: undefined,
        scopes: [],
        metadata: {},
      });
      return {
        provider: 'linear',
        accountName: viewer.email || viewer.name || 'linear-user',
      };
    }

    const tokenData = await this.exchangeDiscordToken(code, redirectUri);
    const me = await this.fetchDiscordUser(tokenData.access_token);
    await this.upsertConnection({
      workspaceId: payload.workspaceId,
      createdById: payload.userId,
      provider: 'discord',
      accountId: me.id,
      accountName: me.username || 'discord-user',
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      scopes: tokenData.scope ? tokenData.scope.split(' ').filter(Boolean) : [],
      metadata: {},
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
    });
    return {
      provider: 'discord',
      accountName: me.username || 'discord-user',
    };
  }

  async disconnect(name: OAuthProvider, userId: string, workspaceId?: string) {
    const wsId = await this.resolveWorkspaceId(userId, workspaceId);
    const existing = await this.prisma.integrationConnection.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId: wsId,
          provider: name,
        },
      },
    });
    if (!existing) {
      return { provider: name, disconnected: false, message: 'No connection found' };
    }
    await this.prisma.integrationConnection.update({
      where: { id: existing.id },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date(),
      },
    });
    return { provider: name, disconnected: true };
  }

  private getProviderRedirectUri(provider: OAuthProvider, apiBaseUrl: string): string {
    const envKeyMap: Record<OAuthProvider, string> = {
      github: 'GITHUB_REDIRECT_URI',
      slack: 'SLACK_REDIRECT_URI',
      google_drive: 'GOOGLE_REDIRECT_URI',
      jira: 'JIRA_REDIRECT_URI',
      notion: 'NOTION_REDIRECT_URI',
      linear: 'LINEAR_REDIRECT_URI',
      discord: 'DISCORD_REDIRECT_URI',
    };
    const envKey = envKeyMap[provider];
    const fromEnv = this.config.get<string>(envKey, '').trim();
    if (fromEnv) {
      return fromEnv;
    }
    return `${apiBaseUrl}/api/integrations/${provider}/callback`;
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string): Promise<string> {
    if (workspaceId) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });
      if (!member) {
        throw new ForbiddenException('No access to workspace');
      }
      return workspaceId;
    }

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      select: { workspaceId: true },
    });
    if (!membership?.workspaceId) {
      throw new BadRequestException('No workspace found for user');
    }
    return membership.workspaceId;
  }

  private async upsertConnection(params: {
    workspaceId: string;
    createdById: string;
    provider: IntegrationName;
    accountId?: string;
    accountName?: string;
    accessToken: string;
    refreshToken?: string;
    scopes: string[];
    metadata: Record<string, unknown>;
    expiresAt?: Date;
  }) {
    return this.prisma.integrationConnection.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: params.workspaceId,
          provider: params.provider,
        },
      },
      create: {
        workspaceId: params.workspaceId,
        createdById: params.createdById,
        provider: params.provider,
        status: 'connected',
        accountId: params.accountId,
        accountName: params.accountName,
        accessTokenEnc: this.encrypt(params.accessToken),
        refreshTokenEnc: params.refreshToken ? this.encrypt(params.refreshToken) : null,
        scopes: params.scopes,
        metadata: params.metadata as any,
        disconnectedAt: null,
        expiresAt: params.expiresAt || null,
      },
      update: {
        status: 'connected',
        accountId: params.accountId,
        accountName: params.accountName,
        accessTokenEnc: this.encrypt(params.accessToken),
        refreshTokenEnc: params.refreshToken ? this.encrypt(params.refreshToken) : null,
        scopes: params.scopes,
        metadata: params.metadata as any,
        disconnectedAt: null,
        expiresAt: params.expiresAt || null,
      },
    });
  }

  private async getTokenFromDb(provider: IntegrationName, workspaceId: string): Promise<string | null> {
    const row = await this.prisma.integrationConnection.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId,
          provider,
        },
      },
    });
    if (!row || row.status !== 'connected') {
      return null;
    }
    try {
      return this.decrypt(row.accessTokenEnc);
    } catch {
      return null;
    }
  }

  private signState(payload: {
    provider: OAuthProvider;
    userId: string;
    workspaceId: string;
    exp: number;
  }): string {
    const secret = this.config.get<string>('JWT_SECRET', 'soothsayer-dev');
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', secret).update(encoded).digest('base64url');
    return `${encoded}.${sig}`;
  }

  private verifyState(state: string): {
    provider: OAuthProvider;
    userId: string;
    workspaceId: string;
    exp: number;
  } {
    const [encoded, sig] = state.split('.');
    if (!encoded || !sig) {
      throw new BadRequestException('Invalid OAuth state');
    }
    const secret = this.config.get<string>('JWT_SECRET', 'soothsayer-dev');
    const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
    if (expected !== sig) {
      throw new BadRequestException('Invalid OAuth state signature');
    }
    const raw = Buffer.from(encoded, 'base64url').toString('utf8');
    return JSON.parse(raw);
  }

  private encryptionKey(): Buffer {
    const keyMaterial =
      this.config.get<string>('INTEGRATIONS_ENCRYPTION_KEY', '').trim() ||
      this.config.get<string>('JWT_SECRET', 'soothsayer-dev-jwt');
    return createHash('sha256').update(keyMaterial).digest();
  }

  private encrypt(plain: string): string {
    const key = this.encryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  private decrypt(encoded: string): string {
    const [ivPart, tagPart, dataPart] = encoded.split('.');
    if (!ivPart || !tagPart || !dataPart) {
      throw new Error('Invalid encrypted token payload');
    }
    const key = this.encryptionKey();
    const iv = Buffer.from(ivPart, 'base64url');
    const tag = Buffer.from(tagPart, 'base64url');
    const data = Buffer.from(dataPart, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString('utf8');
  }

  private async exchangeGitHubToken(code: string, redirectUri: string): Promise<{
    access_token: string;
    token_type?: string;
    scope?: string;
  }> {
    const clientId = this.config.get<string>('GITHUB_CLIENT_ID', '').trim();
    const clientSecret = this.config.get<string>('GITHUB_CLIENT_SECRET', '').trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Missing GitHub OAuth client credentials');
    }

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const body = (await res.json()) as {
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !body.access_token) {
      throw new BadRequestException(
        body.error_description || body.error || `GitHub token exchange failed (${res.status})`,
      );
    }
    return {
      access_token: body.access_token,
      token_type: body.token_type,
      scope: body.scope,
    };
  }

  private async fetchGitHubUser(token: string): Promise<{ id?: number; login?: string }> {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'soothsayer',
      },
    });
    const body = (await res.json()) as { id?: number; login?: string; message?: string };
    if (!res.ok) {
      throw new BadRequestException(body.message || `GitHub user fetch failed (${res.status})`);
    }
    return body;
  }

  private async exchangeSlackToken(code: string, redirectUri: string): Promise<{
    ok?: boolean;
    access_token: string;
    scope?: string;
    team?: { id?: string; name?: string };
    authed_user?: { id?: string };
    bot_user_id?: string;
    error?: string;
  }> {
    const clientId = this.config.get<string>('SLACK_CLIENT_ID', '').trim();
    const clientSecret = this.config.get<string>('SLACK_CLIENT_SECRET', '').trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Missing Slack OAuth client credentials');
    }

    const form = new URLSearchParams();
    form.set('client_id', clientId);
    form.set('client_secret', clientSecret);
    form.set('code', code);
    form.set('redirect_uri', redirectUri);

    const res = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      access_token?: string;
      scope?: string;
      team?: { id?: string; name?: string };
      authed_user?: { id?: string };
      bot_user_id?: string;
      error?: string;
    };
    if (!res.ok || !body.ok || !body.access_token) {
      throw new BadRequestException(body.error || `Slack token exchange failed (${res.status})`);
    }
    return {
      ok: body.ok,
      access_token: body.access_token,
      scope: body.scope,
      team: body.team,
      authed_user: body.authed_user,
      bot_user_id: body.bot_user_id,
      error: body.error,
    };
  }

  private async exchangeGoogleToken(code: string, redirectUri: string): Promise<{
    access_token: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    refresh_token?: string;
  }> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID', '').trim();
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET', '').trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Missing Google OAuth client credentials');
    }

    const form = new URLSearchParams();
    form.set('client_id', clientId);
    form.set('client_secret', clientSecret);
    form.set('code', code);
    form.set('grant_type', 'authorization_code');
    form.set('redirect_uri', redirectUri);

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const body = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !body.access_token) {
      throw new BadRequestException(
        body.error_description || body.error || `Google token exchange failed (${res.status})`,
      );
    }
    return body as {
      access_token: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
      refresh_token?: string;
    };
  }

  private async exchangeJiraToken(code: string, redirectUri: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  }> {
    const clientId = this.config.get<string>('JIRA_CLIENT_ID', '').trim();
    const clientSecret = this.config.get<string>('JIRA_CLIENT_SECRET', '').trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Missing Jira OAuth client credentials');
    }

    const res = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const body = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !body.access_token) {
      throw new BadRequestException(body.error_description || body.error || `Jira token exchange failed (${res.status})`);
    }
    return {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_in: body.expires_in,
      scope: body.scope,
    };
  }

  private async fetchJiraAccessibleResources(token: string): Promise<Array<{ id?: string; name?: string; url?: string }>> {
    const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const body = (await res.json()) as Array<{ id?: string; name?: string; url?: string }> | { message?: string };
    if (!res.ok || !Array.isArray(body)) {
      const message = !Array.isArray(body) ? body.message : undefined;
      throw new BadRequestException(message || `Jira accessible resources fetch failed (${res.status})`);
    }
    return body;
  }

  private async fetchJiraMyself(
    token: string,
    cloudId: string,
  ): Promise<{ accountId?: string; displayName?: string; emailAddress?: string }> {
    const res = await fetch(`https://api.atlassian.com/ex/jira/${encodeURIComponent(cloudId)}/rest/api/3/myself`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const body = (await res.json()) as {
      accountId?: string;
      displayName?: string;
      emailAddress?: string;
      errorMessages?: string[];
      message?: string;
    };
    if (!res.ok) {
      throw new BadRequestException(
        body.errorMessages?.[0] || body.message || `Jira profile fetch failed (${res.status})`,
      );
    }
    return body;
  }

  private async fetchGoogleProfile(token: string): Promise<{ sub?: string; email?: string; name?: string }> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { sub?: string; email?: string; name?: string; error?: string };
    if (!res.ok) {
      throw new BadRequestException(body.error || `Google profile fetch failed (${res.status})`);
    }
    return body;
  }

  private async exchangeNotionToken(code: string, redirectUri: string): Promise<{
    access_token: string;
    workspace_name?: string;
    workspace_id?: string;
    bot_id?: string;
    owner?: { user?: { name?: string } };
  }> {
    const clientId = this.config.get<string>('NOTION_CLIENT_ID', '').trim();
    const clientSecret = this.config.get<string>('NOTION_CLIENT_SECRET', '').trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Missing Notion OAuth client credentials');
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    const body = (await res.json()) as {
      access_token?: string;
      workspace_name?: string;
      workspace_id?: string;
      bot_id?: string;
      owner?: { user?: { name?: string } };
      error?: string;
      message?: string;
    };
    if (!res.ok || !body.access_token) {
      throw new BadRequestException(body.message || body.error || `Notion token exchange failed (${res.status})`);
    }
    return body as {
      access_token: string;
      workspace_name?: string;
      workspace_id?: string;
      bot_id?: string;
      owner?: { user?: { name?: string } };
    };
  }

  private async exchangeLinearToken(code: string, redirectUri: string): Promise<{ access_token: string }> {
    const clientId = this.config.get<string>('LINEAR_CLIENT_ID', '').trim();
    const clientSecret = this.config.get<string>('LINEAR_CLIENT_SECRET', '').trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Missing Linear OAuth client credentials');
    }

    const res = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const body = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
    if (!res.ok || !body.access_token) {
      throw new BadRequestException(
        body.error_description || body.error || `Linear token exchange failed (${res.status})`,
      );
    }
    return { access_token: body.access_token };
  }

  private async fetchLinearViewer(token: string): Promise<{ id?: string; name?: string; email?: string }> {
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ viewer { id name email } }' }),
    });
    const body = (await res.json()) as {
      data?: { viewer?: { id?: string; name?: string; email?: string } };
      errors?: Array<{ message?: string }>;
    };
    if (!res.ok || body.errors?.length) {
      throw new BadRequestException(body.errors?.[0]?.message || `Linear viewer fetch failed (${res.status})`);
    }
    return body.data?.viewer || {};
  }

  private async exchangeDiscordToken(code: string, redirectUri: string): Promise<{
    access_token: string;
    refresh_token?: string;
    scope?: string;
    expires_in?: number;
  }> {
    const clientId = this.config.get<string>('DISCORD_CLIENT_ID', '').trim();
    const clientSecret = this.config.get<string>('DISCORD_CLIENT_SECRET', '').trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Missing Discord OAuth client credentials');
    }

    const form = new URLSearchParams();
    form.set('client_id', clientId);
    form.set('client_secret', clientSecret);
    form.set('grant_type', 'authorization_code');
    form.set('code', code);
    form.set('redirect_uri', redirectUri);

    const res = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const body = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      scope?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !body.access_token) {
      throw new BadRequestException(
        body.error_description || body.error || `Discord token exchange failed (${res.status})`,
      );
    }
    return body as { access_token: string; refresh_token?: string; scope?: string; expires_in?: number };
  }

  private async fetchDiscordUser(token: string): Promise<{ id?: string; username?: string }> {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { id?: string; username?: string; message?: string };
    if (!res.ok) {
      throw new BadRequestException(body.message || `Discord user fetch failed (${res.status})`);
    }
    return body;
  }

  private async testSlack(workspaceId: string): Promise<IntegrationStatus> {
    const token =
      (await this.getTokenFromDb('slack', workspaceId)) ||
      this.config.get<string>('SLACK_BOT_TOKEN', '').trim();
    if (!token) {
      return {
        name: 'slack',
        configured: false,
        connected: false,
        message: 'Not connected. Use OAuth Connect or set SLACK_BOT_TOKEN',
      };
    }

    try {
      const res = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: '',
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; team?: string };
      if (!res.ok || !body.ok) {
        return {
          name: 'slack',
          configured: true,
          connected: false,
          message: body.error || `Slack auth failed (${res.status})`,
        };
      }
      return {
        name: 'slack',
        configured: true,
        connected: true,
        message: `Connected${body.team ? ` (${body.team})` : ''}`,
      };
    } catch (error) {
      return {
        name: 'slack',
        configured: true,
        connected: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async testGitHub(workspaceId: string): Promise<IntegrationStatus> {
    const token =
      (await this.getTokenFromDb('github', workspaceId)) ||
      this.config.get<string>('GITHUB_TOKEN', '').trim();
    if (!token) {
      return {
        name: 'github',
        configured: false,
        connected: false,
        message: 'Not connected. Use OAuth Connect or set GITHUB_TOKEN',
      };
    }

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'soothsayer',
        },
      });
      const body = (await res.json()) as { login?: string; message?: string };
      if (!res.ok) {
        return {
          name: 'github',
          configured: true,
          connected: false,
          message: body.message || `GitHub auth failed (${res.status})`,
        };
      }
      return {
        name: 'github',
        configured: true,
        connected: true,
        message: `Connected (${body.login || 'user'})`,
      };
    } catch (error) {
      return {
        name: 'github',
        configured: true,
        connected: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async testGoogleDrive(workspaceId: string): Promise<IntegrationStatus> {
    const token =
      (await this.getTokenFromDb('google_drive', workspaceId)) ||
      this.config.get<string>('GOOGLE_DRIVE_ACCESS_TOKEN', '').trim();
    if (!token) {
      return {
        name: 'google_drive',
        configured: false,
        connected: false,
        message: 'Not connected. Use OAuth Connect or set GOOGLE_DRIVE_ACCESS_TOKEN',
      };
    }

    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = (await res.json()) as {
        user?: { emailAddress?: string; displayName?: string };
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          name: 'google_drive',
          configured: true,
          connected: false,
          message: body.error?.message || `Google Drive auth failed (${res.status})`,
        };
      }
      const user = body.user?.emailAddress || body.user?.displayName || 'drive-user';
      return {
        name: 'google_drive',
        configured: true,
        connected: true,
        message: `Connected (${user})`,
      };
    } catch (error) {
      return {
        name: 'google_drive',
        configured: true,
        connected: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async testJira(workspaceId: string): Promise<IntegrationStatus> {
    const connection = await this.prisma.integrationConnection.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId,
          provider: 'jira',
        },
      },
    });
    if (connection?.status === 'connected') {
      try {
        const token = this.decrypt(connection.accessTokenEnc);
        const metadata = (connection.metadata || {}) as Record<string, unknown>;
        const cloudIdValue = metadata.cloudId;
        const cloudId = typeof cloudIdValue === 'string' ? cloudIdValue : '';
        if (!cloudId) {
          return {
            name: 'jira',
            configured: true,
            connected: false,
            message: 'Connected Jira token missing cloudId metadata. Reconnect Jira OAuth.',
          };
        }
        const me = await this.fetchJiraMyself(token, cloudId);
        return {
          name: 'jira',
          configured: true,
          connected: true,
          message: `Connected (${me.displayName || me.emailAddress || 'jira-user'})`,
        };
      } catch (error) {
        return {
          name: 'jira',
          configured: true,
          connected: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    const baseUrl = this.config.get<string>('JIRA_BASE_URL', '').trim().replace(/\/+$/, '');
    const email = this.config.get<string>('JIRA_EMAIL', '').trim();
    const token = this.config.get<string>('JIRA_API_TOKEN', '').trim();
    if (!baseUrl || !email || !token) {
      return {
        name: 'jira',
        configured: false,
        connected: false,
        message: 'Missing JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN',
      };
    }

    try {
      const auth = Buffer.from(`${email}:${token}`).toString('base64');
      const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      });
      const body = (await res.json()) as { displayName?: string; errorMessages?: string[] };
      if (!res.ok) {
        return {
          name: 'jira',
          configured: true,
          connected: false,
          message: body.errorMessages?.[0] || `Jira auth failed (${res.status})`,
        };
      }
      return {
        name: 'jira',
        configured: true,
        connected: true,
        message: `Connected (${body.displayName || email})`,
      };
    } catch (error) {
      return {
        name: 'jira',
        configured: true,
        connected: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async testLinear(workspaceId: string): Promise<IntegrationStatus> {
    const token =
      (await this.getTokenFromDb('linear', workspaceId)) ||
      this.config.get<string>('LINEAR_API_TOKEN', '').trim();
    if (!token) {
      return {
        name: 'linear',
        configured: false,
        connected: false,
        message: 'Not connected. Use OAuth Connect or set LINEAR_API_TOKEN',
      };
    }

    try {
      const res = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          Authorization: token.startsWith('lin_api_') ? token : `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: '{ viewer { id name email } }' }),
      });
      const body = (await res.json()) as {
        data?: { viewer?: { name?: string; email?: string } };
        errors?: Array<{ message?: string }>;
      };
      if (!res.ok || body.errors?.length) {
        return {
          name: 'linear',
          configured: true,
          connected: false,
          message: body.errors?.[0]?.message || `Linear auth failed (${res.status})`,
        };
      }
      const viewer = body.data?.viewer;
      return {
        name: 'linear',
        configured: true,
        connected: true,
        message: `Connected (${viewer?.email || viewer?.name || 'viewer'})`,
      };
    } catch (error) {
      return {
        name: 'linear',
        configured: true,
        connected: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async testNotion(workspaceId: string): Promise<IntegrationStatus> {
    const token =
      (await this.getTokenFromDb('notion', workspaceId)) ||
      this.config.get<string>('NOTION_API_TOKEN', '').trim();
    if (!token) {
      return {
        name: 'notion',
        configured: false,
        connected: false,
        message: 'Not connected. Use OAuth Connect or set NOTION_API_TOKEN',
      };
    }

    try {
      const res = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          Accept: 'application/json',
        },
      });
      const body = (await res.json()) as {
        name?: string;
        bot?: { owner?: { user?: { name?: string } } };
        message?: string;
      };
      if (!res.ok) {
        return {
          name: 'notion',
          configured: true,
          connected: false,
          message: body.message || `Notion auth failed (${res.status})`,
        };
      }
      return {
        name: 'notion',
        configured: true,
        connected: true,
        message: `Connected (${body.name || body.bot?.owner?.user?.name || 'notion-user'})`,
      };
    } catch (error) {
      return {
        name: 'notion',
        configured: true,
        connected: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async testDiscord(workspaceId: string): Promise<IntegrationStatus> {
    const token =
      (await this.getTokenFromDb('discord', workspaceId)) ||
      this.config.get<string>('DISCORD_BOT_TOKEN', '').trim();
    if (!token) {
      return {
        name: 'discord',
        configured: false,
        connected: false,
        message: 'Not connected. Use OAuth Connect or set DISCORD_BOT_TOKEN',
      };
    }

    try {
      const authHeader =
        token.startsWith('Bot ') || token.startsWith('mfa.') || token.includes('.')
          ? token.startsWith('Bot ')
            ? token
            : `Bot ${token}`
          : `Bearer ${token}`;
      const res = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: authHeader,
        },
      });
      const body = (await res.json()) as { username?: string; message?: string };
      if (!res.ok) {
        return {
          name: 'discord',
          configured: true,
          connected: false,
          message: body.message || `Discord auth failed (${res.status})`,
        };
      }
      return {
        name: 'discord',
        configured: true,
        connected: true,
        message: `Connected (${body.username || 'bot'})`,
      };
    } catch (error) {
      return {
        name: 'discord',
        configured: true,
        connected: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
