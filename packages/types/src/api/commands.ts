import { OperationTier, RiskLevel } from '../domain/tool';
import { ApprovalRequest, PolicyEvaluationResult } from '../domain/policy';

// Command Definition
export interface Command {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  template: string;
  category: CommandCategory;
  domain: string;
  riskLevel: RiskLevel;
  requiredTier: OperationTier;
  parameters: CommandParameter[];
  allowedPatterns: string[];
  blockedPatterns: string[];
  timeout: number;
  requiresApproval: boolean;
  isBuiltIn: boolean;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CommandCategory =
  | 'file'
  | 'git'
  | 'build'
  | 'test'
  | 'deploy'
  | 'database'
  | 'network'
  | 'system'
  | 'custom';

export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'path' | 'select';
  description: string;
  required: boolean;
  defaultValue?: unknown;
  options?: string[]; // For select type
  validation?: ParameterValidation;
}

export interface ParameterValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  allowedPaths?: string[];
}

// Command Execution
export interface CommandExecution {
  id: string;
  commandId: string;
  workspaceId: string;
  projectId?: string;
  userId: string;
  personaId?: string;
  conversationId?: string;
  status: ExecutionStatus;
  tier: OperationTier;
  command: string; // Resolved command string
  parameters: Record<string, unknown>;
  workingDirectory?: string;
  environment?: Record<string, string>;
  output: ExecutionOutput;
  approvalId?: string;
  policyResult?: PolicyEvaluationResult;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  createdAt: Date;
}

export type ExecutionStatus =
  | 'pending'
  | 'validating'
  | 'waiting_approval'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface ExecutionOutput {
  stdout: string;
  stderr: string;
  exitCode?: number;
  truncated: boolean;
  artifacts?: ExecutionArtifact[];
}

export interface ExecutionArtifact {
  id: string;
  name: string;
  type: string;
  path?: string;
  url?: string;
  size: number;
}

// API Requests/Responses

// List Commands
export interface CommandListRequest {
  workspaceId: string;
  category?: CommandCategory;
  domain?: string;
  search?: string;
  includeBuiltIn?: boolean;
  page?: number;
  limit?: number;
}

export interface CommandListResponse {
  commands: CommandSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface CommandSummary {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  domain: string;
  riskLevel: RiskLevel;
  requiredTier: OperationTier;
  isBuiltIn: boolean;
}

// Get Command
export interface CommandDetailResponse {
  command: Command;
  recentExecutions: ExecutionSummary[];
  usageStats: CommandUsageStats;
}

export interface ExecutionSummary {
  id: string;
  status: ExecutionStatus;
  durationMs?: number;
  userId: string;
  userName: string;
  createdAt: Date;
}

export interface CommandUsageStats {
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  lastExecutedAt?: Date;
}

// Create Command
export interface CreateCommandRequest {
  workspaceId: string;
  name: string;
  description: string;
  template: string;
  category: CommandCategory;
  domain: string;
  parameters?: CommandParameter[];
  allowedPatterns?: string[];
  blockedPatterns?: string[];
  timeout?: number;
  requiresApproval?: boolean;
}

export interface CreateCommandResponse {
  command: Command;
}

// Update Command
export interface UpdateCommandRequest {
  name?: string;
  description?: string;
  template?: string;
  parameters?: CommandParameter[];
  allowedPatterns?: string[];
  blockedPatterns?: string[];
  timeout?: number;
  requiresApproval?: boolean;
}

// Execute Command
export interface ExecuteCommandRequest {
  commandId: string;
  workspaceId: string;
  projectId?: string;
  parameters: Record<string, unknown>;
  workingDirectory?: string;
  environment?: Record<string, string>;
  tier?: OperationTier;
  personaId?: string;
  conversationId?: string;
  dryRun?: boolean;
}

export interface ExecuteCommandResponse {
  execution: CommandExecution;
  requiresApproval: boolean;
  approvalRequest?: ApprovalRequest;
  policyResult: PolicyEvaluationResult;
}

// Dry Run
export interface DryRunCommandRequest {
  commandId: string;
  parameters: Record<string, unknown>;
  workingDirectory?: string;
}

export interface DryRunCommandResponse {
  resolvedCommand: string;
  policyResult: PolicyEvaluationResult;
  estimatedRisk: RiskLevel;
  warnings: string[];
}

// Get Execution
export interface ExecutionDetailResponse {
  execution: CommandExecution;
  command: Command;
  approval?: ApprovalRequest;
}

// List Executions
export interface ExecutionListRequest {
  workspaceId: string;
  projectId?: string;
  commandId?: string;
  userId?: string;
  status?: ExecutionStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface ExecutionListResponse {
  executions: ExecutionSummary[];
  total: number;
  page: number;
  limit: number;
}

// Cancel Execution
export interface CancelExecutionRequest {
  executionId: string;
  reason?: string;
}

export interface CancelExecutionResponse {
  execution: CommandExecution;
}

// Retry Execution
export interface RetryExecutionRequest {
  executionId: string;
  modifiedParameters?: Record<string, unknown>;
}

export interface RetryExecutionResponse {
  execution: CommandExecution;
}

// Streaming Types (for WebSocket)
export interface ExecutionStreamEvent {
  type: 'start' | 'stdout' | 'stderr' | 'progress' | 'complete' | 'error';
  executionId: string;
  data: ExecutionStreamData;
  timestamp: Date;
}

export type ExecutionStreamData =
  | StartData
  | OutputData
  | ProgressData
  | CompleteData
  | ErrorData;

export interface StartData {
  command: string;
  workingDirectory: string;
}

export interface OutputData {
  content: string;
  stream: 'stdout' | 'stderr';
}

export interface ProgressData {
  percentage: number;
  message: string;
}

export interface CompleteData {
  exitCode: number;
  durationMs: number;
  artifacts?: ExecutionArtifact[];
}

export interface ErrorData {
  code: string;
  message: string;
}
