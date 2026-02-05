import { Workflow, WorkflowRun, WorkflowStep, WorkflowTrigger, WorkflowVariable, ErrorHandlingConfig, RunStatus, StepRunStatus, WorkflowStatus } from '../domain/workflow';

// List Workflows
export interface WorkflowListRequest {
  workspaceId: string;
  status?: WorkflowStatus;
  isTemplate?: boolean;
  templateCategory?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WorkflowListResponse {
  workflows: WorkflowSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  triggerType: string;
  stepCount: number;
  totalRuns: number;
  successRate: number;
  lastRunAt?: Date;
  isTemplate: boolean;
  templateCategory?: string;
}

// Get Workflow
export interface WorkflowDetailResponse {
  workflow: Workflow;
  recentRuns: WorkflowRunSummary[];
  versions: WorkflowVersionSummary[];
}

export interface WorkflowRunSummary {
  id: string;
  status: RunStatus;
  triggeredBy: string;
  startedAt: Date;
  durationMs?: number;
}

export interface WorkflowVersionSummary {
  id: string;
  version: number;
  changelog?: string;
  createdAt: Date;
}

// Create Workflow
export interface CreateWorkflowRequest {
  workspaceId: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStepRequest[];
  variables?: WorkflowVariable[];
  errorHandling?: ErrorHandlingConfig;
  isTemplate?: boolean;
  templateCategory?: string;
}

export interface WorkflowStepRequest {
  id: string;
  name: string;
  type: string;
  toolId?: string;
  config: Record<string, unknown>;
  inputs: StepInputRequest[];
  outputs: StepOutputRequest[];
  conditions?: StepConditionRequest[];
  dependsOn: string[];
  timeout?: number;
  retryConfig?: RetryConfigRequest;
  position: { x: number; y: number };
}

export interface StepInputRequest {
  name: string;
  type: string;
  source: InputSourceRequest;
  required: boolean;
  defaultValue?: unknown;
}

export interface InputSourceRequest {
  type: 'literal' | 'variable' | 'step_output' | 'trigger' | 'expression';
  value?: unknown;
  name?: string;
  stepId?: string;
  outputName?: string;
  field?: string;
  expression?: string;
}

export interface StepOutputRequest {
  name: string;
  type: string;
  description?: string;
}

export interface StepConditionRequest {
  field: string;
  operator: string;
  value: unknown;
  logic?: 'and' | 'or';
}

export interface RetryConfigRequest {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;
  retryOn?: string[];
}

export interface CreateWorkflowResponse {
  workflow: Workflow;
}

// Update Workflow
export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  status?: WorkflowStatus;
  trigger?: WorkflowTrigger;
  steps?: WorkflowStepRequest[];
  variables?: WorkflowVariable[];
  errorHandling?: ErrorHandlingConfig;
  changelog?: string;
}

export interface UpdateWorkflowResponse {
  workflow: Workflow;
  newVersion: number;
}

// Clone Workflow
export interface CloneWorkflowRequest {
  sourceWorkflowId: string;
  name: string;
  workspaceId?: string;
}

export interface CloneWorkflowResponse {
  workflow: Workflow;
}

// Trigger Workflow
export interface TriggerWorkflowRequest {
  workflowId: string;
  inputs?: Record<string, unknown>;
  personaId?: string;
  projectId?: string;
  conversationId?: string;
}

export interface TriggerWorkflowResponse {
  run: WorkflowRun;
}

// Get Workflow Run
export interface WorkflowRunDetailResponse {
  run: WorkflowRun;
  workflow: Workflow;
  stepDetails: StepRunDetail[];
}

export interface StepRunDetail {
  id: string;
  stepId: string;
  stepName: string;
  status: StepRunStatus;
  attempt: number;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: StepErrorDetail;
  logs: StepLogEntry[];
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface StepErrorDetail {
  code: string;
  message: string;
  retryable: boolean;
}

export interface StepLogEntry {
  timestamp: Date;
  level: string;
  message: string;
  data?: Record<string, unknown>;
}

// List Workflow Runs
export interface WorkflowRunListRequest {
  workflowId?: string;
  workspaceId: string;
  status?: RunStatus;
  triggeredBy?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface WorkflowRunListResponse {
  runs: WorkflowRunSummary[];
  total: number;
  page: number;
  limit: number;
}

// Cancel Workflow Run
export interface CancelWorkflowRunRequest {
  runId: string;
  reason?: string;
}

export interface CancelWorkflowRunResponse {
  run: WorkflowRun;
}

// Retry Workflow Run
export interface RetryWorkflowRunRequest {
  runId: string;
  fromStepId?: string;
  modifiedInputs?: Record<string, unknown>;
}

export interface RetryWorkflowRunResponse {
  run: WorkflowRun;
}

// Approve Workflow Step
export interface ApproveWorkflowStepRequest {
  runId: string;
  stepId: string;
  approved: boolean;
  note?: string;
}

export interface ApproveWorkflowStepResponse {
  run: WorkflowRun;
  stepRun: StepRunDetail;
}

// Workflow Templates
export interface WorkflowTemplateListRequest {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WorkflowTemplateListResponse {
  templates: WorkflowTemplateSummary[];
  categories: string[];
  total: number;
}

export interface WorkflowTemplateSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  stepCount: number;
  estimatedDuration?: number;
  popularity: number;
}

export interface UseWorkflowTemplateRequest {
  templateId: string;
  workspaceId: string;
  name?: string;
  customizations?: TemplateCustomization[];
}

export interface TemplateCustomization {
  stepId: string;
  changes: Partial<WorkflowStepRequest>;
}

export interface UseWorkflowTemplateResponse {
  workflow: Workflow;
}

// Export/Import
export interface ExportWorkflowResponse {
  workflow: WorkflowExport;
}

export interface WorkflowExport {
  version: string;
  exportedAt: Date;
  workflow: {
    name: string;
    description?: string;
    trigger: WorkflowTrigger;
    steps: WorkflowStep[];
    variables: WorkflowVariable[];
    errorHandling: ErrorHandlingConfig;
  };
}

export interface ImportWorkflowRequest {
  data: WorkflowExport;
  workspaceId: string;
  overrideName?: string;
}

export interface ImportWorkflowResponse {
  workflow: Workflow;
}

// Workflow Analytics
export interface WorkflowAnalyticsRequest {
  workflowId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface WorkflowAnalyticsResponse {
  workflowId: string;
  period: { start: Date; end: Date };
  metrics: WorkflowMetrics;
  runsByDay: DailyRunCount[];
  stepMetrics: StepMetrics[];
  errorDistribution: ErrorCount[];
}

export interface WorkflowMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  avgDurationMs: number;
  medianDurationMs: number;
  p95DurationMs: number;
}

export interface DailyRunCount {
  date: string;
  total: number;
  successful: number;
  failed: number;
}

export interface StepMetrics {
  stepId: string;
  stepName: string;
  avgDurationMs: number;
  successRate: number;
  errorRate: number;
  retryRate: number;
}

export interface ErrorCount {
  errorCode: string;
  count: number;
  percentage: number;
}

// Streaming Types (for WebSocket)
export interface WorkflowStreamEvent {
  type: 'run_start' | 'step_start' | 'step_progress' | 'step_complete' | 'run_complete' | 'error' | 'approval_required';
  runId: string;
  data: WorkflowStreamData;
  timestamp: Date;
}

export type WorkflowStreamData =
  | RunStartData
  | StepStartData
  | StepProgressData
  | StepCompleteData
  | RunCompleteData
  | ApprovalRequiredData
  | ErrorData;

export interface RunStartData {
  workflowId: string;
  workflowName: string;
  totalSteps: number;
}

export interface StepStartData {
  stepId: string;
  stepName: string;
  stepIndex: number;
}

export interface StepProgressData {
  stepId: string;
  progress: number;
  message: string;
}

export interface StepCompleteData {
  stepId: string;
  stepName: string;
  status: StepRunStatus;
  durationMs: number;
  outputs?: Record<string, unknown>;
}

export interface RunCompleteData {
  status: RunStatus;
  durationMs: number;
  outputs?: Record<string, unknown>;
}

export interface ApprovalRequiredData {
  stepId: string;
  stepName: string;
  approvalId: string;
  message: string;
  timeout: number;
}

export interface ErrorData {
  stepId?: string;
  code: string;
  message: string;
}
