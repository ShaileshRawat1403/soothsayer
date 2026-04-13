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
  // Execution target. When present, Soothsayer should normalize and pass this
  // through to DAX as the explicit workspace/repo directory for the run.
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
    // Context only. These do not replace intent.repoPath as the execution target.
    workspaceId?: string;
    projectId?: string;
    chatId?: string;
    workflowId?: string;
    policyReason?: string;
    targeting?: {
      mode: 'explicit_repo_path' | 'default_cwd';
      repoPath?: string;
    };
    // Picobot integration
    picobotCommandId?: string;
    commandType?: string;
    // Additional context
    [key: string]: unknown;
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

export interface DaxExecutionProfile {
  personaId: string;
  provider: string;
  model: string;
  approvalMode: 'strict' | 'balanced' | 'relaxed';
  riskLevel: DaxRiskLevel;
  fallbackReason?: string;
  isFallback: boolean;
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
  executionProfile?: DaxExecutionProfile;
  lastEvent?: {
    eventId: string;
    sequence: number;
    cursor: string;
    timestamp: string;
  } | null;
  failureCode?: string;
  failureLabel?: string;
  failureDescription?: string;
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
  terminalReason?: string;
  terminalReasonLabel?: string;
  terminalReasonSeverity?: 'info' | 'success' | 'warning' | 'error';
  outcome?: {
    summaryText?: string;
    result?: 'success' | 'failure' | 'partial';
    terminalReason?: string;
  };
}

export interface DaxHealthResponse {
  healthy: true;
  version: string;
  baseUrl?: string;
  checkedAt: string;
}

export type DaxRunSourceSurface = 'chat' | 'workflow' | 'direct' | 'unknown';

export interface DaxRunTargetingSummary {
  mode: 'explicit_repo_path' | 'default_cwd';
  repoPath?: string;
}

export interface DaxRunListItem {
  runId: string;
  title?: string;
  status: DaxRunStatus;
  sourceSystem?: DaxSourceSystem;
  sourceSurface: DaxRunSourceSurface;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  currentStep?: DaxRunCurrentStep;
  pendingApprovalCount: number;
  targeting?: DaxRunTargetingSummary;
  workspaceId?: string;
  projectId?: string;
  chatId?: string;
  workflowId?: string;
  provider?: string;
  model?: string;
  terminalReason?: string;
  terminalReasonLabel?: string;
  failureCode?: string;
  failureLabel?: string;
  failureDescription?: string;
}

export interface DaxPendingApprovalSummary {
  approvalId: string;
  runId: string;
  type: 'file_write' | 'command_execute' | 'patch_apply' | 'tool_use';
  risk: DaxRiskLevel;
  title: string;
  reason: string;
  createdAt: string;
  targeting?: DaxRunTargetingSummary;
  sourceSurface: DaxRunSourceSurface;
  workspaceId?: string;
  projectId?: string;
}

export interface DaxRunOverviewResponse {
  activeRuns: DaxRunListItem[];
  recentRuns: DaxRunListItem[];
  pendingApprovals: DaxPendingApprovalSummary[];
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

export interface SoothsayerApprovalDetail {
  approvalId: string;
  runId: string;
  type: string;
  typeLabel?: string;
  typeDescription?: string;
  typeIcon?: string;
  status: string;
  risk: string;
  riskLabel?: string;
  riskDescription?: string;
  riskSeverity?: number;
  riskColor?: string;
  title: string;
  titleEnriched?: string;
  reason: string;
  context: {
    stepId?: string;
    filePath?: string;
    command?: string;
    toolName?: string;
    diffPreview?: string;
    notes?: string[];
  };
  createdAt: string;
  updatedAt: string;
  whatHappensNext?: {
    afterApprove: string;
    afterDeny?: string;
  };
}

export interface SoothsayerWorkflowCard {
  runId: string;
  title?: string;
  workflowClass: string;
  workflowClassLabel?: string;
  workflowClassDescription?: string;
  status: DaxRunStatus;
  trustPosture: string;
  trustPostureLabel?: string;
  progress: {
    currentStep: string;
    currentStepLabel?: string;
    currentStepDescription?: string;
    currentStepIndex: number;
    totalSteps: number;
    percentage: number;
  };
  terminalReason?: string;
  terminalReasonLabel?: string;
  terminalReasonSeverity?: 'info' | 'success' | 'warning' | 'error';
  failureCode?: string;
  failureLabel?: string;
  failureDescription?: string;
  createdAt: string;
  completedAt?: string;
}

export interface SoothsayerOverview {
  activeRuns: SoothsayerWorkflowCard[];
  recentRuns: SoothsayerWorkflowCard[];
  pendingApprovals: SoothsayerApprovalDetail[];
  authorityMetrics: {
    dax_state_machine: number;
    dax_legacy: number;
    total: number;
  };
}

export interface SoothsayerRunDetail {
  runId: string;
  status: DaxRunStatus;
  authority: string;
  sourceSystem?: string;
  title?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: {
    currentStep: string;
    currentStepLabel?: string;
    currentStepDescription?: string;
    totalSteps: number;
    percentage: number;
  };
  trust: {
    posture: string;
    postureLabel?: string;
    postureDescription?: string;
    blocked: boolean;
  };
  workflow: {
    class: string;
    classLabel?: string;
    classDescription?: string;
    stepGraph: string[];
    currentStepIndex: number;
    trustPosture: string;
    trustPostureLabel?: string;
  } | null;
  terminalReason?: string;
  terminalReasonLabel?: string;
  terminalReasonDescription?: string;
  terminalReasonSeverity?: 'info' | 'success' | 'warning' | 'error';
  failureCode?: string;
  failureLabel?: string;
  failureDescription?: string;
  approvals: {
    pending: number;
    approved: number;
    denied: number;
  };
  artifacts: {
    total: number;
    latestIds: string[];
  };
  lastEvent?: {
    eventId: string;
    sequence: number;
    cursor: string;
    timestamp: string;
  };
}

export interface DaxRecoverySummary {
  hasState: boolean;
  isTerminal: boolean;
  needsRecovery: boolean;
  eventCount: number;
}

export interface DaxRecoveryResult {
  success: boolean;
  recoveredRunState?: Record<string, any>;
  recoveredApprovals?: number;
  error?: string;
}
