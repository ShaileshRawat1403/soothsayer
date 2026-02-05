export interface Tool {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ToolCategory;
  domain: ToolDomain;
  version: string;
  status: ToolStatus;
  riskLevel: RiskLevel;
  requiredTier: OperationTier;
  timeout: number; // milliseconds
  inputSchema: ToolSchema;
  outputSchema: ToolSchema;
  config: ToolConfig;
  healthCheck?: HealthCheckConfig;
  analytics: ToolAnalytics;
  createdAt: Date;
  updatedAt: Date;
}

export type ToolCategory =
  | 'engineering'
  | 'business'
  | 'data'
  | 'security'
  | 'automation';

export type ToolDomain =
  | 'code'
  | 'api'
  | 'database'
  | 'file'
  | 'communication'
  | 'analysis'
  | 'generation'
  | 'validation'
  | 'monitoring';

export type ToolStatus = 'active' | 'beta' | 'deprecated' | 'disabled';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type OperationTier = 0 | 1 | 2 | 3;
// 0: Explain - Read-only
// 1: Plan - Generate plans/patches
// 2: Supervised - Execute with approvals
// 3: Advanced - Full execution

export interface ToolSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: unknown[];
  default?: unknown;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
}

export interface ToolConfig {
  isBuiltIn: boolean;
  requiresAuth: boolean;
  authType?: 'api_key' | 'oauth' | 'token';
  endpoint?: string;
  headers?: Record<string, string>;
  rateLimits: RateLimitConfig;
  retryConfig: RetryConfig;
  sandboxed: boolean;
  allowedPathPatterns?: string[];
  blockedPathPatterns?: string[];
  commandAllowlist?: string[];
  commandDenylist?: string[];
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxConcurrent: number;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export interface HealthCheckConfig {
  enabled: boolean;
  endpoint?: string;
  intervalMs: number;
  timeoutMs: number;
  unhealthyThreshold: number;
}

export interface ToolAnalytics {
  totalInvocations: number;
  successRate: number;
  avgLatencyMs: number;
  errorRate: number;
  lastInvokedAt?: Date;
  lastHealthCheckAt?: Date;
  lastHealthStatus?: HealthStatus;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// Tool Configuration per workspace
export interface ToolConfiguration {
  id: string;
  toolId: string;
  workspaceId: string;
  enabled: boolean;
  customConfig?: Record<string, unknown>;
  overrides?: ToolOverrides;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolOverrides {
  timeout?: number;
  riskLevel?: RiskLevel;
  requiredTier?: OperationTier;
  rateLimits?: Partial<RateLimitConfig>;
}

// Tool Invocation
export interface ToolInvocation {
  id: string;
  toolId: string;
  workspaceId: string;
  userId: string;
  conversationId?: string;
  workflowRunId?: string;
  status: InvocationStatus;
  tier: OperationTier;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: InvocationError;
  approvalId?: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  metadata: InvocationMetadata;
}

export type InvocationStatus =
  | 'pending'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface InvocationError {
  code: string;
  message: string;
  stack?: string;
  retryable: boolean;
}

export interface InvocationMetadata {
  personaId?: string;
  clientIp?: string;
  userAgent?: string;
  correlationId?: string;
}

// Built-in Tool Definitions
export const ENGINEERING_TOOLS = [
  'code-generator',
  'refactor-assistant',
  'test-generator',
  'api-contract-validator',
  'dependency-scanner',
  'performance-profiler',
  'log-analyzer',
  'git-helper',
] as const;

export const BUSINESS_TOOLS = [
  'requirements-synthesizer',
  'prd-generator',
  'roadmap-planner',
  'kpi-assistant',
  'meeting-notes-processor',
  'sop-generator',
  'email-drafter',
  'forecast-summarizer',
] as const;

export const DATA_TOOLS = [
  'csv-json-analyzer',
  'sql-assistant',
  'data-quality-checker',
  'visualization-recommender',
  'anomaly-explainer',
] as const;

export const SECURITY_TOOLS = [
  'policy-checker',
  'pii-scanner',
  'security-checklist',
  'audit-package-generator',
] as const;

export const AUTOMATION_TOOLS = [
  'scheduler',
  'webhook-trigger',
  'notification-dispatcher',
  'report-exporter',
] as const;

export type EngineeringTool = typeof ENGINEERING_TOOLS[number];
export type BusinessTool = typeof BUSINESS_TOOLS[number];
export type DataTool = typeof DATA_TOOLS[number];
export type SecurityTool = typeof SECURITY_TOOLS[number];
export type AutomationTool = typeof AUTOMATION_TOOLS[number];
export type BuiltInTool = EngineeringTool | BusinessTool | DataTool | SecurityTool | AutomationTool;
