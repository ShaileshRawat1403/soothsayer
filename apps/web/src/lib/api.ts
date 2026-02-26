import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

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
            user?: { id: string; email: string; name: string; role?: 'ADMIN' | 'MEMBER' | 'VIEWER' };
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
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  
  logout: () => api.post('/auth/logout'),
  
  // Workspaces
  getWorkspaces: () => api.get('/workspaces'),
  getWorkspace: (id: string) => api.get(`/workspaces/${id}`),
  createWorkspace: (data: { name: string; description?: string }) =>
    api.post('/workspaces', data),
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
  updatePersona: (id: string, data: Record<string, unknown>) =>
    api.patch(`/personas/${id}`, data),
  deletePersona: (id: string) => api.delete(`/personas/${id}`),
  getRecommendedPersona: (context: string) =>
    api.get('/personas/recommend', { params: { input: context } }),
  
  // Conversations
  getConversations: (workspaceId: string) =>
    api.get('/chat/conversations', { params: { workspaceId } }),
  getConversation: (id: string) => api.get(`/chat/conversations/${id}`),
  createConversation: (data: { workspaceId: string; title?: string; personaId: string }) =>
    api.post('/chat/conversations', data),
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
    },
  ) =>
    api.post(`/chat/conversations/${conversationId}/messages`, payload, {
      timeout: Number.isFinite(CHAT_TIMEOUT_MS) ? CHAT_TIMEOUT_MS : 600000,
      signal: options?.signal,
    }),
  
  // Commands
  getCommands: (workspaceId: string) => api.get('/commands', { params: { workspaceId } }),
  executeCommand: (commandId: string, data: { workspaceId: string; projectId?: string; parameters: Record<string, unknown> }) =>
    api.post(`/commands/${commandId}/execute`, data),
  
  // Workflows
  getWorkflows: () => api.get('/workflows'),
  getWorkflow: (id: string) => api.get(`/workflows/${id}`),
  
  // Tools
  getTools: () => api.get('/tools'),
  getTool: (id: string) => api.get(`/tools/${id}`),
  
  // Analytics
  getAnalytics: () => api.get('/analytics'),
  getAnalyticsById: (id: string) => api.get(`/analytics/${id}`),
  
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
};

export default api;
