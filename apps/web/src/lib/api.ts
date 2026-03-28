import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import type {
  DaxApprovalsResponse,
  DaxArtifactRecord,
  DaxCreateRunRequest,
  DaxCreateRunResponse,
  DaxHealthResponse,
  DaxRecoveryResult,
  DaxRecoverySummary,
  DaxRunOverviewResponse,
  DaxResolveApprovalRequest,
  DaxRunEvent,
  DaxRunSnapshot,
  DaxRunSummary,
  DaxStreamEvent,
} from '@/types/dax';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || '300000');
const CHAT_TIMEOUT_MS = Number(import.meta.env.VITE_CHAT_TIMEOUT_MS || '600000');

type WrappedResponse<T> = {
  success: boolean;
  data: T;
  error?: {
    message?: string;
  };
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number.isFinite(API_TIMEOUT_MS) ? API_TIMEOUT_MS : 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function resolveApiUrl(path: string): string {
  if (/^https?:\/\//.test(API_BASE_URL)) {
    const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return new URL(normalizedPath, normalizedBase).toString();
  }

  const normalizedBase = API_BASE_URL.startsWith('/') ? API_BASE_URL : `/${API_BASE_URL}`;
  return `${normalizedBase.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

function parseSseEventBlock(block: string): {
  event?: string;
  id?: string;
  data?: string;
} | null {
  const lines = block.split(/\r?\n/);
  let event: string | undefined;
  let id: string | undefined;
  const dataParts: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('id:')) {
      id = line.slice(3).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataParts.push(line.slice(5).trimStart());
    }
  }

  if (!event && !id && dataParts.length === 0) {
    return null;
  }

  return {
    event,
    id,
    data: dataParts.join('\n'),
  };
}

export async function streamDaxRunEvents(
  runId: string,
  options: {
    cursor?: string;
    repoPath?: string;
    signal?: AbortSignal;
    onOpen?: () => void;
    onEvent: (event: DaxStreamEvent) => void;
  }
): Promise<void> {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Authentication required');
  }

  const params = new URLSearchParams();
  if (options.cursor) {
    params.set('cursor', options.cursor);
  }
  if (options.repoPath) {
    params.set('repoPath', options.repoPath);
  }

  const response = await fetch(
    resolveApiUrl(
      `/dax/runs/${encodeURIComponent(runId)}/events${params.size ? `?${params.toString()}` : ''}`
    ),
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal: options.signal,
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to stream run events (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Run stream is unavailable');
  }

  options.onOpen?.();

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      const parsed = parseSseEventBlock(block);
      if (!parsed?.data || parsed.event === 'server.heartbeat') {
        continue;
      }

      const event = JSON.parse(parsed.data) as DaxRunEvent;
      options.onEvent({
        ...event,
        sseEvent: parsed.event,
        sseId: parsed.id,
      });
    }
  }
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    const payload = response.data as WrappedResponse<unknown>;
    if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
      response.data = payload.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          const payload = response.data as WrappedResponse<{
            accessToken: string;
            refreshToken: string;
            user?: {
              id: string;
              email: string;
              name: string;
              role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
            };
          }>;
          const refreshData = payload?.data ?? (response.data as typeof payload.data);
          const { accessToken, refreshToken: newRefreshToken } = refreshData;
          const currentUser = useAuthStore.getState().user;
          const loginUser =
            refreshData.user ??
            (currentUser
              ? currentUser
              : {
                  id: 'unknown',
                  email: 'unknown@local',
                  name: 'Unknown',
                  role: 'ADMIN' as const,
                });
          useAuthStore.getState().login(
            {
              ...loginUser,
              role: loginUser.role || 'ADMIN',
            },
            accessToken,
            newRefreshToken
          );

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          return api(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    const wrappedError = error.response?.data as WrappedResponse<unknown> | undefined;
    const errorMessage =
      wrappedError?.error?.message ||
      (typeof error.response?.data === 'object' && error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message) ||
      'Request failed';

    return Promise.reject(new Error(errorMessage));
  }
);

// API helper functions
export const apiHelpers = {
  // Auth
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),

  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),

  logout: () => api.post('/auth/logout'),

  // Workspaces
  getWorkspaces: () => api.get('/workspaces'),
  getWorkspace: (id: string) => api.get(`/workspaces/${id}`),
  createWorkspace: (data: { name: string; description?: string }) => api.post('/workspaces', data),
  updateWorkspace: (id: string, data: Partial<{ name: string; description: string }>) =>
    api.patch(`/workspaces/${id}`, data),
  deleteWorkspace: (id: string) => api.delete(`/workspaces/${id}`),

  // Projects
  getProjects: () => api.get('/projects'),
  getProject: (projectId: string) => api.get(`/projects/${projectId}`),

  // Personas
  getPersonas: (params?: {
    workspaceId?: string;
    category?: string;
    includeBuiltIn?: boolean;
    includeCustom?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get('/personas', { params }),
  getPersona: (id: string) => api.get(`/personas/${id}`),
  createPersona: (data: Record<string, unknown>) => api.post('/personas', data),
  updatePersona: (id: string, data: Record<string, unknown>) => api.patch(`/personas/${id}`, data),
  deletePersona: (id: string) => api.delete(`/personas/${id}`),
  getRecommendedPersona: (context: string) =>
    api.get('/personas/recommend', { params: { input: context } }),

  // Conversations
  getConversations: (workspaceId: string) =>
    api.get('/chat/conversations', { params: { workspaceId } }),
  getConversation: (id: string) => api.get(`/chat/conversations/${id}`),
  createConversation: (data: {
    workspaceId: string;
    title?: string;
    personaId: string;
    projectId?: string;
    repoPath?: string;
  }) => api.post('/chat/conversations', data),
  deleteConversation: (id: string) => api.delete(`/chat/conversations/${id}`),

  // Chat
  sendMessage: (
    conversationId: string,
    payload: {
      content: string;
      provider?: string;
      model?: string;
      systemPrompt?: string;
      fileContext?: string;
      fileName?: string;
    },
    options?: {
      signal?: AbortSignal;
    }
  ) =>
    api.post(`/chat/conversations/${conversationId}/messages`, payload, {
      timeout: Number.isFinite(CHAT_TIMEOUT_MS) ? CHAT_TIMEOUT_MS : 600000,
      signal: options?.signal,
    }),

  // Commands
  getCommands: (workspaceId: string) => api.get('/commands', { params: { workspaceId } }),
  executeCommand: (
    commandId: string,
    data: { workspaceId: string; projectId?: string; parameters: Record<string, unknown> }
  ) => api.post(`/commands/${commandId}/execute`, data),
  executeTerminalCommand: (data: { workspaceId: string; command: string; cwd?: string }) =>
    api.post('/commands/execute-terminal', data),

  // Workflows
  getWorkflows: () => api.get('/workflows'),
  getWorkflow: (id: string) => api.get(`/workflows/${id}`),
  createWorkflow: (payload: {
    workspaceId?: string;
    name: string;
    description?: string;
    trigger?: Record<string, unknown>;
    steps?: Array<Record<string, unknown>>;
    status?: 'draft' | 'active' | 'paused' | 'archived';
    templateCategory?: string;
  }) => api.post('/workflows', payload),
  updateWorkflow: (
    id: string,
    payload: {
      name?: string;
      description?: string;
      trigger?: Record<string, unknown>;
      steps?: Array<Record<string, unknown>>;
      status?: 'draft' | 'active' | 'paused' | 'archived';
    }
  ) => api.patch(`/workflows/${id}`, payload),
  bootstrapWorkflowTemplates: (workspaceId?: string) =>
    api.post('/workflows/bootstrap/templates', workspaceId ? { workspaceId } : {}),

  // Tools
  getTools: () => api.get('/tools'),
  getTool: (id: string) => api.get(`/tools/${id}`),

  // MCP
  getMcpHealth: () => api.get('/mcp/health'),
  callMcpTool: (name: string, args: Record<string, unknown> = {}) =>
    api.post('/mcp/tools/call', { name, arguments: args }),
  callMcpToolAsync: (name: string, args: Record<string, unknown> = {}) =>
    api.post('/mcp/tools/call-async', { name, arguments: args }),
  getMcpJobStatus: (jobId: string) => api.get(`/mcp/jobs/${jobId}`),

  // Integrations
  getIntegrationStatus: (workspaceId?: string) =>
    api.get('/integrations/status', {
      params: workspaceId ? { workspaceId } : undefined,
    }),
  getOAuthReadiness: () => api.get('/integrations/oauth-readiness'),
  testIntegration: (
    name: 'slack' | 'github' | 'google_drive' | 'jira' | 'linear' | 'notion' | 'discord',
    workspaceId?: string
  ) => api.post(`/integrations/${name}/test`, workspaceId ? { workspaceId } : {}),
  getIntegrationConnectUrl: (
    name: 'github' | 'slack' | 'google_drive' | 'jira' | 'notion' | 'linear' | 'discord',
    workspaceId?: string
  ) =>
    api.get(`/integrations/${name}/connect`, {
      params: workspaceId ? { workspaceId } : undefined,
    }),
  disconnectIntegration: (
    name: 'github' | 'slack' | 'google_drive' | 'jira' | 'notion' | 'linear' | 'discord',
    workspaceId?: string
  ) =>
    api.delete(`/integrations/${name}`, {
      params: workspaceId ? { workspaceId } : undefined,
    }),
  setIntegrationManualToken: (
    name: 'github' | 'slack' | 'google_drive' | 'jira' | 'notion' | 'linear' | 'discord',
    payload: {
      workspaceId?: string;
      accessToken: string;
      accountName?: string;
      cloudId?: string;
    }
  ) => api.post(`/integrations/${name}/manual`, payload),

  // Analytics
  getAnalytics: () => api.get('/analytics'),
  getAnalyticsById: (id: string) => api.get(`/analytics/${id}`),

  // Notifications
  getNotifications: (workspaceId: string, unreadOnly?: boolean) =>
    api.get('/notifications', { params: { workspaceId, unreadOnly } }),
  markNotificationAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllNotificationsAsRead: (workspaceId: string) =>
    api.patch('/notifications/read-all', null, { params: { workspaceId } }),

  // Global Health
  getGlobalHealth: () => api.get('/health'),

  // System Stats
  getSystemStats: () => api.get('/system/stats'),

  // Files
  getFiles: () => api.get('/files'),
  getFile: (id: string) => api.get(`/files/${id}`),
  uploadFile: (_workspaceId: string, file: File, path?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (_workspaceId) formData.append('workspaceId', _workspaceId);
    if (path) formData.append('path', path);
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // DAX
  getDaxHealth: () => api.get<DaxHealthResponse>('/dax/health'),
  getDaxOverview: (repoPath?: string) =>
    api.get<DaxRunOverviewResponse>('/dax/overview', {
      params: repoPath ? { repoPath } : undefined,
    }),
  createDaxRun: (payload: DaxCreateRunRequest) =>
    api.post<DaxCreateRunResponse>('/dax/runs', payload),
  getDaxRun: (runId: string, repoPath?: string) =>
    api.get<DaxRunSnapshot>(`/dax/runs/${runId}`, {
      params: repoPath ? { repoPath } : undefined,
    }),
  getDaxRunApprovals: (runId: string, repoPath?: string) =>
    api.get<DaxApprovalsResponse>(`/dax/runs/${runId}/approvals`, {
      params: repoPath ? { repoPath } : undefined,
    }),
  resolveDaxRunApproval: (
    runId: string,
    approvalId: string,
    payload: DaxResolveApprovalRequest,
    repoPath?: string
  ) =>
    api.post(`/dax/runs/${runId}/approvals/${approvalId}`, payload, {
      params: repoPath ? { repoPath } : undefined,
    }),
  getDaxRunSummary: (runId: string, repoPath?: string) =>
    api.get<DaxRunSummary>(`/dax/runs/${encodeURIComponent(runId)}/summary`, {
      params: { repoPath },
    }),
  getDaxRunArtifacts: (runId: string, repoPath?: string) =>
    api.get<DaxArtifactRecord[]>(`/dax/runs/${encodeURIComponent(runId)}/artifacts`, {
      params: { repoPath },
    }),
  getDaxRecoverySummary: (runId: string, repoPath?: string) =>
    api.get<DaxRecoverySummary>(`/dax/runs/${encodeURIComponent(runId)}/recovery`, {
      params: { repoPath },
    }),
  recoverDaxRun: (runId: string, repoPath?: string) =>
    api.post<DaxRecoveryResult>(`/dax/runs/${encodeURIComponent(runId)}/recover`, undefined, {
      params: { repoPath },
    }),
  getDaxBatchRecoveryStatus: (runIds: string[], repoPath?: string) =>
    api.post<Record<string, DaxRecoverySummary>>('/dax/runs/recovery-status', { runIds, repoPath }),
};

export default api;
