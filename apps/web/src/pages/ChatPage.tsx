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
  Bot,
  User,
  Wand2,
  Zap,
  Settings,
  Check,
  ChevronDown,
  Square,
  X,
  ArrowUpRight,
  ShieldCheck,
  Terminal,
  Cpu,
  Sparkles,
  AlignLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
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
      return 'Authorization Node';
    case 'completed':
      return 'Trace Validated';
    case 'failed':
      return 'Fault Encountered';
    case 'running':
      return 'Active Execution';
    default:
      return 'Established';
  }
}

export function ChatPage() {
  const { conversationId: routeConversationId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    routeConversationId || null
  );
  const [showSystemPanel, setShowSystemPanel] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { currentPersona, personas: allPersonas } = usePersonaStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { activeProvider, activeModel } = useAIProviderStore();

  useEffect(() => {
    setActiveConversationId(routeConversationId || null);
  }, [routeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    async function loadConversation() {
      if (!activeConversationId) {
        setMessages([]);
        return;
      }
      setIsBootstrapping(true);
      try {
        const response = await apiHelpers.getConversation(activeConversationId);
        const loadedMessages: Message[] = (response.data.messages || []).map((m: any) => ({
          id: String(m.id),
          role: m.role as any,
          content: String(m.content || ''),
          createdAt: String(m.createdAt || new Date().toISOString()),
          metadata: m.metadata,
        }));
        setMessages(loadedMessages);
      } catch (error) {
        toast.error('Sync failed');
      } finally {
        setIsBootstrapping(false);
      }
    }
    loadConversation();
  }, [activeConversationId]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || isLoading || isBootstrapping) return;

    const optimisticUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);

    try {
      let conversationId = activeConversationId;
      if (!conversationId) {
        const createResponse = await apiHelpers.createConversation({
          workspaceId: currentWorkspace?.id || 'default',
          personaId: currentPersona?.id || 'standard',
          title: text.slice(0, 60),
        });
        conversationId = createResponse.data.id;
        setActiveConversationId(conversationId);
        navigate(`/chat/${conversationId}`, { replace: true });
      }

      const response = await apiHelpers.sendMessage(conversationId!, {
        content: text,
        provider: activeProvider,
        model: activeModel,
      });

      if (response.data.assistantMessage) {
        const mapped: Message = {
          id: String(response.data.assistantMessage.id),
          role: 'assistant',
          content: String(response.data.assistantMessage.content),
          createdAt: new Date().toISOString(),
          metadata: response.data.assistantMessage.metadata,
        };
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticUserMessage.id),
          optimisticUserMessage,
          mapped,
        ]);
      }
    } catch (error) {
      toast.error('Node failure');
    } finally {
      setIsLoading(false);
    }
  };

  const refinePrompt = async () => {
    if (!input.trim() || isRefining) return;
    setIsRefining(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const refined = `[High-Fidelity Requirement] ${input}\n\nPlease ensure full context adherence and provide deterministic output.`;
      setInput(refined);
      toast.success('Prompt optimized');
    } catch (error) {
      toast.error('Refinement fault');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.01] to-transparent z-0" />

      <div className="flex-1 flex flex-col relative z-10">
        <header className="h-14 border-b border-border/30 bg-background/40 backdrop-blur-3xl px-4 md:px-10 flex items-center justify-between shrink-0 transition-all duration-500">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <h2 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-secondary-content truncate max-w-[100px] md:max-w-none">
                {currentPersona?.name || 'Authority'}
              </h2>
            </div>
            <div className="hidden xs:block h-4 w-px bg-border/40" />
            <div className="hidden xs:flex items-center gap-2.5 px-3 py-1 rounded-lg bg-muted/20 border border-border/40 hover-glow">
              <Cpu className="h-3.5 w-3.5 text-secondary-content" />
              <span className="text-[10px] font-black text-secondary-content uppercase tracking-widest leading-none truncate max-w-[80px] md:max-w-none">
                {activeModel || 'Inherited'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowSystemPanel(!showSystemPanel)}
            className={cn(
              'flex items-center gap-2.5 px-3 md:px-4 py-2 rounded-xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest',
              showSystemPanel
                ? 'bg-primary text-white shadow-lg'
                : 'text-secondary-content hover:bg-muted/50'
            )}
          >
            <AlignLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Policy Node</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-none">
          <div className="max-w-4xl mx-auto px-6 md:px-12 py-10 md:py-20 space-y-10 md:space-y-14">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-start gap-8 md:gap-10"
                >
                  <div className="flex items-center gap-4 md:gap-5">
                    <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/10">
                      <Sparkles className="h-6 w-6 md:h-7 md:w-7" />
                    </div>
                    <div className="space-y-1">
                      <h1 className="text-2xl md:text-4xl font-black tracking-tighter">Synchronize Intent</h1>
                      <p className="text-sm md:text-base font-medium text-secondary-content leading-relaxed">
                        Establish a high-fidelity execution context for the authority.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 w-full sm:grid-cols-2">
                    {[
                      {
                        l: 'Debug runtime fault',
                        p: 'Analyze this trace for memory leaks:\n```\n\n```',
                      },
                      {
                        l: 'Generate access protocol',
                        p: 'Implement a zero-trust auth layer for ',
                      },
                      {
                        l: 'Refactor logic audit',
                        p: 'Rewrite this for deterministic performance:\n```\n\n```',
                      },
                      {
                        l: 'Audit governance',
                        p: 'Scan the repository structure for policy violations.',
                      },
                    ].map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInput(s.p);
                          handleSend(s.p);
                        }}
                        className="group flex items-center justify-between p-5 md:p-6 rounded-2xl border border-border/40 bg-card/10 hover-lift hover-glow text-left active:scale-[0.98]"
                      >
                        <span className="text-[12px] md:text-[13px] font-bold text-secondary-content group-hover:text-foreground transition-colors">
                          {s.l}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-content group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex gap-4 md:gap-10 transition-all',
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    )}
                  >
                    <div
                      className={cn(
                        'h-8 w-8 md:h-10 md:w-10 rounded-xl flex items-center justify-center shrink-0 border border-border/40 shadow-sm transition-transform duration-500 hover:scale-105',
                        message.role === 'user' ? 'bg-primary text-white' : 'bg-card text-primary'
                      )}
                    >
                      {message.role === 'user' ? (
                        <User className="h-4 w-4 md:h-5 md:w-5" />
                      ) : (
                        <Bot className="h-4 w-4 md:h-5 md:w-5" />
                      )}
                    </div>

                    <div
                      className={cn(
                        'max-w-[90%] md:max-w-[85%] space-y-4 md:space-y-5',
                        message.role === 'user' ? 'text-right items-end' : 'text-left items-start'
                      )}
                    >
                      <div
                        className={cn(
                          'inline-block rounded-2xl md:rounded-3xl px-5 py-3 md:px-7 md:py-5 border shadow-nuance prose-refined',
                          message.role === 'user'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-card border-border/60'
                        )}
                      >
                        <MessageContent
                          content={message.content}
                          isUser={message.role === 'user'}
                        />
                      </div>

                      {message.role === 'assistant' &&
                        message.metadata?.handoff?.type === 'dax_run' && (
                          <div className="w-full rounded-2xl md:rounded-3xl border border-primary/10 bg-primary/[0.01] overflow-hidden p-6 md:p-8 hover-glow transition-all duration-500">
                            <div className="flex items-center justify-between mb-6 md:mb-8">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                  <Terminal className="h-4 w-4 md:h-5 md:w-5" />
                                </div>
                                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-secondary-content">
                                  Execution Moved
                                </span>
                              </div>
                              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-primary/5 text-primary border border-primary/10">
                                {formatHandoffStatus(message.metadata.handoff.status)}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-6 md:mb-8">
                              <div className="rounded-xl md:rounded-2xl border border-border/40 bg-background/40 p-4 md:p-5 space-y-1">
                                <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60 block">Engine node</span>
                                <span className="text-[10px] md:text-[11px] font-bold text-foreground truncate block uppercase tracking-tight">
                                  {message.metadata.provider || 'Inherited'}
                                </span>
                              </div>
                              <div className="rounded-xl md:rounded-2xl border border-border/40 bg-background/40 p-4 md:p-5 space-y-1">
                                <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60 block">Identity node</span>
                                <span className="text-[10px] md:text-[11px] font-bold text-foreground truncate block uppercase tracking-tight">
                                  {allPersonas.find((p) => p.id === message.metadata?.personaId)
                                    ?.name || 'Architect'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => navigate(message.metadata!.handoff!.targetPath)}
                              className="w-full rounded-xl bg-primary py-3 md:py-4 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-primary/10 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                              Open Live Console
                              <ArrowUpRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </button>
                          </div>
                        )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="px-4 md:px-12 py-6 md:py-10 bg-background relative z-20 transition-all duration-500">
          <div className="max-w-4xl mx-auto space-y-4 md:space-y-5">
            <div className="relative group transition-all">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-[2rem] md:rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition duration-1000" />
              <div className="relative flex items-end gap-3 md:gap-5 rounded-[2rem] md:rounded-[2.5rem] border border-border/60 bg-background p-3 md:p-4 shadow-inner focus-within:border-primary/20 transition-all duration-500">
                <button className="h-10 w-10 md:h-11 md:w-11 flex-shrink-0 flex items-center justify-center rounded-xl md:rounded-2xl icon-container">
                  <Plus className="h-5 w-5 md:h-6 md:w-6" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 400) + 'px';
                  }}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())
                  }
                  placeholder="Dispatch autonomous instruction..."
                  className="flex-1 max-h-96 min-h-[44px] md:min-h-[48px] resize-none bg-transparent py-2.5 md:py-3.5 text-sm md:text-[15px] font-medium outline-none text-placeholder-content leading-relaxed transition-all"
                />
                <div className="flex items-center gap-2 md:gap-3 pb-1 md:pb-1.5 pr-1 md:pr-1.5">
                  <button
                    onClick={refinePrompt}
                    disabled={!input.trim() || isRefining}
                    className="h-10 w-10 md:h-11 md:w-11 flex items-center justify-center rounded-xl md:rounded-2xl icon-container hover:bg-primary/5 disabled:opacity-0"
                  >
                    {isRefining ? (
                      <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className="h-10 w-10 md:h-11 md:w-11 flex items-center justify-center rounded-xl md:rounded-2xl bg-primary text-white shadow-lg shadow-primary/10 hover:opacity-90 active:scale-90 transition-all disabled:opacity-20"
                  >
                    <Send className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-8 gap-3 text-meta text-muted-content">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3" /> <span className="text-[9px] uppercase font-black tracking-widest">Governance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3" /> <span className="text-[9px] uppercase font-black tracking-widest">Handoff</span>
                </div>
              </div>
              <span className="text-[9px] uppercase font-black tracking-widest opacity-70 transition-opacity group-focus-within:opacity-100">
                Ready for Dispatch
              </span>
            </div>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {showSystemPanel && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: window.innerWidth < 640 ? '100%' : 440, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 right-0 sm:relative border-l border-border/30 bg-background/95 sm:bg-background/40 backdrop-blur-3xl relative z-30 flex flex-col shadow-2xl"
          >
            <div className="p-6 md:p-10 border-b border-border/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <ShieldAlert className="h-5 w-5 text-primary/40" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">
                  System Directive
                </h3>
              </div>
              <button
                onClick={() => setShowSystemPanel(false)}
                className="p-2 text-muted-content hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 md:space-y-12 scrollbar-none">
              <div className="space-y-5">
                <label className="text-label-sm ml-1">Operational Boundary</label>
                <div className="rounded-[1.5rem] md:rounded-[2rem] border border-border/40 bg-muted/10 p-6 md:p-8 leading-relaxed text-sm md:text-[15px] font-medium text-secondary-content italic shadow-inner">
                  "
                  {currentPersona?.systemPrompt ||
                    'Assistant operating under standard governed protocols.'}
                  "
                </div>
              </div>

              <div className="space-y-8 pt-10 md:pt-12 border-t border-border/20">
                <label className="text-label-sm ml-1">Authorizations</label>
                <div className="flex flex-wrap gap-2.5">
                  {(currentPersona?.capabilities || ['Logic Trace', 'Context Audit']).map(
                    (cap: string) => (
                      <span
                        key={cap}
                        className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-background border border-border/60 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-secondary-content shadow-sm hover-glow"
                      >
                        {cap}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
