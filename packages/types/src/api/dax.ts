export type DaxSourceSystem = 'soothsayer' | 'dax' | 'cli' | 'api';
export type DaxRunStatus =
  | 'created'
  | 'queued'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type DaxStepStatus = 'proposed' | 'running' | 'completed' | 'failed' | 'blocked';
export type DaxApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';
export type DaxApprovalDecision = 'approve' | 'deny';
export type DaxRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type DaxArtifactType = 'diff' | 'file' | 'report' | 'log' | 'summary' | 'patch';
export type DaxRunEventType =
  | 'run.created'
  | 'run.started'
  | 'run.state_changed'
  | 'step.proposed'
  | 'step.started'
  | 'step.completed'
  | 'step.failed'
  | 'approval.requested'
  | 'approval.resolved'
  | 'artifact.created'
  | 'trust.updated'
  | 'run.completed'
  | 'run.failed';

export interface DaxRunIntent {
  input: string;
  kind?: 'general' | 'analysis' | 'edit' | 'workflow_step';
  repoPath?: string;
  branch?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface DaxPersonaPreset {
  personaId: string;
  providerHint?: string;
  modelHint?: string;
  temperature?: number;
  verbosity?: 'concise' | 'balanced' | 'detailed';
  tone?: 'technical' | 'formal' | 'friendly' | 'direct';
  riskLevel?: DaxRiskLevel;
  approvalMode?: 'strict' | 'balanced' | 'relaxed';
  preferredCapabilityClasses?: Array<
    'analysis' | 'planning' | 'code' | 'refactor' | 'review' | 'shell' | 'docs'
  >;
  eli12?: boolean;
}

export interface DaxCreateRunRequest {
  intent: DaxRunIntent;
  personaPreset?: DaxPersonaPreset;
  metadata?: {
    initiatedBy?: string;
    source?: 'soothsayer';
    workspaceId?: string;
    projectId?: string;
    chatId?: string;
    workflowId?: string;
  };
}

export interface DaxCreateRunResponse {
  runId: string;
  status: DaxRunStatus;
  createdAt: string;
}

export interface DaxRunTrustState {
  score?: number;
  posture?: 'low' | 'guarded' | 'moderate' | 'strong';
  blocked?: boolean;
  reasons?: string[];
}

export interface DaxRunArtifactSummary {
  total: number;
  byType?: Record<string, number>;
  latestArtifactIds?: string[];
}

export interface DaxRunCurrentStep {
  stepId: string;
  status: DaxStepStatus;
  title: string;
  detail?: string;
}

export interface DaxRunSnapshot {
  schemaVersion: 'v1';
  authority: 'dax';
  sourceSystem?: DaxSourceSystem;
  runId: string;
  status: DaxRunStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  title?: string;
  currentStep?: DaxRunCurrentStep;
  pendingApprovalCount: number;
  trust?: DaxRunTrustState;
  artifactSummary?: DaxRunArtifactSummary;
  lastEvent?: {
    eventId: string;
    sequence: number;
    cursor: string;
    timestamp: string;
  } | null;
}

export interface DaxApprovalContext {
  stepId?: string;
  filePath?: string;
  command?: string;
  toolName?: string;
  diffPreview?: string;
  notes?: string[];
}

export interface DaxApprovalResolution {
  decision: DaxApprovalDecision;
  actorId?: string;
  source: 'soothsayer' | 'dax' | 'cli' | 'system';
  comment?: string;
}

export interface DaxApprovalRecord {
  approvalId: string;
  runId: string;
  type: 'file_write' | 'command_execute' | 'patch_apply' | 'tool_use';
  status: DaxApprovalStatus;
  risk: DaxRiskLevel;
  title: string;
  reason: string;
  context?: DaxApprovalContext;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: DaxApprovalResolution;
}

export interface DaxApprovalsResponse {
  runId: string;
  approvals: DaxApprovalRecord[];
}

export interface DaxResolveApprovalRequest {
  decision: DaxApprovalDecision;
  actorId: string;
  source: 'soothsayer';
  comment?: string;
  requestId?: string;
}

export interface DaxResolveApprovalResponse {
  approvalId: string;
  status: DaxApprovalStatus;
  resolution: DaxApprovalResolution;
  resolvedAt?: string;
}

export interface DaxArtifactRecord {
  artifactId: string;
  runId: string;
  type: DaxArtifactType;
  title: string;
  createdAt: string;
  path?: string;
  mimeType?: string;
  preview?: {
    text?: string;
    truncated?: boolean;
  };
  metadata?: Record<string, string | number | boolean | null>;
  links?: {
    self?: string;
    download?: string;
  };
}

export interface DaxRunSummary {
  runId: string;
  status: DaxRunStatus;
  startedAt?: string;
  completedAt?: string;
  stepCount: number;
  approvalCount: number;
  artifactCount: number;
  trust?: DaxRunTrustState;
  outcome?: {
    summaryText?: string;
    result?: 'success' | 'failure' | 'partial';
  };
}

export interface DaxRunEvent {
  schemaVersion: 'v1';
  eventId: string;
  sequence: number;
  cursor: string;
  runId: string;
  type: DaxRunEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface DaxStreamEvent extends DaxRunEvent {
  sseEvent?: string;
  sseId?: string;
}
