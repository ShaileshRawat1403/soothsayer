import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

const SOCKET_URL = import.meta.env.VITE_WS_URL || '';

let socket: Socket | null = null;

export const initializeSocket = (): Socket => {
  if (socket?.connected) {
    return socket;
  }

  const token = useAuthStore.getState().token;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Socket event helpers
export const socketEvents = {
  // Chat streaming
  subscribeToChat: (conversationId: string) => {
    socket?.emit('chat:subscribe', { conversationId });
  },

  unsubscribeFromChat: (conversationId: string) => {
    socket?.emit('chat:unsubscribe', { conversationId });
  },

  onTokenStream: (callback: (data: { token: string; messageId: string }) => void) => {
    socket?.on('chat:token', callback);
    return () => socket?.off('chat:token', callback);
  },

  onMessageComplete: (callback: (data: { messageId: string; content: string }) => void) => {
    socket?.on('chat:complete', callback);
    return () => socket?.off('chat:complete', callback);
  },

  // Command execution
  subscribeToCommand: (executionId: string) => {
    socket?.emit('command:subscribe', { executionId });
  },

  unsubscribeFromCommand: (executionId: string) => {
    socket?.emit('command:unsubscribe', { executionId });
  },

  onCommandOutput: (callback: (data: { executionId: string; output: string; stream: 'stdout' | 'stderr' }) => void) => {
    socket?.on('command:output', callback);
    return () => socket?.off('command:output', callback);
  },

  onCommandComplete: (callback: (data: { executionId: string; exitCode: number }) => void) => {
    socket?.on('command:complete', callback);
    return () => socket?.off('command:complete', callback);
  },

  // Workflow execution
  subscribeToWorkflowRun: (runId: string) => {
    socket?.emit('workflow:subscribe', { runId });
  },

  onWorkflowProgress: (callback: (data: { runId: string; stepId: string; status: string; progress: number }) => void) => {
    socket?.on('workflow:progress', callback);
    return () => socket?.off('workflow:progress', callback);
  },

  onWorkflowComplete: (callback: (data: { runId: string; status: string; result?: unknown }) => void) => {
    socket?.on('workflow:complete', callback);
    return () => socket?.off('workflow:complete', callback);
  },

  // Approval requests
  onApprovalRequest: (callback: (data: { id: string; action: string; risk: string }) => void) => {
    socket?.on('approval:request', callback);
    return () => socket?.off('approval:request', callback);
  },

  approveRequest: (requestId: string) => {
    socket?.emit('approval:approve', { requestId });
  },

  rejectRequest: (requestId: string, reason?: string) => {
    socket?.emit('approval:reject', { requestId, reason });
  },
};

export default socket;
