export interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  version: number;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  variables: WorkflowVariable[];
  errorHandling: ErrorHandlingConfig;
  metadata: WorkflowMetadata;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface WorkflowTrigger {
  type: TriggerType;
  config: TriggerConfig;
}

export type TriggerType = 'manual' | 'scheduled' | 'webhook' | 'event';

export interface TriggerConfig {
  // Manual
  allowedRoles?: string[];
  
  // Scheduled
  cronExpression?: string;
  timezone?: string;
  
  // Webhook
  webhookPath?: string;
  webhookSecret?: string;
  allowedMethods?: string[];
  
  // Event
  eventType?: string;
  eventFilter?: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  toolId?: string;
  config: StepConfig;
  inputs: StepInput[];
  outputs: StepOutput[];
  conditions?: StepCondition[];
  dependsOn: string[]; // Step IDs
  timeout: number; // milliseconds
  retryConfig?: RetryConfig;
  position: { x: number; y: number }; // For visual editor
}

export type StepType =
  | 'tool'
  | 'ai'
  | 'condition'
  | 'loop'
  | 'parallel'
  | 'delay'
  | 'approval'
  | 'notification'
  | 'script';

export interface StepConfig {
  toolId?: string;
  prompt?: string;
  script?: string;
  loopConfig?: LoopConfig;
  parallelConfig?: ParallelConfig;
  delayMs?: number;
  approvalConfig?: ApprovalConfig;
  notificationConfig?: NotificationConfig;
}

export interface LoopConfig {
  collection: string; // variable reference
  itemVariable: string;
  maxIterations: number;
}

export interface ParallelConfig {
  branches: string[][]; // Arrays of step IDs
  waitForAll: boolean;
}

export interface ApprovalConfig {
  approvers: string[]; // User IDs or role names
  timeout: number;
  defaultAction: 'approve' | 'reject' | 'skip';
  message?: string;
}

export interface NotificationConfig {
  channel: 'email' | 'slack' | 'webhook' | 'in-app';
  template: string;
  recipients: string[];
}

export interface StepInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  source: InputSource;
  required: boolean;
  defaultValue?: unknown;
}

export type InputSource =
  | { type: 'literal'; value: unknown }
  | { type: 'variable'; name: string }
  | { type: 'step_output'; stepId: string; outputName: string }
  | { type: 'trigger'; field: string }
  | { type: 'expression'; expression: string };

export interface StepOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface StepCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logic?: 'and' | 'or';
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'
  | 'matches_regex';

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  retryOn: string[]; // Error types
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: unknown;
  description?: string;
  isSecret: boolean;
}

export interface ErrorHandlingConfig {
  defaultRetries: number;
  compensatingSteps?: string[];
  onErrorAction: 'stop' | 'continue' | 'compensate';
  notifyOnError: boolean;
  errorNotificationRecipients?: string[];
}

export interface WorkflowMetadata {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgDurationMs: number;
  lastRunAt?: Date;
  tags: string[];
  isTemplate: boolean;
  templateCategory?: string;
}

// Workflow Execution Types
export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowVersion: number;
  triggeredBy: TriggeredBy;
  status: RunStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  variables: Record<string, unknown>;
  stepRuns: WorkflowStepRun[];
  error?: WorkflowError;
  metadata: RunMetadata;
}

export interface TriggeredBy {
  type: 'user' | 'schedule' | 'webhook' | 'event' | 'api';
  userId?: string;
  webhookRequestId?: string;
  eventId?: string;
}

export type RunStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'compensating';

export interface WorkflowStepRun {
  id: string;
  workflowRunId: string;
  stepId: string;
  stepName: string;
  status: StepRunStatus;
  attempt: number;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: StepError;
  logs: StepLog[];
}

export type StepRunStatus =
  | 'pending'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'retrying';

export interface StepError {
  code: string;
  message: string;
  stack?: string;
  retryable: boolean;
}

export interface StepLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export interface WorkflowError {
  stepId?: string;
  code: string;
  message: string;
  stack?: string;
}

export interface RunMetadata {
  projectId?: string;
  conversationId?: string;
  personaId?: string;
  tags: string[];
}

// Workflow Version
export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  steps: WorkflowStep[];
  trigger: WorkflowTrigger;
  variables: WorkflowVariable[];
  errorHandling: ErrorHandlingConfig;
  changelog?: string;
  createdById: string;
  createdAt: Date;
}
