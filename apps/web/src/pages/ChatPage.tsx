import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/stores/chat.store';
import { usePersonaStore } from '@/stores/persona.store';
import { cn } from '@/lib/utils';
import {
  Send,
  Plus,
  Loader2,
  Copy,
  RefreshCw,
  MoreHorizontal,
  Bot,
  User,
  Sparkles,
  Code,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

const suggestedPrompts = [
  { icon: Code, label: 'Write a function', prompt: 'Write a TypeScript function that...' },
  { icon: FileText, label: 'Explain code', prompt: 'Explain this code:' },
  { icon: Sparkles, label: 'Review code', prompt: 'Review this code for best practices:' },
];

export function ChatPage() {
  const { conversationId } = useParams();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { currentPersona } = usePersonaStore();
  const { isStreaming, streamingContent } = useChatStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I understand you're asking about: "${userMessage.content}"\n\nAs ${currentPersona?.name || 'your AI assistant'}, I'm here to help. This is a demo response - in the full implementation, this would connect to the backend AI service and stream responses in real-time.\n\nSome key features:\n- **Streaming responses** for real-time feedback\n- **Tool calling** for executing actions\n- **Memory modes** for context management\n- **Persona-aware** responses\n\nHow can I help you further?`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Start a conversation</h2>
            <p className="mb-8 max-w-md text-center text-muted-foreground">
              {currentPersona
                ? `Chat with ${currentPersona.name} - ${currentPersona.description}`
                : 'Select a persona or start chatting with the default assistant'}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => setInput(prompt.prompt)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-accent"
                >
                  <prompt.icon className="h-4 w-4 text-primary" />
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'group relative max-w-[80%] rounded-lg px-4 py-3',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary'
                  )}
                >
                  <div className="prose-chat whitespace-pre-wrap">{message.content}</div>
                  <div
                    className={cn(
                      'absolute -bottom-8 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100',
                      message.role === 'user' ? 'right-0' : 'left-0'
                    )}
                  >
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-card shadow-sm hover:bg-accent"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {message.role === 'assistant' && (
                      <button className="flex h-7 w-7 items-center justify-center rounded-md bg-card shadow-sm hover:bg-accent">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button className="flex h-7 w-7 items-center justify-center rounded-md bg-card shadow-sm hover:bg-accent">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative flex items-end gap-2">
            <button className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border hover:bg-accent">
              <Plus className="h-5 w-5" />
            </button>
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                className="max-h-32 min-h-[40px] w-full resize-none rounded-lg border border-input bg-background px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                style={{
                  height: 'auto',
                  overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {currentPersona
                ? `Chatting as ${currentPersona.name}`
                : 'No persona selected'}
            </span>
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
