// WebSocket events for command execution streaming

export const COMMAND_EVENTS = {
  // Client to Server
  SUBSCRIBE: 'command:subscribe',
  UNSUBSCRIBE: 'command:unsubscribe',
  CANCEL: 'command:cancel',

  // Server to Client
  EXECUTION_START: 'command:start',
  STDOUT: 'command:stdout',
  STDERR: 'command:stderr',
  PROGRESS: 'command:progress',
  EXECUTION_COMPLETE: 'command:complete',
  ERROR: 'command:error',
  APPROVAL_REQUIRED: 'command:approval:required',
  APPROVAL_RESOLVED: 'command:approval:resolved',
} as const;

export type CommandEventType = typeof COMMAND_EVENTS[keyof typeof COMMAND_EVENTS];

// Client Events
export interface SubscribeCommandEvent {
  executionId: string;
}

export interface UnsubscribeCommandEvent {
  executionId: string;
}

export interface CancelCommandEvent {
  executionId: string;
  reason?: string;
}

// Server Events
export interface ExecutionStartEvent {
  executionId: string;
  commandId: string;
  commandName: string;
  resolvedCommand: string;
  workingDirectory: string;
  tier: number;
  timestamp: Date;
}

export interface StdoutEvent {
  executionId: string;
  content: string;
  timestamp: Date;
}

export interface StderrEvent {
  executionId: string;
  content: string;
  timestamp: Date;
}

export interface ProgressEvent {
  executionId: string;
  percentage: number;
  message: string;
  timestamp: Date;
}

export interface ExecutionCompleteEvent {
  executionId: string;
  status: 'completed' | 'failed' | 'cancelled' | 'timeout';
  exitCode?: number;
  durationMs: number;
  artifacts?: ArtifactInfo[];
  timestamp: Date;
}

export interface ArtifactInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface CommandErrorEvent {
  executionId: string;
  code: string;
  message: string;
  retryable: boolean;
  timestamp: Date;
}

export interface ApprovalRequiredEvent {
  executionId: string;
  approvalId: string;
  title: string;
  description: string;
  riskLevel: string;
  approvers: string[];
  expiresAt: Date;
  timestamp: Date;
}

export interface ApprovalResolvedEvent {
  executionId: string;
  approvalId: string;
  status: 'approved' | 'rejected' | 'expired';
  decidedBy?: string;
  note?: string;
  timestamp: Date;
}

// Union type for all server events
export type CommandServerEvent =
  | { type: typeof COMMAND_EVENTS.EXECUTION_START; data: ExecutionStartEvent }
  | { type: typeof COMMAND_EVENTS.STDOUT; data: StdoutEvent }
  | { type: typeof COMMAND_EVENTS.STDERR; data: StderrEvent }
  | { type: typeof COMMAND_EVENTS.PROGRESS; data: ProgressEvent }
  | { type: typeof COMMAND_EVENTS.EXECUTION_COMPLETE; data: ExecutionCompleteEvent }
  | { type: typeof COMMAND_EVENTS.ERROR; data: CommandErrorEvent }
  | { type: typeof COMMAND_EVENTS.APPROVAL_REQUIRED; data: ApprovalRequiredEvent }
  | { type: typeof COMMAND_EVENTS.APPROVAL_RESOLVED; data: ApprovalResolvedEvent };
