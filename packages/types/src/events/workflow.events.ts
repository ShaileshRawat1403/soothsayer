// WebSocket events for workflow execution streaming

export const WORKFLOW_EVENTS = {
  // Client to Server
  SUBSCRIBE: 'workflow:subscribe',
  UNSUBSCRIBE: 'workflow:unsubscribe',
  CANCEL: 'workflow:cancel',
  APPROVE_STEP: 'workflow:approve',

  // Server to Client
  RUN_START: 'workflow:run:start',
  STEP_QUEUED: 'workflow:step:queued',
  STEP_START: 'workflow:step:start',
  STEP_PROGRESS: 'workflow:step:progress',
  STEP_COMPLETE: 'workflow:step:complete',
  STEP_ERROR: 'workflow:step:error',
  RUN_PAUSED: 'workflow:run:paused',
  RUN_RESUMED: 'workflow:run:resumed',
  RUN_COMPLETE: 'workflow:run:complete',
  ERROR: 'workflow:error',
  APPROVAL_REQUIRED: 'workflow:approval:required',
  APPROVAL_RESOLVED: 'workflow:approval:resolved',
} as const;

export type WorkflowEventType = typeof WORKFLOW_EVENTS[keyof typeof WORKFLOW_EVENTS];

// Client Events
export interface SubscribeWorkflowEvent {
  runId: string;
}

export interface UnsubscribeWorkflowEvent {
  runId: string;
}

export interface CancelWorkflowEvent {
  runId: string;
  reason?: string;
}

export interface ApproveStepEvent {
  runId: string;
  stepId: string;
  approved: boolean;
  note?: string;
}

// Server Events
export interface RunStartEvent {
  runId: string;
  workflowId: string;
  workflowName: string;
  version: number;
  triggeredBy: {
    type: string;
    userId?: string;
    userName?: string;
  };
  totalSteps: number;
  inputs: Record<string, unknown>;
  timestamp: Date;
}

export interface StepQueuedEvent {
  runId: string;
  stepId: string;
  stepName: string;
  stepIndex: number;
  dependsOn: string[];
  timestamp: Date;
}

export interface StepStartEvent {
  runId: string;
  stepId: string;
  stepName: string;
  stepIndex: number;
  stepType: string;
  attempt: number;
  inputs: Record<string, unknown>;
  timestamp: Date;
}

export interface StepProgressEvent {
  runId: string;
  stepId: string;
  progress: number;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface StepCompleteEvent {
  runId: string;
  stepId: string;
  stepName: string;
  status: 'completed' | 'skipped';
  durationMs: number;
  outputs?: Record<string, unknown>;
  timestamp: Date;
}

export interface StepErrorEvent {
  runId: string;
  stepId: string;
  stepName: string;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
  attempt: number;
  willRetry: boolean;
  timestamp: Date;
}

export interface RunPausedEvent {
  runId: string;
  reason: 'approval_required' | 'manual' | 'rate_limit';
  stepId?: string;
  timestamp: Date;
}

export interface RunResumedEvent {
  runId: string;
  resumedBy?: string;
  timestamp: Date;
}

export interface RunCompleteEvent {
  runId: string;
  status: 'completed' | 'failed' | 'cancelled' | 'compensating';
  durationMs: number;
  stepsCompleted: number;
  stepsFailed: number;
  stepsSkipped: number;
  outputs?: Record<string, unknown>;
  error?: {
    stepId?: string;
    code: string;
    message: string;
  };
  timestamp: Date;
}

export interface WorkflowErrorEvent {
  runId: string;
  code: string;
  message: string;
  stepId?: string;
  retryable: boolean;
  timestamp: Date;
}

export interface WorkflowApprovalRequiredEvent {
  runId: string;
  stepId: string;
  stepName: string;
  approvalId: string;
  message: string;
  context: Record<string, unknown>;
  approvers: string[];
  expiresAt: Date;
  timestamp: Date;
}

export interface WorkflowApprovalResolvedEvent {
  runId: string;
  stepId: string;
  approvalId: string;
  status: 'approved' | 'rejected' | 'expired';
  decidedBy?: string;
  note?: string;
  timestamp: Date;
}

// Union type for all server events
export type WorkflowServerEvent =
  | { type: typeof WORKFLOW_EVENTS.RUN_START; data: RunStartEvent }
  | { type: typeof WORKFLOW_EVENTS.STEP_QUEUED; data: StepQueuedEvent }
  | { type: typeof WORKFLOW_EVENTS.STEP_START; data: StepStartEvent }
  | { type: typeof WORKFLOW_EVENTS.STEP_PROGRESS; data: StepProgressEvent }
  | { type: typeof WORKFLOW_EVENTS.STEP_COMPLETE; data: StepCompleteEvent }
  | { type: typeof WORKFLOW_EVENTS.STEP_ERROR; data: StepErrorEvent }
  | { type: typeof WORKFLOW_EVENTS.RUN_PAUSED; data: RunPausedEvent }
  | { type: typeof WORKFLOW_EVENTS.RUN_RESUMED; data: RunResumedEvent }
  | { type: typeof WORKFLOW_EVENTS.RUN_COMPLETE; data: RunCompleteEvent }
  | { type: typeof WORKFLOW_EVENTS.ERROR; data: WorkflowErrorEvent }
  | { type: typeof WORKFLOW_EVENTS.APPROVAL_REQUIRED; data: WorkflowApprovalRequiredEvent }
  | { type: typeof WORKFLOW_EVENTS.APPROVAL_RESOLVED; data: WorkflowApprovalResolvedEvent };
