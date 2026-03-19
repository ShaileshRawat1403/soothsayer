import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePersonaStore } from '@/stores/persona.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useAIProviderStore } from '@/stores/ai-provider.store';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Send,
  Plus,
  Loader2,
  Copy,
  RefreshCw,
  Bot,
  User,
  Code,
  Lightbulb,
  Wand2,
  Bug,
  Zap,
  BookOpen,
  Settings,
  Paperclip,
  Mic,
  Check,
  ChevronDown,
  Square,
  X,
  ArrowUpRight,
  ShieldCheck,
  Terminal,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { MessageContent } from '@/components/chat/MessageContent';
import type { DaxRunStatus } from '@/types/dax';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  isStreaming?: boolean;
  metadata?: {
    provider?: string;
    model?: string;
    personaId?: string;
    handoff?: {
      type: 'dax_run';
      runId: string;
      status?: DaxRunStatus;
      targetPath: string;
      targeting?: {
        mode: 'explicit_repo_path' | 'default_cwd';
        repoPath?: string;
      };
    };
  };
}

function formatHandoffStatus(status?: DaxRunStatus): string {
  switch (status) {
    case 'waiting_approval':
      return 'Intervention required';
    case 'completed':
      return 'Target state achieved';
    case 'failed':
      return 'Execution terminated';
    case 'running':
      return 'In progress';
    default:
      return 'Context initialized';
  }
}

function handoffStatusClasses(status?: DaxRunStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
    case 'failed':
    case 'cancelled':
      return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';
    case 'waiting_approval':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
    default:
      return 'bg-primary/5 text-primary border-primary/10';
  }
}

type SuggestedPrompt = {
  icon: typeof Code;
  label: string;
  prompt: string;
  color: string;
};

const defaultSuggestedPrompts: SuggestedPrompt[] = [
  { icon: Code, label: 'Generate code', prompt: 'Write a TypeScript function that ', color: 'text-blue-500' },
  { icon: Bug, label: 'Debug code', prompt: 'Help me debug this code:\n```\n\n```', color: 'text-red-500' },
  { icon: Lightbulb, label: 'Explain concept', prompt: 'Explain the concept of ', color: 'text-amber-500' },
  { icon: Wand2, label: 'Refactor code', prompt: 'Refactor this code for better performance:\n```\n\n```', color: 'text-purple-500' },
  { icon: BookOpen, label: 'Write docs', prompt: 'Write documentation for ', color: 'text-green-500' },
  { icon: Zap, label: 'Optimize', prompt: 'Optimize this code:\n```\n\n```', color: 'text-orange-500' },
];

function getPersonaSuggestedPrompts(persona: any | null): SuggestedPrompt[] {
  if (!persona) return defaultSuggestedPrompts;
  return defaultSuggestedPrompts.slice(0, 6);
}

function mapApiMessageToUi(message: any): Message {
  return {
    id: String(message.id),
    role: message.role as 'user' | 'assistant' | 'system',
    content: String(message.content || ''),
    createdAt: String(message.createdAt || new Date().toISOString()),
    metadata: message.metadata,
  };
}

export function ChatPage() {
  const { conversationId: routeConversationId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(routeConversationId || null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showSystemInstructions, setShowSystemInstructions] = useState(false);
  const [systemInstructions, setSystemInstructions] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    fileName: string;
    text: string;
    truncated?: boolean;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSendingRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const { currentPersona, setCurrentPersona, personas: allPersonas } = usePersonaStore();
  const { currentWorkspace, currentProject, setCurrentWorkspace } = useWorkspaceStore();
  const { activeProvider, activeModel, providers, setActiveModel } = useAIProviderStore();

  const activeProviderConfig = providers.find((p) => p.id === activeProvider);
  const suggestedPrompts = useMemo(() => getPersonaSuggestedPrompts(currentPersona), [currentPersona]);
  const workspaceSettings =
    currentWorkspace?.settings && typeof currentWorkspace.settings === 'object'
      ? (currentWorkspace.settings as Record<string, unknown>)
      : null;
  const inferredChatRepoPath =
    typeof workspaceSettings?.repoPath === 'string'
      ? workspaceSettings.repoPath
      : typeof workspaceSettings?.defaultRepoPath === 'string'
        ? workspaceSettings.defaultRepoPath
        : typeof workspaceSettings?.targetRepoPath === 'string'
          ? workspaceSettings.targetRepoPath
          : undefined;

  useEffect(() => {
    setActiveConversationId(routeConversationId || null);
  }, [routeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    async function loadConversation() {
      const requestId = ++loadRequestIdRef.current;
      if (!activeConversationId) {
        setMessages([]);
        return;
      }

      setIsBootstrapping(true);
      try {
        const response = await apiHelpers.getConversation(activeConversationId);
        if (requestId !== loadRequestIdRef.current) return;
        const conversation = response.data as any;
        const loadedMessages: Message[] = (conversation.messages || []).map(mapApiMessageToUi);
        setMessages(loadedMessages);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load conversation';
        toast.error(errorMessage);
      } finally {
        setIsBootstrapping(false);
      }
    }
    loadConversation();
  }, [activeConversationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || isBootstrapping || isSendingRef.current) return;
    isSendingRef.current = true;

    const optimisticUserMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let conversationId = activeConversationId;
      if (!conversationId) {
        const response = await apiHelpers.getPersonas();
        const persona = response.data.personas[0];
        const createResponse = await apiHelpers.createConversation({
          workspaceId: currentWorkspace?.id || 'default',
          personaId: persona.id,
          title: text.slice(0, 80),
        });
        conversationId = createResponse.data.id;
        setActiveConversationId(conversationId);
        navigate(`/chat/${conversationId}`, { replace: true });
      }

      const sendResponse = await apiHelpers.sendMessage(conversationId!, {
        content: text,
        provider: activeProvider,
        model: activeModel,
        fileContext: attachedFile?.text,
        fileName: attachedFile?.fileName,
      }, {
        signal: abortController.signal,
      });
      const payload = sendResponse.data as any;
      if (payload.assistantMessage) {
        const mapped = mapApiMessageToUi(payload.assistantMessage);
        setMessages((prev) => [...prev.filter(m => m.id !== optimisticUserMessage.id), optimisticUserMessage, mapped]);
      }
      setAttachedFile(null);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-md px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/10">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {currentPersona?.name || 'Authority Assistant'}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Deterministic Interaction
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-secondary px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Cpu className="h-3 w-3" />
            {activeModel || 'Standard Engine'}
          </div>
          <button className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto scroll-smooth">
        <div className="mx-auto max-w-4xl px-6 py-12 space-y-10">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 rounded-[2.5rem] bg-secondary flex items-center justify-center mb-8 shadow-apple">
                <Zap className="h-10 w-10 text-primary/40" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">How can I assist your execution?</h1>
              <p className="mt-4 text-muted-foreground max-w-md font-medium leading-relaxed">
                Initialize an intent or query the authority about your environment.
              </p>
              
              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => setInput(prompt.prompt)}
                    className="group card-professional p-6 text-left hover:border-primary/30 hover:shadow-apple-lg"
                  >
                    <div className={cn('h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center mb-4 transition-colors group-hover:bg-primary/5', prompt.color)}>
                      <prompt.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-bold text-foreground">{prompt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={message.id} className={cn('flex gap-6 animate-slide-in-from-bottom', message.role === 'user' ? 'flex-row-reverse' : '')}>
                <div className={cn(
                  'h-10 w-10 flex-shrink-0 rounded-2xl flex items-center justify-center shadow-sm border border-border/50',
                  message.role === 'user' ? 'bg-primary text-white' : 'bg-muted/50'
                )}>
                  {message.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                
                <div className={cn(
                  'relative max-w-[80%] flex flex-col gap-2',
                  message.role === 'user' ? 'items-end' : 'items-start'
                )}>
                  <div className={cn(
                    'rounded-[2rem] px-6 py-4 shadow-apple border',
                    message.role === 'user' ? 'bg-primary text-white border-primary' : 'bg-card border-border'
                  )}>
                    <MessageContent content={message.content} isUser={message.role === 'user'} isStreaming={message.isStreaming} />
                  </div>

                  {/* Handoff Card V2 */}
                  {message.role === 'assistant' && message.metadata?.handoff?.type === 'dax_run' && (
                    <div className="mt-4 w-full card-professional overflow-hidden border-primary/20 bg-primary/[0.01]">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                              <Terminal className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Execution Moved</div>
                              <h3 className="text-sm font-bold text-foreground">Authority Context Active</h3>
                            </div>
                          </div>
                          <div className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest', handoffStatusClasses(message.metadata.handoff.status))}>
                            {formatHandoffStatus(message.metadata.handoff.status)}
                          </div>
                        </div>

                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                          This request will be executed in a controlled run. Watch progress and handle approvals in the live console.
                        </p>

                        <div className="mt-8 grid grid-cols-2 gap-4">
                          <div className="rounded-2xl border border-border bg-muted/20 p-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Execution Engine</span>
                            <div className="flex items-center gap-2">
                              <Cpu className="h-3 w-3 text-primary/60" />
                              <span className="text-[11px] font-bold text-foreground">{message.metadata.provider || 'System Default'}</span>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-border bg-muted/20 p-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Behavioral Persona</span>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-primary/60" />
                              <span className="text-[11px] font-bold text-foreground truncate">
                                {allPersonas.find(p => p.id === message.metadata?.personaId)?.name || 'Architect'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-6">
                          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                            Run: {message.metadata.handoff.runId.substring(0, 16)}...
                          </div>
                          <button
                            onClick={() => navigate(message.metadata!.handoff!.targetPath)}
                            className="rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/10 hover:opacity-90 flex items-center gap-2 transition-all active:scale-95"
                          >
                            Open Live Run
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-border bg-card/50 backdrop-blur-md p-6">
        <div className="mx-auto max-w-4xl">
          <div className="relative flex items-end gap-4 rounded-[2rem] border border-border bg-background p-3 shadow-apple-lg focus-within:border-primary/30 transition-all">
            <button className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-2xl hover:bg-secondary transition-colors">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Initialize intent..."
              rows={1}
              className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent py-3 text-[15px] font-medium outline-none placeholder:text-muted-foreground/40"
            />
            <div className="flex items-center gap-2 pr-1">
              <button onClick={handleSend} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/10 hover:scale-105 transition-all">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 px-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            <span>Synchronous Handoff Enabled</span>
            <span>Press Enter to initialize</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
