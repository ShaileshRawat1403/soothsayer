export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type WorkflowTrigger = 'manual' | 'scheduled' | 'webhook';
export type WorkflowStepType =
  | 'task'
  | 'dax_run'
  | 'read'
  | 'write'
  | 'validation'
  | 'notification';
export type StepRisk = 'read' | 'write' | 'execute';
export type DaxApprovalMode = 'strict' | 'balanced' | 'relaxed';
export type DaxRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  risk: StepRisk;
  task?: string;
  input?: string;
  personaPreset?: {
    personaId?: string;
    approvalMode?: DaxApprovalMode;
    riskLevel?: DaxRiskLevel;
  };
}

export interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  runCount: number;
}

export interface WorkflowEditorState {
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
}

export interface WorkflowRunReference {
  workflowId: string;
  workflowRunId: string;
  daxRunId: string;
  repoPath?: string;
  targetMode?: 'explicit_repo_path' | 'default_cwd';
}
