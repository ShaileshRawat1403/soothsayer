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
} from 'lucide-react';
import { toast } from 'sonner';
import { MessageContent } from '@/components/chat/MessageContent';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  isStreaming?: boolean;
  metadata?: {
    provider?: string;
    model?: string;
  };
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

function getPersonaSuggestedPrompts(persona: { preferredTools?: string[]; capabilities?: string[] } | null): SuggestedPrompt[] {
  if (!persona) {
    return defaultSuggestedPrompts;
  }

  const hints = [
    ...(persona.preferredTools || []).map((v) => v.toLowerCase()),
    ...(persona.capabilities || []).map((v) => v.toLowerCase()),
  ];
  const has = (needle: string) => hints.some((h) => h.includes(needle));
  const personaPrompts: SuggestedPrompt[] = [];

  if (has('security') || has('vulnerability') || has('audit') || has('compliance')) {
    personaPrompts.push(
      { icon: Bug, label: 'Scan vulnerabilities', prompt: 'Scan this codebase for likely vulnerabilities:\n```\n\n```', color: 'text-red-500' },
      { icon: BookOpen, label: 'Audit logs', prompt: 'Audit these logs and identify suspicious events:\n```\n\n```', color: 'text-amber-500' },
    );
  }

  if (has('ci') || has('cd') || has('infra') || has('monitoring') || has('devops') || has('automation')) {
    personaPrompts.push(
      { icon: Zap, label: 'Troubleshoot deployment', prompt: 'Troubleshoot this deployment issue and provide a recovery plan:\n```\n\n```', color: 'text-orange-500' },
      { icon: Lightbulb, label: 'Create runbook', prompt: 'Create an operational runbook for ', color: 'text-green-500' },
    );
  }

  if (has('product') || has('strategy') || has('roadmap') || has('requirements') || has('research')) {
    personaPrompts.push(
      { icon: Wand2, label: 'Draft PRD', prompt: 'Draft a PRD for ', color: 'text-purple-500' },
      { icon: Lightbulb, label: 'Prioritize roadmap', prompt: 'Prioritize this roadmap with rationale:\n', color: 'text-blue-500' },
    );
  }

  if (has('architecture') || has('design') || has('performance') || has('code')) {
    personaPrompts.push(
      { icon: Code, label: 'Generate code', prompt: 'Write a TypeScript function that ', color: 'text-blue-500' },
      { icon: Wand2, label: 'Refactor code', prompt: 'Refactor this code for better performance:\n```\n\n```', color: 'text-purple-500' },
    );
  }

  const deduped = personaPrompts.filter(
    (item, index, arr) => arr.findIndex((candidate) => candidate.label === item.label) === index,
  );

  if (deduped.length >= 4) {
    return deduped.slice(0, 6);
  }

  return [...deduped, ...defaultSuggestedPrompts].slice(0, 6);
}

function mapApiMessageToUi(message: any): Message {
  return {
    id: String(message.id),
    role: message.role as 'user' | 'assistant' | 'system',
    content: String(message.content || ''),
    createdAt: String(message.createdAt || new Date().toISOString()),
    metadata:
      message.metadata && typeof message.metadata === 'object'
        ? {
            provider: message.metadata.provider,
            model: message.metadata.model,
          }
        : undefined,
  };
}

function improvePromptDraft(raw: string): string {
  const draft = raw.trim();
  if (!draft) return raw;

  return [
    'Please help with the following request.',
    '',
    `Task: ${draft}`,
    'Context: This request is from the Soothsayer web app chat.',
    'Constraints: Be practical, accurate, and concise. If assumptions are made, state them clearly.',
    'Output format: Provide a direct answer first, then numbered next steps.',
  ].join('\n');
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
  const { currentPersona, setCurrentPersona } = usePersonaStore();
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const { activeProvider, activeModel, providers, setActiveModel } = useAIProviderStore();

  const activeProviderConfig = providers.find((p) => p.id === activeProvider);
  const suggestedPrompts = useMemo(() => getPersonaSuggestedPrompts(currentPersona), [currentPersona]);

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
    const onPointerDown = (event: MouseEvent) => {
      if (!modelMenuRef.current) return;
      if (!modelMenuRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('soothsayer-chat-system-instructions') || '';
    setSystemInstructions(stored);
  }, []);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem('soothsayer-chat-system-instructions', systemInstructions);
  }, [systemInstructions]);

  useEffect(() => {
    async function loadConversation() {
      if (!activeConversationId) {
        setMessages([]);
        return;
      }

      setIsBootstrapping(true);
      try {
        const response = await apiHelpers.getConversation(activeConversationId);
        const conversation = response.data as any;
        const loadedMessages: Message[] = (conversation.messages || []).map(mapApiMessageToUi);
        setMessages((prev) => {
          const hasOptimistic = prev.some((m) => m.id.startsWith('temp-user-') || m.id.startsWith('temp-assistant-'));
          if (hasOptimistic && loadedMessages.length === 0) {
            return prev;
          }
          return loadedMessages;
        });
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

  const ensureWorkspaceId = async (): Promise<string> => {
    if (currentWorkspace?.id) {
      return currentWorkspace.id;
    }

    const response = await apiHelpers.getWorkspaces();
    const memberships = (response.data || []) as any[];
    const first = memberships[0];
    const workspace = first?.workspace || first;

    if (!workspace?.id) {
      throw new Error('No workspace found. Create a workspace first.');
    }

    setCurrentWorkspace(workspace);
    return workspace.id as string;
  };

  const ensurePersona = async (): Promise<{ id: string; name: string }> => {
    if (currentPersona?.id) {
      return { id: currentPersona.id, name: currentPersona.name };
    }

    const response = await apiHelpers.getPersonas({ page: 1, limit: 20, includeBuiltIn: true, includeCustom: true });
    const payload = response.data as any;
    const firstPersona = Array.isArray(payload?.personas) ? payload.personas[0] : null;

    if (!firstPersona?.id) {
      throw new Error('No persona found. Create or import a persona first.');
    }

    let personaDetails: any = null;
    try {
      const detailsResponse = await apiHelpers.getPersona(firstPersona.id);
      personaDetails = detailsResponse.data;
    } catch {
      personaDetails = null;
    }

    const config = personaDetails?.config && typeof personaDetails.config === 'object' ? personaDetails.config : {};
    const toolPreferences = Array.isArray((config as any).toolPreferences) ? (config as any).toolPreferences : [];

    setCurrentPersona({
      id: firstPersona.id,
      name: firstPersona.name,
      slug: firstPersona.slug || firstPersona.name?.toLowerCase().replace(/\s+/g, '-') || 'persona',
      category: firstPersona.category || 'General',
      description: firstPersona.description || '',
      icon: '🤖',
      color: 'bg-primary',
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1,
      capabilities: Array.isArray((config as any).expertiseTags) ? (config as any).expertiseTags : [],
      preferredTools: toolPreferences.map((tool: any) => String(tool?.toolId || '')).filter(Boolean),
      restrictions: [],
      responseStyle: { tone: 'friendly', verbosity: 'balanced', formatting: ['markdown'] },
      isDefault: false,
      isCustom: true,
      version: firstPersona.version || 1,
    });

    return { id: firstPersona.id, name: firstPersona.name };
  };

  const handleImprovePrompt = () => {
    if (!input.trim()) {
      toast.error('Type a draft prompt first');
      return;
    }
    const improved = improvePromptDraft(input);
    setInput(improved);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
    toast.success('Prompt improved');
  };

  const handleAttachClick = () => {
    if (isLoading || isBootstrapping || isParsingFile) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    try {
      const workspaceId = currentWorkspace?.id || (await ensureWorkspaceId());
      const response = await apiHelpers.uploadFile(workspaceId, file);
      const parsed = response.data as any;
      const text = String(parsed?.text || '').trim();
      if (!text) {
        throw new Error('No text extracted from file');
      }

      setAttachedFile({
        fileName: String(parsed?.fileName || file.name),
        text,
        truncated: Boolean(parsed?.truncated),
      });
      toast.success(`Attached ${file.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';
      toast.error(errorMessage);
    } finally {
      setIsParsingFile(false);
      e.target.value = '';
    }
  };

  const handleStopGeneration = () => {
    if (!isLoading) return;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    toast.message('Generation stopped');
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || isBootstrapping) return;

    const optimisticUserMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setIsLoading(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let conversationId = activeConversationId;
      const workspaceId = await ensureWorkspaceId();
      const persona = await ensurePersona();

      if (!conversationId) {
        const createResponse = await apiHelpers.createConversation({
          workspaceId,
          personaId: persona.id,
          title: text.slice(0, 80),
        });
        const createdConversation = createResponse.data as any;
        conversationId = createdConversation.id as string;
        setActiveConversationId(conversationId);
        navigate(`/chat/${conversationId}`, { replace: true });
      }

      const sendResponse = await apiHelpers.sendMessage(conversationId, {
        content: text,
        provider: activeProvider,
        model: activeModel,
        systemPrompt: systemInstructions.trim() || undefined,
        fileContext: attachedFile?.text,
        fileName: attachedFile?.fileName,
      }, {
        signal: abortController.signal,
      });
      const payload = sendResponse.data as any;
      const userMessage = payload?.userMessage;
      const assistantMessage = payload?.assistantMessage;

      if (userMessage || assistantMessage) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== optimisticUserMessage.id);
          const next = [...withoutTemp];

          if (userMessage) {
            const mappedUser = mapApiMessageToUi(userMessage);
            const existingUserIdx = next.findIndex((m) => m.id === mappedUser.id);
            if (existingUserIdx >= 0) {
              next[existingUserIdx] = mappedUser;
            } else {
              next.push(mappedUser);
            }
          } else if (!withoutTemp.some((m) => m.id === optimisticUserMessage.id)) {
            next.push(optimisticUserMessage);
          }

          if (assistantMessage) {
            const mappedAssistant = mapApiMessageToUi(assistantMessage);
            const existingAssistantIdx = next.findIndex((m) => m.id === mappedAssistant.id);
            if (existingAssistantIdx >= 0) {
              next[existingAssistantIdx] = mappedAssistant;
            } else {
              next.push(mappedAssistant);
            }
          }

          return next;
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `temp-assistant-${Date.now()}`,
            role: 'assistant',
            content: 'Message received. Assistant response is not available yet.',
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      setAttachedFile(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      if (errorMessage.toLowerCase().includes('canceled') || errorMessage.toLowerCase().includes('abort')) {
        setMessages((prev) => [
          ...prev,
          {
            id: `temp-assistant-stop-${Date.now()}`,
            role: 'assistant',
            content: 'Generation stopped.',
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        toast.error(errorMessage);
        setMessages((prev) => [
          ...prev,
          {
            id: `temp-assistant-error-${Date.now()}`,
            role: 'assistant',
            content: `Request failed: ${errorMessage}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
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

  const regenerateMessage = () => {
    if (!isLoading) {
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-background to-secondary/20">
      <div className="relative z-30 flex items-center justify-between border-b border-border bg-card/90 backdrop-blur-sm px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activeProviderConfig?.icon}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium">{activeProviderConfig?.name}</div>
              <div className="text-xs text-muted-foreground truncate max-w-[260px]" title={activeModel}>
                {activeProviderConfig?.models.find((m) => m.id === activeModel)?.name || activeModel}
              </div>
            </div>
          </div>
        </div>
        <div className="relative" ref={modelMenuRef}>
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Model</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', showModelSelector && 'rotate-180')} />
          </button>

          {showModelSelector && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-xl z-[80] animate-in fade-in slide-in-from-top-2">
              <div className="p-2 border-b border-border">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">Select Model</div>
              </div>
              <div className="max-h-64 overflow-auto p-2">
                {activeProviderConfig?.models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setActiveModel(model.id);
                      setShowModelSelector(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      activeModel === model.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent',
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {model.contextLength.toLocaleString()} tokens
                      </div>
                    </div>
                    {activeModel === model.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-0 flex-1 overflow-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="relative mb-8">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 blur-xl animate-pulse" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                <Bot className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold">How can I help you today?</h2>
            <p className="mb-8 max-w-md text-center text-muted-foreground">
              {currentPersona
                ? `I'm ${currentPersona.name}. ${currentPersona.description}`
                : 'Select a persona or start chatting with the default assistant'}
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => setInput(prompt.prompt)}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary/10', prompt.color)}>
                    <prompt.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn('flex gap-4 animate-in fade-in slide-in-from-bottom-2', message.role === 'user' ? 'flex-row-reverse' : '')}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-purple-600 text-white'
                      : 'bg-gradient-to-br from-secondary to-secondary/50 border border-border',
                  )}
                >
                  {message.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                <div
                  className={cn(
                    'group relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-purple-600 text-white'
                      : 'bg-card border border-border',
                  )}
                >
                  <MessageContent content={message.content} isUser={message.role === 'user'} isStreaming={message.isStreaming} />
                  {message.role === 'assistant' && message.metadata?.model && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Model: {message.metadata.provider ? `${message.metadata.provider}/` : ''}
                      {message.metadata.model}
                    </div>
                  )}

                  {!message.isStreaming && (
                    <div
                      className={cn(
                        'absolute -bottom-8 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100',
                        message.role === 'user' ? 'right-0' : 'left-0',
                      )}
                    >
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="flex h-7 items-center gap-1 rounded-lg bg-card border border-border px-2 text-xs shadow-sm hover:bg-accent transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                      {message.role === 'assistant' && (
                        <button
                          onClick={regenerateMessage}
                          className="flex h-7 items-center gap-1 rounded-lg bg-card border border-border px-2 text-xs shadow-sm hover:bg-accent transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating response...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <button
              onClick={() => setShowSystemInstructions((v) => !v)}
              className="rounded-lg border border-border bg-background px-3 py-1 text-xs hover:bg-accent transition-colors"
            >
              {showSystemInstructions ? 'Hide' : 'Show'} system instructions
            </button>
            {systemInstructions.trim() && (
              <span className="text-xs text-muted-foreground">Custom instructions active</span>
            )}
          </div>

          {showSystemInstructions && (
            <div className="mb-3 rounded-xl border border-border bg-background p-2">
              <textarea
                value={systemInstructions}
                onChange={(e) => setSystemInstructions(e.target.value)}
                placeholder="Set chat-level system instructions (applies to each message in this chat view)."
                rows={4}
                className="w-full resize-y bg-transparent p-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          {attachedFile && (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
              <span className="truncate text-muted-foreground">
                Attached: {attachedFile.fileName}
                {attachedFile.truncated ? ' (truncated to context limit)' : ''}
              </span>
              <button
                onClick={() => setAttachedFile(null)}
                disabled={isLoading}
                className="ml-2 rounded p-1 hover:bg-accent disabled:opacity-50"
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <button className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl hover:bg-accent transition-colors">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.md,.markdown,.log,.json,.yml,.yaml,text/plain,application/pdf"
              onChange={handleFileSelected}
            />

            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (Shift+Enter for new line)"
              rows={1}
              className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />

            <div className="flex items-center gap-1">
              <button
                onClick={handleImprovePrompt}
                disabled={!input.trim() || isLoading || isBootstrapping}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Improve
              </button>
              <button
                onClick={handleAttachClick}
                disabled={isLoading || isBootstrapping || isParsingFile}
                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
                title="Attach file"
              >
                {isParsingFile ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Paperclip className="h-5 w-5 text-muted-foreground" />}
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-accent transition-colors">
                <Mic className="h-5 w-5 text-muted-foreground" />
              </button>
              <button
                onClick={isLoading ? handleStopGeneration : handleSend}
                disabled={isBootstrapping || (!isLoading && !input.trim())}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 transition-all hover:scale-105 disabled:hover:scale-100"
              >
                {isLoading ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between px-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {currentPersona && (
                <span className="flex items-center gap-1">
                  <span>{currentPersona.icon}</span>
                  <span>{currentPersona.name}</span>
                </span>
              )}
            </div>
            <span>Press Enter to send • Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
