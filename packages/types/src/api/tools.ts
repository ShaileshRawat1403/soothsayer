import { Tool, ToolConfiguration, ToolInvocation, ToolCategory, ToolDomain, ToolStatus, RiskLevel, OperationTier, HealthStatus, ToolSchema } from '../domain/tool';

// List Tools
export interface ToolListRequest {
  workspaceId?: string;
  category?: ToolCategory;
  domain?: ToolDomain;
  status?: ToolStatus;
  riskLevel?: RiskLevel;
  search?: string;
  includeDisabled?: boolean;
  page?: number;
  limit?: number;
}

export interface ToolListResponse {
  tools: ToolSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface ToolSummary {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  domain: ToolDomain;
  status: ToolStatus;
  riskLevel: RiskLevel;
  requiredTier: OperationTier;
  isBuiltIn: boolean;
  isEnabled: boolean;
  healthStatus: HealthStatus;
  totalInvocations: number;
  successRate: number;
}

// Get Tool
export interface ToolDetailResponse {
  tool: Tool;
  configuration?: ToolConfiguration;
  recentInvocations: InvocationSummary[];
  healthHistory: HealthCheckResult[];
}

export interface InvocationSummary {
  id: string;
  status: string;
  durationMs?: number;
  userId: string;
  userName: string;
  createdAt: Date;
}

export interface HealthCheckResult {
  timestamp: Date;
  status: HealthStatus;
  latencyMs?: number;
  errorMessage?: string;
}

// Configure Tool
export interface ConfigureToolRequest {
  toolId: string;
  workspaceId: string;
  enabled: boolean;
  customConfig?: Record<string, unknown>;
  overrides?: ToolOverridesRequest;
}

export interface ToolOverridesRequest {
  timeout?: number;
  riskLevel?: RiskLevel;
  requiredTier?: OperationTier;
  maxRequestsPerMinute?: number;
  maxRequestsPerHour?: number;
  maxConcurrent?: number;
}

export interface ConfigureToolResponse {
  configuration: ToolConfiguration;
}

// Invoke Tool
export interface InvokeToolRequest {
  toolId: string;
  workspaceId: string;
  inputs: Record<string, unknown>;
  tier?: OperationTier;
  personaId?: string;
  conversationId?: string;
  workflowRunId?: string;
  async?: boolean;
}

export interface InvokeToolResponse {
  invocation: ToolInvocation;
  requiresApproval: boolean;
  approvalId?: string;
}

// Get Invocation
export interface InvocationDetailResponse {
  invocation: ToolInvocation;
  tool: Tool;
}

// List Invocations
export interface InvocationListRequest {
  workspaceId: string;
  toolId?: string;
  userId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface InvocationListResponse {
  invocations: InvocationSummary[];
  total: number;
  page: number;
  limit: number;
}

// Cancel Invocation
export interface CancelInvocationRequest {
  invocationId: string;
  reason?: string;
}

export interface CancelInvocationResponse {
  invocation: ToolInvocation;
}

// Tool Health
export interface ToolHealthRequest {
  toolId: string;
}

export interface ToolHealthResponse {
  toolId: string;
  status: HealthStatus;
  lastCheck: Date;
  latencyMs?: number;
  errorMessage?: string;
  uptime: number; // percentage
  healthHistory: HealthCheckResult[];
}

// Tool Analytics
export interface ToolAnalyticsRequest {
  toolId: string;
  workspaceId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ToolAnalyticsResponse {
  toolId: string;
  period: { start: Date; end: Date };
  metrics: ToolMetrics;
  invocationsByDay: DailyInvocationCount[];
  latencyDistribution: LatencyBucket[];
  errorDistribution: ErrorCount[];
  userDistribution: UserUsageCount[];
}

export interface ToolMetrics {
  totalInvocations: number;
  successfulInvocations: number;
  failedInvocations: number;
  avgLatencyMs: number;
  medianLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  uniqueUsers: number;
}

export interface DailyInvocationCount {
  date: string;
  total: number;
  successful: number;
  failed: number;
  avgLatencyMs: number;
}

export interface LatencyBucket {
  range: string;
  count: number;
  percentage: number;
}

export interface ErrorCount {
  errorCode: string;
  message: string;
  count: number;
  percentage: number;
}

export interface UserUsageCount {
  userId: string;
  userName: string;
  invocations: number;
  successRate: number;
}

// Tool Categories
export interface ToolCategoryListResponse {
  categories: ToolCategoryInfo[];
}

export interface ToolCategoryInfo {
  id: ToolCategory;
  name: string;
  description: string;
  toolCount: number;
  domains: ToolDomainInfo[];
}

export interface ToolDomainInfo {
  id: ToolDomain;
  name: string;
  description: string;
  toolCount: number;
}

// Tool Schema Validation
export interface ValidateToolInputRequest {
  toolId: string;
  inputs: Record<string, unknown>;
}

export interface ValidateToolInputResponse {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Custom Tool (Plugin)
export interface CreateCustomToolRequest {
  workspaceId: string;
  name: string;
  description: string;
  category: ToolCategory;
  domain: ToolDomain;
  riskLevel: RiskLevel;
  requiredTier: OperationTier;
  timeout: number;
  inputSchema: ToolSchema;
  outputSchema: ToolSchema;
  endpoint: string;
  authType?: 'api_key' | 'oauth' | 'token';
  authConfig?: Record<string, unknown>;
  healthCheck?: HealthCheckConfigRequest;
}

export interface HealthCheckConfigRequest {
  enabled: boolean;
  endpoint?: string;
  intervalMs?: number;
  timeoutMs?: number;
  unhealthyThreshold?: number;
}

export interface CreateCustomToolResponse {
  tool: Tool;
}

export interface UpdateCustomToolRequest {
  name?: string;
  description?: string;
  riskLevel?: RiskLevel;
  requiredTier?: OperationTier;
  timeout?: number;
  inputSchema?: ToolSchema;
  outputSchema?: ToolSchema;
  endpoint?: string;
  healthCheck?: HealthCheckConfigRequest;
}

export interface UpdateCustomToolResponse {
  tool: Tool;
}

// Tool Recommendations
export interface ToolRecommendationRequest {
  workspaceId: string;
  taskDescription: string;
  personaId?: string;
  context?: RecommendationContext;
}

export interface RecommendationContext {
  recentTools?: string[];
  projectType?: string;
  userSkillLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ToolRecommendationResponse {
  recommendations: ToolRecommendation[];
}

export interface ToolRecommendation {
  tool: ToolSummary;
  score: number;
  reasoning: string;
  suggestedInputs?: Record<string, unknown>;
}

// Bulk Operations
export interface BulkConfigureToolsRequest {
  workspaceId: string;
  operations: BulkToolOperation[];
}

export interface BulkToolOperation {
  toolId: string;
  enabled?: boolean;
  overrides?: ToolOverridesRequest;
}

export interface BulkConfigureToolsResponse {
  results: BulkOperationResult[];
}

export interface BulkOperationResult {
  toolId: string;
  success: boolean;
  error?: string;
}
