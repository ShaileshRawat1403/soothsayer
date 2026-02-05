import { Conversation, Message, ConversationStatus, MemoryMode, ToolCall, Citation, ActionProposal } from '../domain/conversation';

// Create Conversation
export interface CreateConversationRequest {
  workspaceId: string;
  projectId?: string;
  personaId: string;
  title?: string;
  memoryMode?: MemoryMode;
  initialMessage?: string;
}

export interface CreateConversationResponse {
  conversation: Conversation;
  initialMessage?: Message;
}

// List Conversations
export interface ConversationListRequest {
  workspaceId: string;
  projectId?: string;
  personaId?: string;
  status?: ConversationStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ConversationListResponse {
  conversations: ConversationSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  personaId: string;
  personaName: string;
  status: ConversationStatus;
  messageCount: number;
  lastMessageAt?: Date;
  createdAt: Date;
}

// Get Conversation
export interface ConversationDetailResponse {
  conversation: Conversation;
  messages: Message[];
  persona: PersonaSummaryInChat;
}

export interface PersonaSummaryInChat {
  id: string;
  name: string;
  avatarUrl?: string;
  category: string;
}

// Update Conversation
export interface UpdateConversationRequest {
  title?: string;
  status?: ConversationStatus;
  memoryMode?: MemoryMode;
}

// Send Message
export interface SendMessageRequest {
  conversationId: string;
  content: string;
  parentMessageId?: string; // For branching
  attachments?: AttachmentRequest[];
}

export interface AttachmentRequest {
  type: 'file' | 'image' | 'code';
  fileId?: string;
  content?: string;
  language?: string;
  fileName?: string;
}

export interface SendMessageResponse {
  userMessage: Message;
  jobId: string; // For tracking streaming response
}

// Regenerate Message
export interface RegenerateMessageRequest {
  conversationId: string;
  messageId: string;
  personaId?: string; // Optional: use different persona
}

export interface RegenerateMessageResponse {
  originalMessageId: string;
  jobId: string;
}

// Branch Conversation
export interface BranchConversationRequest {
  conversationId: string;
  fromMessageId: string;
  newTitle?: string;
}

export interface BranchConversationResponse {
  conversation: Conversation;
  copiedMessages: number;
}

// Message Feedback
export interface MessageFeedbackRequest {
  messageId: string;
  rating: number; // 1-5
  feedback?: string;
}

// Execute Action Proposal
export interface ExecuteActionRequest {
  conversationId: string;
  messageId: string;
  actionProposalId: string;
  approved: boolean;
  note?: string;
}

export interface ExecuteActionResponse {
  actionProposal: ActionProposal;
  executionJobId?: string;
}

// Chat Search
export interface ChatSearchRequest {
  workspaceId: string;
  query: string;
  projectId?: string;
  personaId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface ChatSearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  messageContent: string;
  messageRole: string;
  highlightedContent: string;
  createdAt: Date;
}

// Export Conversation
export interface ExportConversationRequest {
  conversationId: string;
  format: 'json' | 'markdown' | 'pdf';
  includeMetadata?: boolean;
}

export interface ExportConversationResponse {
  downloadUrl: string;
  expiresAt: Date;
}

// Memory Management
export interface ConversationMemoryRequest {
  conversationId: string;
}

export interface ConversationMemoryResponse {
  conversationId: string;
  memoryMode: MemoryMode;
  tokenCount: number;
  contextWindow: number;
  summaries: MemorySummary[];
}

export interface MemorySummary {
  id: string;
  content: string;
  messageRange: { start: string; end: string };
  createdAt: Date;
}

export interface UpdateMemoryRequest {
  conversationId: string;
  memoryMode: MemoryMode;
  clearHistory?: boolean;
}

// Tool Call Response (for tool result messages)
export interface ToolCallResultRequest {
  conversationId: string;
  messageId: string;
  toolCallId: string;
  result: unknown;
  error?: string;
}

// Streaming Types (for WebSocket)
export interface StreamingChatResponse {
  type: 'token' | 'tool_call' | 'citation' | 'action' | 'complete' | 'error';
  conversationId: string;
  messageId: string;
  data: StreamingData;
}

export type StreamingData =
  | TokenData
  | ToolCallData
  | CitationData
  | ActionData
  | CompleteData
  | ErrorData;

export interface TokenData {
  token: string;
  index: number;
}

export interface ToolCallData {
  toolCall: ToolCall;
  status: 'start' | 'complete' | 'error';
}

export interface CitationData {
  citation: Citation;
}

export interface ActionData {
  actionProposal: ActionProposal;
}

export interface CompleteData {
  message: Message;
  tokensUsed: number;
  latencyMs: number;
}

export interface ErrorData {
  code: string;
  message: string;
}
