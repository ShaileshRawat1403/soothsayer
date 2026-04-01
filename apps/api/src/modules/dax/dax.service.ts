import {
  BadRequestException,
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import type {
  DaxApprovalRecord,
  DaxApprovalsResponse,
  DaxArtifactRecord,
  DaxCreateRunRequest,
  DaxCreateRunResponse,
  DaxHealthResponse,
  DaxPendingApprovalSummary,
  DaxRunListItem,
  DaxRunOverviewResponse,
  DaxResolveApprovalRequest,
  DaxResolveApprovalResponse,
  DaxRunSnapshot,
  DaxRunSummary,
  SoothsayerOverview,
  SoothsayerRunDetail,
  SoothsayerApprovalDetail,
  DaxRecoverySummary,
  DaxRecoveryResult,
} from './dax.types';

@Injectable()
export class DaxService {
  private readonly logger = new Logger(DaxService.name);

  constructor(private readonly configService: ConfigService) {}

  async createRun(user: CurrentUser, payload: DaxCreateRunRequest): Promise<DaxCreateRunResponse> {
    const normalizedRepoPath = this.normalizeRepoPath(payload.intent.repoPath);
    const targetingMode = normalizedRepoPath ? 'explicit_repo_path' : 'default_cwd';

    if (!normalizedRepoPath) {
      this.logger.warn(
        `Creating DAX run without explicit repoPath; falling back to DAX cwd (user=${user.id})`
      );
    }

    const headers = new Headers();
    if (normalizedRepoPath) {
      headers.set('x-dax-directory', encodeURIComponent(normalizedRepoPath));
    }

    return this.requestJson<DaxCreateRunResponse>('/runs', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        intent: {
          ...payload.intent,
          ...(normalizedRepoPath ? { repoPath: normalizedRepoPath } : {}),
        },
        metadata: {
          ...payload.metadata,
          initiatedBy: payload.metadata?.initiatedBy ?? user.id,
          source: 'soothsayer',
          targeting: {
            mode: targetingMode,
            ...(normalizedRepoPath ? { repoPath: normalizedRepoPath } : {}),
          },
        },
      }),
    });
  }

  async getRun(runId: string, repoPath?: string): Promise<SoothsayerRunDetail> {
    return this.requestJson<SoothsayerRunDetail>(`/soothsayer/runs/${encodeURIComponent(runId)}`, {
      headers: this.buildTargetHeaders(repoPath),
    });
  }

  async getRunSnapshot(runId: string, repoPath?: string): Promise<DaxRunSnapshot> {
    const soothsayerDetail = await this.getRun(runId, repoPath);
    return this.adaptSoothsayerRunDetailToSnapshot(soothsayerDetail);
  }

  private adaptSoothsayerRunDetailToSnapshot(detail: SoothsayerRunDetail): DaxRunSnapshot {
    return {
      schemaVersion: 'v1',
      authority: 'dax',
      sourceSystem: (detail.sourceSystem as DaxRunSnapshot['sourceSystem']) || 'dax',
      runId: detail.runId,
      status: detail.status,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      startedAt: detail.startedAt,
      completedAt: detail.completedAt,
      title: detail.title,
      currentStep: detail.progress
        ? {
            stepId: detail.progress.currentStep,
            status: 'running' as const,
            title: detail.progress.currentStepLabel || detail.progress.currentStep,
            detail: detail.progress.currentStepDescription,
          }
        : undefined,
      pendingApprovalCount: detail.approvals?.pending ?? 0,
      trust: detail.trust
        ? {
            score: undefined,
            posture: detail.trust.posture as 'low' | 'guarded' | 'moderate' | 'strong' | undefined,
            blocked: detail.trust.blocked,
            reasons: detail.trust.postureDescription
              ? [detail.trust.postureDescription]
              : undefined,
          }
        : undefined,
      artifactSummary: detail.artifacts
        ? {
            total: detail.artifacts.total,
            byType: undefined,
            latestArtifactIds: detail.artifacts.latestIds,
          }
        : undefined,
      executionProfile: detail.metadata?.executionProfile
        ? {
            personaId: (detail.metadata.executionProfile as any).personaId || 'standard',
            provider: (detail.metadata.executionProfile as any).provider || 'dax',
            model: (detail.metadata.executionProfile as any).model || 'system-default',
            approvalMode: (detail.metadata.executionProfile as any).approvalMode || 'strict',
            riskLevel: (detail.metadata.executionProfile as any).riskLevel || 'medium',
            isFallback: !!(detail.metadata.executionProfile as any).isFallback,
            fallbackReason: (detail.metadata.executionProfile as any).fallbackReason,
          }
        : detail.workflow
          ? {
              personaId: 'workflow-managed',
              provider: 'workflow-managed',
              model: 'workflow-managed',
              approvalMode: (detail.workflow as any).approvalMode || 'strict',
              riskLevel: (detail.workflow as any).riskLevel || 'medium',
              isFallback: false,
            }
          : undefined,
      lastEvent: detail.lastEvent
        ? {
            eventId: detail.lastEvent.eventId,
            sequence: detail.lastEvent.sequence,
            cursor: detail.lastEvent.cursor,
            timestamp: detail.lastEvent.timestamp,
          }
        : null,
      failureCode: detail.failureCode,
      failureLabel: detail.failureLabel,
      failureDescription: detail.failureDescription,
    };
  }

  async getApprovals(runId: string, repoPath?: string): Promise<SoothsayerApprovalDetail[]> {
    return this.requestJson<SoothsayerApprovalDetail[]>(
      `/soothsayer/runs/${encodeURIComponent(runId)}/approvals`,
      {
        headers: this.buildTargetHeaders(repoPath),
      }
    );
  }

  async resolveApproval(
    runId: string,
    approvalId: string,
    payload: DaxResolveApprovalRequest,
    repoPath?: string
  ): Promise<DaxResolveApprovalResponse> {
    return this.requestJson<DaxResolveApprovalResponse>(
      `/soothsayer/runs/${encodeURIComponent(runId)}/approvals/${encodeURIComponent(approvalId)}`,
      {
        method: 'POST',
        headers: this.buildTargetHeaders(repoPath),
        body: JSON.stringify(payload),
      }
    );
  }

  async getSummary(runId: string, repoPath?: string): Promise<DaxRunSummary> {
    // Note: If you want to use the new soothsayer summary, there might not be a /soothsayer/runs/:id/summary route.
    // However, getRunDetail provides a lot of this information. DAX still has generic routes.
    return this.requestJson<DaxRunSummary>(`/runs/${encodeURIComponent(runId)}/summary`, {
      headers: this.buildTargetHeaders(repoPath),
    });
  }

  async getArtifacts(runId: string, repoPath?: string): Promise<DaxArtifactRecord[]> {
    return this.requestJson<DaxArtifactRecord[]>(`/runs/${encodeURIComponent(runId)}/artifacts`, {
      headers: this.buildTargetHeaders(repoPath),
    });
  }

  async getHealth(): Promise<DaxHealthResponse> {
    const response = await this.requestJson<{ healthy: true; version: string }>(`/global/health`);
    return {
      healthy: true,
      version: response.version,
      baseUrl: this.configService.get<string>('DAX_BASE_URL'),
      checkedAt: new Date().toISOString(),
    };
  }

  async getOverview(repoPath?: string): Promise<SoothsayerOverview> {
    return this.requestJson<SoothsayerOverview>('/soothsayer/overview', {
      headers: this.buildTargetHeaders(repoPath),
    });
  }

  async getRecoverySummary(runId: string, repoPath?: string): Promise<DaxRecoverySummary> {
    return this.requestJson<DaxRecoverySummary>(
      `/soothsayer/runs/${encodeURIComponent(runId)}/recovery`,
      {
        headers: this.buildTargetHeaders(repoPath),
      }
    );
  }

  async recoverRun(runId: string, repoPath?: string): Promise<DaxRecoveryResult> {
    return this.requestJson<DaxRecoveryResult>(
      `/soothsayer/runs/${encodeURIComponent(runId)}/recover`,
      {
        method: 'POST',
        headers: this.buildTargetHeaders(repoPath),
      }
    );
  }

  async getEventStream(runId: string, cursor?: string, repoPath?: string): Promise<Response> {
    const params = new URLSearchParams();
    if (cursor) {
      params.set('cursor', cursor);
    }

    const path = `/runs/${encodeURIComponent(runId)}/events${
      params.size > 0 ? `?${params.toString()}` : ''
    }`;

    return this.requestRaw(path, {
      method: 'GET',
      headers: {
        ...Object.fromEntries(this.buildTargetHeaders(repoPath).entries()),
        Accept: 'text/event-stream',
      },
      timeoutMs: 0,
    });
  }

  async getApprovalsResponse(runId: string, repoPath?: string): Promise<DaxApprovalsResponse> {
    const approvals = await this.getApprovals(runId, repoPath);
    return {
      runId,
      approvals: approvals.map((a) => ({
        approvalId: a.approvalId,
        runId: a.runId,
        type: a.type as DaxApprovalRecord['type'],
        status: a.status as DaxApprovalRecord['status'],
        risk: a.risk as DaxApprovalRecord['risk'],
        title: a.titleEnriched || a.title,
        reason: a.reason,
        context: {
          stepId: a.context?.stepId,
          filePath: a.context?.filePath,
          command: a.context?.command,
          toolName: a.context?.toolName,
          diffPreview: a.context?.diffPreview,
          notes: a.context?.notes,
        },
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    };
  }

  async getOverviewResponse(repoPath?: string): Promise<DaxRunOverviewResponse> {
    const overview = await this.getOverview(repoPath);

    const adaptWorkflowCard = (card: (typeof overview.activeRuns)[number]): DaxRunListItem => ({
      runId: card.runId,
      title: card.title,
      status: card.status,
      sourceSystem: 'soothsayer',
      sourceSurface: 'chat',
      createdAt: card.createdAt,
      updatedAt: card.completedAt || card.createdAt,
      startedAt: undefined,
      completedAt: card.completedAt,
      currentStep:
        card.progress.totalSteps > 0
          ? {
              stepId: card.progress.currentStep,
              status: 'running',
              title: card.progress.currentStepLabel || card.progress.currentStep,
            }
          : undefined,
      pendingApprovalCount: 0,
      targeting: undefined,
      workspaceId: undefined,
      projectId: undefined,
      chatId: undefined,
      workflowId: undefined,
      provider: undefined,
      model: undefined,
      terminalReason: card.terminalReason,
      terminalReasonLabel: card.terminalReasonLabel,
      failureCode: card.failureCode,
      failureLabel: card.failureLabel,
      failureDescription: card.failureDescription,
    });

    const adaptPendingApproval = (
      a: (typeof overview.pendingApprovals)[number]
    ): DaxPendingApprovalSummary => ({
      approvalId: a.approvalId,
      runId: a.runId,
      type: a.type as DaxPendingApprovalSummary['type'],
      risk: a.risk as DaxPendingApprovalSummary['risk'],
      title: a.titleEnriched || a.title,
      reason: a.reason,
      createdAt: a.createdAt,
      targeting: undefined,
      sourceSurface: 'chat',
      workspaceId: undefined,
      projectId: undefined,
    });

    return {
      activeRuns: overview.activeRuns.map(adaptWorkflowCard),
      recentRuns: overview.recentRuns.map(adaptWorkflowCard),
      pendingApprovals: overview.pendingApprovals.map(adaptPendingApproval),
    };
  }

  private async requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.requestRaw(path, init);
    return (await response.json()) as T;
  }

  private async requestRaw(
    path: string,
    init: RequestInit & { timeoutMs?: number } = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutMs =
      typeof init.timeoutMs === 'number'
        ? init.timeoutMs
        : this.configService.get<number>('DAX_REQUEST_TIMEOUT_MS', 30000);
    const baseUrl = this.configService.get<string>('DAX_BASE_URL');

    if (!baseUrl) {
      throw new ServiceUnavailableException('DAX_BASE_URL is not configured');
    }

    const targetUrl = new URL(path, this.ensureTrailingSlash(baseUrl)).toString();
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const timeout =
      timeoutMs > 0
        ? setTimeout(() => {
            controller.abort();
          }, timeoutMs)
        : undefined;

    try {
      const response = await fetch(targetUrl, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await this.readErrorMessage(response);
        throw this.mapHttpError(response.status, message);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GatewayTimeoutException(`DAX request timed out after ${timeoutMs}ms`);
      }
      if (
        error instanceof NotFoundException ||
        error instanceof BadGatewayException ||
        error instanceof GatewayTimeoutException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      this.logger.error(
        `DAX request failed for ${path}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new BadGatewayException('Failed to reach DAX');
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }

  private buildTargetHeaders(repoPath?: string): Headers {
    const normalizedRepoPath = this.normalizeRepoPath(repoPath);
    const headers = new Headers();
    if (normalizedRepoPath) {
      headers.set('x-dax-directory', encodeURIComponent(normalizedRepoPath));
    }
    return headers;
  }

  private normalizeRepoPath(repoPath?: string): string | undefined {
    if (!repoPath) {
      return undefined;
    }

    const trimmed = repoPath.trim();
    if (!trimmed) {
      return undefined;
    }

    const decoded = (() => {
      try {
        return decodeURIComponent(trimmed);
      } catch {
        return trimmed;
      }
    })();

    const normalized = path.resolve(decoded);
    if (!existsSync(normalized)) {
      throw new BadRequestException(`repoPath does not exist: ${normalized}`);
    }

    return path.normalize(normalized);
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const payload = (await response.json()) as { message?: string; error?: string };
        return payload.message || payload.error || `DAX request failed with ${response.status}`;
      }

      const text = await response.text();
      return text || `DAX request failed with ${response.status}`;
    } catch {
      return `DAX request failed with ${response.status}`;
    }
  }

  private mapHttpError(status: number, message: string) {
    if (status === 404) {
      return new NotFoundException(message);
    }
    if (status === 408 || status === 504) {
      return new GatewayTimeoutException(message);
    }
    if (status === 502 || status === 503) {
      return new ServiceUnavailableException(message);
    }
    if (status >= 400 && status < 500) {
      return new BadGatewayException(message);
    }
    if (status >= 500) {
      return new BadGatewayException(message);
    }
    return new InternalServerErrorException(message);
  }
}
