import { Persona } from './persona';

export interface Conversation {
  id: string;
  workspaceId: string;
  projectId?: string;
  userId: string;
  personaId: string;
  title: string;
  status: ConversationStatus;
  memoryMode: MemoryMode;
  metadata: ConversationMetadata;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type ConversationStatus = 'active' | 'archived' | 'deleted';

export type MemoryMode = 'session' | 'project' | 'persistent';

export interface ConversationMetadata {
  totalMessages: number;
  totalTokens: number;
  lastMessageAt?: Date;
  tags: string[];
  branchCount: number;
  parentConversationId?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  contentType: ContentType;
  metadata: MessageMetadata;
  toolCalls?: ToolCall[];
  citations?: Citation[];
  actionProposals?: ActionProposal[];
  parentMessageId?: string; // for branching
  createdAt: Date;
  updatedAt: Date;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type ContentType = 'text' | 'markdown' | 'code' | 'json' | 'error';

export interface MessageMetadata {
  model?: string;
  tokensUsed?: number;
  latencyMs?: number;
  personaId?: string;
  isRegenerated?: boolean;
  regenerationOf?: string;
  feedbackRating?: number;
  feedbackText?: string;
}

export interface ToolCall {
  id: string;
  toolId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  status: ToolCallStatus;
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export type ToolCallStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface Citation {
  id: string;
  source: CitationSource;
  content: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export type CitationSource = 'file' | 'web' | 'knowledge' | 'previous_message';

export interface ActionProposal {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  command?: string;
  workflowId?: string;
  toolId?: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  status: ActionProposalStatus;
  approvedAt?: Date;
  approvedBy?: string;
  executionResult?: unknown;
}

export type ActionType = 'command' | 'workflow' | 'tool' | 'file_change';

export type ActionProposalStatus =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed';

// Streaming types
export interface StreamToken {
  conversationId: string;
  messageId: string;
  token: string;
  index: number;
  isComplete: boolean;
}

export interface StreamEvent {
  type: StreamEventType;
  conversationId: string;
  messageId?: string;
  data: unknown;
  timestamp: Date;
}

export type StreamEventType =
  | 'message_start'
  | 'token'
  | 'tool_call_start'
  | 'tool_call_complete'
  | 'citation_added'
  | 'action_proposed'
  | 'message_complete'
  | 'error';
