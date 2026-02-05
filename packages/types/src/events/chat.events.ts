// WebSocket events for chat/conversation streaming

export const CHAT_EVENTS = {
  // Client to Server
  JOIN_CONVERSATION: 'chat:join',
  LEAVE_CONVERSATION: 'chat:leave',
  SEND_MESSAGE: 'chat:send',
  STOP_GENERATION: 'chat:stop',
  REGENERATE: 'chat:regenerate',

  // Server to Client
  MESSAGE_START: 'chat:message:start',
  TOKEN: 'chat:token',
  TOOL_CALL_START: 'chat:tool:start',
  TOOL_CALL_PROGRESS: 'chat:tool:progress',
  TOOL_CALL_COMPLETE: 'chat:tool:complete',
  CITATION_ADDED: 'chat:citation',
  ACTION_PROPOSED: 'chat:action',
  MESSAGE_COMPLETE: 'chat:message:complete',
  ERROR: 'chat:error',
} as const;

export type ChatEventType = typeof CHAT_EVENTS[keyof typeof CHAT_EVENTS];

// Client Events
export interface JoinConversationEvent {
  conversationId: string;
}

export interface LeaveConversationEvent {
  conversationId: string;
}

export interface SendMessageEvent {
  conversationId: string;
  content: string;
  parentMessageId?: string;
  attachments?: AttachmentData[];
}

export interface AttachmentData {
  type: 'file' | 'image' | 'code';
  fileId?: string;
  content?: string;
  language?: string;
  fileName?: string;
}

export interface StopGenerationEvent {
  conversationId: string;
  messageId: string;
}

export interface RegenerateEvent {
  conversationId: string;
  messageId: string;
  personaId?: string;
}

// Server Events
export interface MessageStartEvent {
  conversationId: string;
  messageId: string;
  role: 'assistant';
  personaId: string;
  personaName: string;
  timestamp: Date;
}

export interface TokenEvent {
  conversationId: string;
  messageId: string;
  token: string;
  index: number;
}

export interface ToolCallStartEvent {
  conversationId: string;
  messageId: string;
  toolCallId: string;
  toolId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallProgressEvent {
  conversationId: string;
  messageId: string;
  toolCallId: string;
  progress: number;
  message?: string;
}

export interface ToolCallCompleteEvent {
  conversationId: string;
  messageId: string;
  toolCallId: string;
  status: 'success' | 'failed';
  result?: unknown;
  error?: string;
  durationMs: number;
}

export interface CitationAddedEvent {
  conversationId: string;
  messageId: string;
  citation: {
    id: string;
    source: string;
    content: string;
    url?: string;
  };
}

export interface ActionProposedEvent {
  conversationId: string;
  messageId: string;
  action: {
    id: string;
    type: string;
    title: string;
    description: string;
    riskLevel: string;
    requiresApproval: boolean;
  };
}

export interface MessageCompleteEvent {
  conversationId: string;
  messageId: string;
  content: string;
  tokensUsed: number;
  latencyMs: number;
  model?: string;
  toolCalls?: number;
  citations?: number;
  actions?: number;
}

export interface ChatErrorEvent {
  conversationId: string;
  messageId?: string;
  code: string;
  message: string;
  retryable: boolean;
}

// Union type for all server events
export type ChatServerEvent =
  | { type: typeof CHAT_EVENTS.MESSAGE_START; data: MessageStartEvent }
  | { type: typeof CHAT_EVENTS.TOKEN; data: TokenEvent }
  | { type: typeof CHAT_EVENTS.TOOL_CALL_START; data: ToolCallStartEvent }
  | { type: typeof CHAT_EVENTS.TOOL_CALL_PROGRESS; data: ToolCallProgressEvent }
  | { type: typeof CHAT_EVENTS.TOOL_CALL_COMPLETE; data: ToolCallCompleteEvent }
  | { type: typeof CHAT_EVENTS.CITATION_ADDED; data: CitationAddedEvent }
  | { type: typeof CHAT_EVENTS.ACTION_PROPOSED; data: ActionProposedEvent }
  | { type: typeof CHAT_EVENTS.MESSAGE_COMPLETE; data: MessageCompleteEvent }
  | { type: typeof CHAT_EVENTS.ERROR; data: ChatErrorEvent };
