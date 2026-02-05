// Common DTOs and utility types

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// Sorting
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Date Range
export interface DateRangeParams {
  startDate?: Date;
  endDate?: Date;
}

// Search
export interface SearchParams {
  search?: string;
  searchFields?: string[];
}

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string; // Only in development
}

export interface ResponseMeta {
  requestId: string;
  timestamp: Date;
  duration: number;
}

// Batch Operations
export interface BatchOperationRequest<T> {
  operations: T[];
}

export interface BatchOperationResponse<T> {
  results: BatchOperationResult<T>[];
  successCount: number;
  failureCount: number;
}

export interface BatchOperationResult<T> {
  index: number;
  success: boolean;
  data?: T;
  error?: ApiError;
}

// Status Types
export type OperationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Resource Reference
export interface ResourceRef {
  id: string;
  type: string;
  name?: string;
}

// Timestamps
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeleteTimestamps extends Timestamps {
  deletedAt?: Date;
}

// User Reference
export interface UserRef {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

// Workspace Reference
export interface WorkspaceRef {
  id: string;
  name: string;
  slug: string;
}

// File Reference
export interface FileRef {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

// Health Check
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: Date;
  services: ServiceHealth[];
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  message?: string;
}

// WebSocket Types
export interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: Date;
  correlationId?: string;
}

export interface WebSocketError {
  code: string;
  message: string;
  retryable: boolean;
}

// Job Types
export interface JobInfo {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Notification Types
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

// Feature Flags
export interface FeatureFlags {
  enableWorkflows: boolean;
  enableAdvancedAnalytics: boolean;
  enableCustomPersonas: boolean;
  enableApiKeys: boolean;
  enableAuditLogs: boolean;
  maxWorkspacesPerOrg: number;
  maxProjectsPerWorkspace: number;
  maxConversationsPerProject: number;
}

// Rate Limit Info
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

// Export Format
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'markdown';

// Import Result
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
}
