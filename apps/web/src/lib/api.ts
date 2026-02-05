import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
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
  (response) => response,
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
          
          const { accessToken, refreshToken: newRefreshToken, user } = response.data;
          useAuthStore.getState().login(user, accessToken, newRefreshToken);
          
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
    
    return Promise.reject(error);
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
  getProjects: (workspaceId: string) =>
    api.get(`/workspaces/${workspaceId}/projects`),
  getProject: (workspaceId: string, projectId: string) =>
    api.get(`/workspaces/${workspaceId}/projects/${projectId}`),
  createProject: (workspaceId: string, data: { name: string; description?: string }) =>
    api.post(`/workspaces/${workspaceId}/projects`, data),
  
  // Personas
  getPersonas: () => api.get('/personas'),
  getPersona: (id: string) => api.get(`/personas/${id}`),
  createPersona: (data: Record<string, unknown>) => api.post('/personas', data),
  updatePersona: (id: string, data: Record<string, unknown>) =>
    api.patch(`/personas/${id}`, data),
  deletePersona: (id: string) => api.delete(`/personas/${id}`),
  getRecommendedPersona: (context: string) =>
    api.post('/personas/recommend', { context }),
  
  // Conversations
  getConversations: (workspaceId: string) =>
    api.get(`/workspaces/${workspaceId}/conversations`),
  getConversation: (id: string) => api.get(`/conversations/${id}`),
  createConversation: (data: { workspaceId: string; title?: string; personaId?: string }) =>
    api.post('/conversations', data),
  deleteConversation: (id: string) => api.delete(`/conversations/${id}`),
  
  // Chat
  sendMessage: (conversationId: string, content: string) =>
    api.post(`/conversations/${conversationId}/messages`, { content }),
  
  // Commands
  getCommands: () => api.get('/commands'),
  executeCommand: (data: { command: string; workspaceId: string; projectId?: string }) =>
    api.post('/commands/execute', data),
  
  // Workflows
  getWorkflows: (workspaceId: string) =>
    api.get(`/workspaces/${workspaceId}/workflows`),
  getWorkflow: (id: string) => api.get(`/workflows/${id}`),
  createWorkflow: (data: Record<string, unknown>) => api.post('/workflows', data),
  updateWorkflow: (id: string, data: Record<string, unknown>) =>
    api.patch(`/workflows/${id}`, data),
  runWorkflow: (id: string, inputs?: Record<string, unknown>) =>
    api.post(`/workflows/${id}/run`, { inputs }),
  
  // Tools
  getTools: () => api.get('/tools'),
  getTool: (id: string) => api.get(`/tools/${id}`),
  
  // Analytics
  getAnalytics: (workspaceId: string, params?: Record<string, unknown>) =>
    api.get(`/workspaces/${workspaceId}/analytics`, { params }),
  getAuditLogs: (workspaceId: string, params?: Record<string, unknown>) =>
    api.get(`/workspaces/${workspaceId}/audit-logs`, { params }),
  
  // Files
  getFiles: (workspaceId: string, path?: string) =>
    api.get(`/workspaces/${workspaceId}/files`, { params: { path } }),
  uploadFile: (workspaceId: string, file: File, path?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (path) formData.append('path', path);
    return api.post(`/workspaces/${workspaceId}/files/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
