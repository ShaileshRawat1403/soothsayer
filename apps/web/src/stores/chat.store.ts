import { create } from 'zustand';

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    toolCalls?: Array<{
      id: string;
      name: string;
      arguments: Record<string, unknown>;
      result?: unknown;
    }>;
    citations?: Array<{
      source: string;
      text: string;
    }>;
    model?: string;
    tokens?: {
      prompt: number;
      completion: number;
    };
  };
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  workspaceId: string;
  projectId?: string;
  personaId?: string;
  memoryMode: 'none' | 'session' | 'persistent';
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isStreaming: boolean;
  streamingContent: string;
  isLoading: boolean;
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, data: Partial<Message>) => void;
  
  setStreaming: (streaming: boolean) => void;
  appendStreamingContent: (content: string) => void;
  clearStreamingContent: () => void;
  
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversation: null,
  isStreaming: false,
  streamingContent: '',
  isLoading: false,
  
  setConversations: (conversations) => set({ conversations }),
  
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  
  addConversation: (conversation) =>
    set((state) => ({ conversations: [conversation, ...state.conversations] })),
  
  updateConversation: (id, data) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
      currentConversation:
        state.currentConversation?.id === id
          ? { ...state.currentConversation, ...data }
          : state.currentConversation,
    })),
  
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversation:
        state.currentConversation?.id === id ? null : state.currentConversation,
    })),
  
  addMessage: (conversationId, message) =>
    set((state) => {
      const updateConv = (conv: Conversation) =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, message] }
          : conv;
      
      return {
        conversations: state.conversations.map(updateConv),
        currentConversation: state.currentConversation
          ? updateConv(state.currentConversation)
          : null,
      };
    }),
  
  updateMessage: (conversationId, messageId, data) =>
    set((state) => {
      const updateConv = (conv: Conversation) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.map((m) =>
                m.id === messageId ? { ...m, ...data } : m
              ),
            }
          : conv;
      
      return {
        conversations: state.conversations.map(updateConv),
        currentConversation: state.currentConversation
          ? updateConv(state.currentConversation)
          : null,
      };
    }),
  
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  
  appendStreamingContent: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),
  
  clearStreamingContent: () => set({ streamingContent: '' }),
  
  setLoading: (loading) => set({ isLoading: loading }),
}));
