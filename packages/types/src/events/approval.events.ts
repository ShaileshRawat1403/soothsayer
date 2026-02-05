// WebSocket events for approval notifications

export const APPROVAL_EVENTS = {
  // Client to Server
  SUBSCRIBE: 'approval:subscribe',
  UNSUBSCRIBE: 'approval:unsubscribe',

  // Server to Client
  NEW_REQUEST: 'approval:new',
  REMINDER: 'approval:reminder',
  RESOLVED: 'approval:resolved',
  EXPIRED: 'approval:expired',
  CANCELLED: 'approval:cancelled',
} as const;

export type ApprovalEventType = typeof APPROVAL_EVENTS[keyof typeof APPROVAL_EVENTS];

// Client Events
export interface SubscribeApprovalEvent {
  workspaceId: string;
}

export interface UnsubscribeApprovalEvent {
  workspaceId: string;
}

// Server Events
export interface NewApprovalRequestEvent {
  approvalId: string;
  type: 'command_execution' | 'tool_invocation' | 'workflow_step' | 'data_access' | 'configuration_change';
  title: string;
  description: string;
  requesterId: string;
  requesterName: string;
  workspaceId: string;
  workspaceName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  context: {
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    inputs?: Record<string, unknown>;
    command?: string;
    toolName?: string;
    workflowName?: string;
    stepName?: string;
  };
  expiresAt: Date;
  timestamp: Date;
}

export interface ApprovalReminderEvent {
  approvalId: string;
  title: string;
  requesterId: string;
  requesterName: string;
  timeRemaining: number; // milliseconds
  reminderNumber: number;
  timestamp: Date;
}

export interface ApprovalResolvedEvent {
  approvalId: string;
  status: 'approved' | 'rejected';
  decidedBy: string;
  decidedByName: string;
  note?: string;
  timestamp: Date;
}

export interface ApprovalExpiredEvent {
  approvalId: string;
  title: string;
  requesterId: string;
  timestamp: Date;
}

export interface ApprovalCancelledEvent {
  approvalId: string;
  title: string;
  cancelledBy: string;
  cancelledByName: string;
  reason?: string;
  timestamp: Date;
}

// Union type for all server events
export type ApprovalServerEvent =
  | { type: typeof APPROVAL_EVENTS.NEW_REQUEST; data: NewApprovalRequestEvent }
  | { type: typeof APPROVAL_EVENTS.REMINDER; data: ApprovalReminderEvent }
  | { type: typeof APPROVAL_EVENTS.RESOLVED; data: ApprovalResolvedEvent }
  | { type: typeof APPROVAL_EVENTS.EXPIRED; data: ApprovalExpiredEvent }
  | { type: typeof APPROVAL_EVENTS.CANCELLED; data: ApprovalCancelledEvent };

// Notification preferences for approvals
export interface ApprovalNotificationPreferences {
  enableInApp: boolean;
  enableEmail: boolean;
  enableSlack: boolean;
  reminderIntervals: number[]; // Minutes before expiry
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;
    timezone: string;
  };
}
