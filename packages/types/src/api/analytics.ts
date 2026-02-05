import { AuditLog, AuditAction, ResourceType } from '../domain/policy';

// Dashboard Overview
export interface DashboardOverviewRequest {
  workspaceId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface DashboardOverviewResponse {
  period: { start: Date; end: Date };
  summary: DashboardSummary;
  trends: DashboardTrends;
  topItems: TopItems;
}

export interface DashboardSummary {
  totalConversations: number;
  totalMessages: number;
  totalCommands: number;
  totalWorkflowRuns: number;
  totalToolInvocations: number;
  activeUsers: number;
  avgResponseTime: number;
  overallSuccessRate: number;
}

export interface DashboardTrends {
  conversationsByDay: DailyCount[];
  commandsByDay: DailyCount[];
  workflowsByDay: DailyCount[];
  toolsByDay: DailyCount[];
  responseTimeByDay: DailyMetric[];
}

export interface DailyCount {
  date: string;
  count: number;
  change?: number; // Percentage change from previous day
}

export interface DailyMetric {
  date: string;
  value: number;
  change?: number;
}

export interface TopItems {
  personas: TopPersona[];
  tools: TopTool[];
  workflows: TopWorkflow[];
  commands: TopCommand[];
  users: TopUser[];
}

export interface TopPersona {
  id: string;
  name: string;
  usageCount: number;
  successRate: number;
}

export interface TopTool {
  id: string;
  name: string;
  invocations: number;
  avgLatency: number;
}

export interface TopWorkflow {
  id: string;
  name: string;
  runs: number;
  successRate: number;
}

export interface TopCommand {
  id: string;
  name: string;
  executions: number;
  successRate: number;
}

export interface TopUser {
  id: string;
  name: string;
  email: string;
  actions: number;
  lastActiveAt: Date;
}

// Usage Analytics
export interface UsageAnalyticsRequest {
  workspaceId: string;
  startDate?: Date;
  endDate?: Date;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface UsageAnalyticsResponse {
  period: { start: Date; end: Date };
  granularity: string;
  usage: UsageMetrics;
  breakdown: UsageBreakdown;
}

export interface UsageMetrics {
  apiCalls: number;
  aiTokensUsed: number;
  storageUsedMb: number;
  computeMinutes: number;
  uniqueUsers: number;
  activeSessions: number;
}

export interface UsageBreakdown {
  byFeature: FeatureUsage[];
  byUser: UserUsage[];
  byTime: TimeUsage[];
}

export interface FeatureUsage {
  feature: string;
  usage: number;
  percentage: number;
}

export interface UserUsage {
  userId: string;
  userName: string;
  usage: number;
  percentage: number;
}

export interface TimeUsage {
  timestamp: string;
  usage: number;
}

// Performance Analytics
export interface PerformanceAnalyticsRequest {
  workspaceId: string;
  startDate?: Date;
  endDate?: Date;
  component?: 'chat' | 'commands' | 'workflows' | 'tools';
}

export interface PerformanceAnalyticsResponse {
  period: { start: Date; end: Date };
  overall: PerformanceMetrics;
  byComponent: ComponentPerformance[];
  latencyDistribution: LatencyDistribution;
  errorAnalysis: ErrorAnalysis;
}

export interface PerformanceMetrics {
  avgLatencyMs: number;
  medianLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  throughput: number; // Requests per minute
}

export interface ComponentPerformance {
  component: string;
  metrics: PerformanceMetrics;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface LatencyDistribution {
  buckets: LatencyBucket[];
  outliers: OutlierInfo[];
}

export interface LatencyBucket {
  range: string;
  count: number;
  percentage: number;
}

export interface OutlierInfo {
  timestamp: Date;
  latencyMs: number;
  component: string;
  requestId: string;
}

export interface ErrorAnalysis {
  totalErrors: number;
  errorRate: number;
  byType: ErrorTypeCount[];
  byComponent: ComponentErrorCount[];
  recentErrors: RecentError[];
}

export interface ErrorTypeCount {
  type: string;
  count: number;
  percentage: number;
}

export interface ComponentErrorCount {
  component: string;
  count: number;
  rate: number;
}

export interface RecentError {
  timestamp: Date;
  type: string;
  message: string;
  component: string;
  requestId: string;
}

// Audit Logs
export interface AuditLogListRequest {
  organizationId?: string;
  workspaceId?: string;
  userId?: string;
  action?: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogListResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  resourceName?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  changes?: ChangesSummary;
  metadata: AuditMetadataSummary;
  createdAt: Date;
}

export interface ChangesSummary {
  fieldsChanged: string[];
  summary: string;
}

export interface AuditMetadataSummary {
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

// Get Audit Log Detail
export interface AuditLogDetailResponse {
  log: AuditLog;
  relatedLogs: AuditLogEntry[];
}

// Export Audit Logs
export interface ExportAuditLogsRequest {
  organizationId?: string;
  workspaceId?: string;
  startDate: Date;
  endDate: Date;
  format: 'csv' | 'json';
  filters?: AuditLogFilters;
}

export interface AuditLogFilters {
  actions?: AuditAction[];
  resourceTypes?: ResourceType[];
  userIds?: string[];
}

export interface ExportAuditLogsResponse {
  downloadUrl: string;
  expiresAt: Date;
  recordCount: number;
}

// Analytics Events (for custom tracking)
export interface TrackEventRequest {
  eventType: string;
  properties: Record<string, unknown>;
  timestamp?: Date;
}

export interface TrackEventResponse {
  eventId: string;
}

// Custom Reports
export interface CreateReportRequest {
  workspaceId: string;
  name: string;
  type: ReportType;
  config: ReportConfig;
  schedule?: ReportSchedule;
}

export type ReportType = 
  | 'usage'
  | 'performance'
  | 'audit'
  | 'persona'
  | 'workflow'
  | 'tool'
  | 'custom';

export interface ReportConfig {
  metrics: string[];
  dimensions: string[];
  filters: Record<string, unknown>;
  dateRange: DateRange;
  visualization?: VisualizationConfig;
}

export interface DateRange {
  type: 'relative' | 'absolute';
  relativeDays?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface VisualizationConfig {
  type: 'table' | 'line' | 'bar' | 'pie' | 'heatmap';
  options: Record<string, unknown>;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string; // HH:mm
  timezone: string;
  recipients: string[];
  format: 'pdf' | 'csv' | 'json';
}

export interface CreateReportResponse {
  report: Report;
}

export interface Report {
  id: string;
  workspaceId: string;
  name: string;
  type: ReportType;
  config: ReportConfig;
  schedule?: ReportSchedule;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateReportRequest {
  reportId: string;
  dateRange?: DateRange;
  format?: 'pdf' | 'csv' | 'json';
}

export interface GenerateReportResponse {
  downloadUrl: string;
  expiresAt: Date;
  generatedAt: Date;
}

// Data Export/Deletion (GDPR compliance)
export interface DataExportRequest {
  userId: string;
  includeConversations?: boolean;
  includeCommands?: boolean;
  includeWorkflows?: boolean;
  includeFiles?: boolean;
}

export interface DataExportResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  requestedAt: Date;
}

export interface DataDeletionRequest {
  userId: string;
  deleteConversations?: boolean;
  deleteCommands?: boolean;
  deleteWorkflows?: boolean;
  deleteFiles?: boolean;
  retainAuditLogs?: boolean;
}

export interface DataDeletionResponse {
  deletionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledFor: Date;
  requestedAt: Date;
}
