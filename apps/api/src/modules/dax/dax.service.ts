import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import type {
  DaxApprovalsResponse,
  DaxArtifactRecord,
  DaxCreateRunRequest,
  DaxCreateRunResponse,
  DaxResolveApprovalRequest,
  DaxResolveApprovalResponse,
  DaxRunSnapshot,
  DaxRunSummary,
} from './dax.types';

@Injectable()
export class DaxService {
  private readonly logger = new Logger(DaxService.name);

  constructor(private readonly configService: ConfigService) {}

  async createRun(user: CurrentUser, payload: DaxCreateRunRequest): Promise<DaxCreateRunResponse> {
    return this.requestJson<DaxCreateRunResponse>('/runs', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        metadata: {
          ...payload.metadata,
          initiatedBy: payload.metadata?.initiatedBy ?? user.id,
          source: 'soothsayer',
        },
      }),
    });
  }

  async getRun(runId: string): Promise<DaxRunSnapshot> {
    return this.requestJson<DaxRunSnapshot>(`/runs/${encodeURIComponent(runId)}`);
  }

  async getApprovals(runId: string): Promise<DaxApprovalsResponse> {
    return this.requestJson<DaxApprovalsResponse>(`/runs/${encodeURIComponent(runId)}/approvals`);
  }

  async resolveApproval(
    runId: string,
    approvalId: string,
    payload: DaxResolveApprovalRequest,
  ): Promise<DaxResolveApprovalResponse> {
    return this.requestJson<DaxResolveApprovalResponse>(
      `/runs/${encodeURIComponent(runId)}/approvals/${encodeURIComponent(approvalId)}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  }

  async getSummary(runId: string): Promise<DaxRunSummary> {
    return this.requestJson<DaxRunSummary>(`/runs/${encodeURIComponent(runId)}/summary`);
  }

  async getArtifacts(runId: string): Promise<DaxArtifactRecord[]> {
    return this.requestJson<DaxArtifactRecord[]>(`/runs/${encodeURIComponent(runId)}/artifacts`);
  }

  async getEventStream(runId: string, cursor?: string): Promise<Response> {
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
        Accept: 'text/event-stream',
      },
      timeoutMs: 0,
    });
  }

  private async requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.requestRaw(path, init);
    return (await response.json()) as T;
  }

  private async requestRaw(
    path: string,
    init: RequestInit & { timeoutMs?: number } = {},
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
        `DAX request failed for ${path}: ${error instanceof Error ? error.message : String(error)}`,
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
