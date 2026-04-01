import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Command,
  History,
  Loader2,
  Play,
  Shield,
  Sparkles,
  Square,
  TerminalSquare,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiHelpers, streamTerminalCommand } from '@/lib/api';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';

type CommandExecution = {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  status: 'running' | 'completed' | 'failed';
  exitCode?: number;
  startedAt: string;
  completedAt?: string;
  executionMode?: 'direct' | 'allowlisted';
  cwd?: string;
  durationMs?: number;
  timedOut?: boolean;
  truncated?: boolean;
};

type CommandHistoryEntry = {
  command: string;
  lastRunAt: string;
  count: number;
};

type AllowlistedCommand = {
  id: string;
  name: string;
  category?: string;
  template?: string;
};

type SavedSnippet = {
  id: string;
  name: string;
  command: string;
  mode: 'local' | 'dax';
  createdAt: string;
};

const TERMINAL_HISTORY_STORAGE_KEY = 'soothsayer-terminal-history-v1';
const TERMINAL_SNIPPETS_STORAGE_KEY = 'soothsayer-terminal-snippets-v1';
const MAX_HISTORY_ITEMS = 40;
const MAX_SNIPPETS = 20;

const commandTemplates = [
  {
    category: 'Git',
    commands: ['git status', 'git log --oneline -10', 'git diff --stat'],
  },
  {
    category: 'Node',
    commands: ['pnpm --version', 'pnpm --filter @soothsayer/api build', 'pnpm --filter @soothsayer/web build'],
  },
  {
    category: 'Repo',
    commands: ['ls', 'pwd', 'find apps -maxdepth 2 -type d | head'],
  },
];

function resolveRepoPath(settings: unknown): string | undefined {
  if (!settings || typeof settings !== 'object') {
    return undefined;
  }

  const record = settings as Record<string, unknown>;
  const candidates = [
    record.rootPath,
    record.repoPath,
    record.defaultRepoPath,
    record.targetRepoPath,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
}

function readHistoryFromStorage(): CommandHistoryEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(TERMINAL_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHistory(entries: CommandHistoryEntry[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    TERMINAL_HISTORY_STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_HISTORY_ITEMS)),
  );
}

function readSnippetsFromStorage(): SavedSnippet[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(TERMINAL_SNIPPETS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSnippets(entries: SavedSnippet[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    TERMINAL_SNIPPETS_STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_SNIPPETS)),
  );
}

export function TerminalPage() {
  const navigate = useNavigate();
  const { currentWorkspace, currentProject, setCurrentWorkspace } = useWorkspaceStore();
  const [input, setInput] = useState('');
  const [executions, setExecutions] = useState<CommandExecution[]>([]);
  const [historyEntries, setHistoryEntries] = useState<CommandHistoryEntry[]>(() => readHistoryFromStorage());
  const [savedSnippets, setSavedSnippets] = useState<SavedSnippet[]>(() => readSnippetsFromStorage());
  const [allowlistedCommands, setAllowlistedCommands] = useState<AllowlistedCommand[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isDaxLaunching, setIsDaxLaunching] = useState(false);
  const [preferredMode, setPreferredMode] = useState<'local' | 'dax'>('local');
  const [snippetName, setSnippetName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const historyCursorRef = useRef<number>(-1);

  const workspaceSettings =
    currentWorkspace?.settings && typeof currentWorkspace.settings === 'object'
      ? currentWorkspace.settings
      : null;

  const inferredRepoPath = resolveRepoPath(workspaceSettings);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    persistHistory(historyEntries);
  }, [historyEntries]);

  useEffect(() => {
    persistSnippets(savedSnippets);
  }, [savedSnippets]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [executions]);

  useEffect(() => {
    const loadAllowlistedCommands = async () => {
      if (!currentWorkspace?.id) {
        return;
      }

      try {
        const response = await apiHelpers.getCommands(currentWorkspace.id);
        const payload = response.data as { commands?: AllowlistedCommand[] } | AllowlistedCommand[];
        const commands = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.commands)
            ? payload.commands
            : [];
        setAllowlistedCommands(commands.slice(0, 8));
      } catch {
        setAllowlistedCommands([]);
      }
    };

    void loadAllowlistedCommands();
  }, [currentWorkspace?.id]);

  const recentHistory = useMemo(
    () => [...historyEntries].sort((left, right) => right.lastRunAt.localeCompare(left.lastRunAt)),
    [historyEntries],
  );

  const orderedSnippets = useMemo(
    () => [...savedSnippets].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [savedSnippets],
  );

  const ensureWorkspaceId = async () => {
    if (currentWorkspace?.id) {
      return currentWorkspace.id;
    }

    const workspacesResponse = await apiHelpers.getWorkspaces();
    const workspaces = Array.isArray(workspacesResponse.data) ? workspacesResponse.data : [];
    const first = workspaces[0]?.workspace || workspaces[0];
    if (!first?.id) {
      throw new Error('No workspace found.');
    }

    setCurrentWorkspace(first);
    return first.id as string;
  };

  const updateExecution = (executionId: string, updater: (current: CommandExecution) => CommandExecution) => {
    setExecutions((current) =>
      current.map((execution) => (execution.id === executionId ? updater(execution) : execution)),
    );
  };

  const pushHistory = (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) {
      return;
    }

    setHistoryEntries((current) => {
      const now = new Date().toISOString();
      const existing = current.find((entry) => entry.command === trimmed);
      const next = existing
        ? current.map((entry) =>
            entry.command === trimmed
              ? { ...entry, count: entry.count + 1, lastRunAt: now }
              : entry,
          )
        : [{ command: trimmed, count: 1, lastRunAt: now }, ...current];

      return next
        .sort((left, right) => right.lastRunAt.localeCompare(left.lastRunAt))
        .slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const saveCurrentSnippet = () => {
    const command = input.trim();
    const name = snippetName.trim() || command;
    if (!command) {
      toast.error('Enter a command before saving a snippet');
      return;
    }

    setSavedSnippets((current) => {
      const existing = current.find((entry) => entry.name === name);
      const nextEntry: SavedSnippet = {
        id: existing?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        command,
        mode: preferredMode,
        createdAt: new Date().toISOString(),
      };

      const remaining = current.filter((entry) => entry.name !== name);
      return [nextEntry, ...remaining].slice(0, MAX_SNIPPETS);
    });

    setSnippetName('');
    toast.success('Snippet saved');
  };

  const deleteSnippet = (snippetId: string) => {
    setSavedSnippets((current) => current.filter((entry) => entry.id !== snippetId));
  };

  const executeCommand = async () => {
    if (!input.trim() || isRunning) {
      return;
    }

    const command = input.trim();
    const executionId = `exec-${Date.now()}`;
    const execution: CommandExecution = {
      id: executionId,
      command,
      stdout: '',
      stderr: '',
      status: 'running',
      startedAt: new Date().toISOString(),
    };

    historyCursorRef.current = -1;
    pushHistory(command);
    setExecutions((current) => [...current, execution]);
    setInput('');
    setIsRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const workspaceId = await ensureWorkspaceId();
      await streamTerminalCommand(
        {
          workspaceId,
          command,
          cwd: '.',
        },
        {
          signal: controller.signal,
          onStart: (payload) => {
            updateExecution(executionId, (current) => ({
              ...current,
              cwd: payload.cwd,
              executionMode: payload.executionMode,
            }));
          },
          onChunk: (payload) => {
            updateExecution(executionId, (current) => ({
              ...current,
              stdout: payload.stream === 'stdout' ? current.stdout + payload.text : current.stdout,
              stderr: payload.stream === 'stderr' ? current.stderr + payload.text : current.stderr,
            }));
          },
          onComplete: (payload) => {
            updateExecution(executionId, (current) => ({
              ...current,
              status: payload.status,
              exitCode: payload.exitCode,
              durationMs: payload.durationMs,
              timedOut: payload.timedOut,
              truncated: payload.truncated,
              completedAt: payload.completedAt,
              cwd: payload.cwd,
              executionMode: payload.executionMode,
            }));
          },
          onError: (message) => {
            updateExecution(executionId, (current) => ({
              ...current,
              stderr: `${current.stderr}${current.stderr ? '\n' : ''}${message}`,
            }));
          },
        },
      );
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Command terminated by operator'
          : error instanceof Error
            ? error.message
            : 'Execution failed';

      updateExecution(executionId, (current) => ({
        ...current,
        status: 'failed',
        exitCode: 130,
        completedAt: new Date().toISOString(),
        stderr: `${current.stderr}${current.stderr ? '\n' : ''}${message}`,
      }));
      toast.error(message);
    } finally {
      abortRef.current = null;
      setIsRunning(false);
    }
  };

  const launchViaDax = async () => {
    const command = input.trim();
    if (!command || isRunning || isDaxLaunching) {
      return;
    }

    setIsDaxLaunching(true);
    try {
      const workspaceId = await ensureWorkspaceId();
      const response = await apiHelpers.createDaxRun({
        intent: {
          input: command,
          kind: 'general',
          ...(inferredRepoPath ? { repoPath: inferredRepoPath } : {}),
        },
        personaPreset: {
          personaId: 'standard',
          approvalMode: 'strict',
          preferredCapabilityClasses: ['shell'],
          riskLevel: 'medium',
        },
        metadata: {
          workspaceId,
          ...(currentProject?.id ? { projectId: currentProject.id } : {}),
        },
      });

      const created = response.data;
      const params = new URLSearchParams({
        targetMode: inferredRepoPath ? 'explicit_repo_path' : 'default_cwd',
        ...(inferredRepoPath ? { repoPath: inferredRepoPath } : {}),
      });

      pushHistory(command);
      setInput('');
      toast.success('Governed run dispatched to DAX');
      navigate(`/runs/${created.runId}?${params.toString()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to launch DAX run');
    } finally {
      setIsDaxLaunching(false);
    }
  };

  const runFromPreferredMode = async () => {
    if (preferredMode === 'dax') {
      await launchViaDax();
      return;
    }

    await executeCommand();
  };

  const handleTerminate = () => {
    abortRef.current?.abort();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void runFromPreferredMode();
      return;
    }

    if (event.key === 'ArrowUp') {
      if (recentHistory.length === 0) {
        return;
      }
      event.preventDefault();
      historyCursorRef.current = Math.min(historyCursorRef.current + 1, recentHistory.length - 1);
      setInput(recentHistory[historyCursorRef.current]?.command || '');
      return;
    }

    if (event.key === 'ArrowDown') {
      if (recentHistory.length === 0) {
        return;
      }
      event.preventDefault();
      historyCursorRef.current = Math.max(historyCursorRef.current - 1, -1);
      setInput(historyCursorRef.current === -1 ? '' : recentHistory[historyCursorRef.current]?.command || '');
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border/40 bg-background/70 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
            <span className="text-label-sm">Shell Ready</span>
          </div>
          <div className="h-3 w-px bg-border/40" />
          <div className="flex items-center gap-2 text-label-sm">
            <Box className="h-3.5 w-3.5" />
            {currentWorkspace?.name || 'Workspace'}
          </div>
          {inferredRepoPath && (
            <>
              <div className="h-3 w-px bg-border/40" />
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {truncate(inferredRepoPath, 64)}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar((current) => !current)}
            className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-secondary-content transition-colors hover:bg-card/40 hover:text-foreground"
          >
            {showSidebar ? 'Hide Buffer' : 'Show Buffer'}
          </button>
          <button
            onClick={() => setExecutions([])}
            className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-secondary-content transition-colors hover:bg-card/40 hover:text-rose-500"
          >
            Clear
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 flex-1 flex-col bg-background">
          <div ref={outputRef} className="flex-1 overflow-y-auto p-8 font-mono text-[13px] leading-relaxed">
            {executions.length === 0 ? (
              <div className="flex h-full flex-col justify-start pt-12">
                <div className="border-l border-primary/10 pl-6 text-primary/20">
                  <h1 className="text-3xl font-black uppercase tracking-tighter">Operator Terminal</h1>
                  <p className="mt-2 text-[9px] font-black uppercase tracking-[0.4em]">
                    Local Shell + Governed DAX Handoff
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-3 text-muted-content">
                  <div className="h-px w-6 bg-current" />
                  <span className="text-label-sm">
                    Execute local shell commands here, or send higher-risk work through DAX.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {executions.map((execution) => (
                  <motion.div
                    key={execution.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-border/30 bg-card/20 p-5"
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="text-primary/60 font-black text-[11px]">operator</span>
                      <span className="text-muted-foreground/20 text-[11px]">$</span>
                      <span className="min-w-0 flex-1 break-all font-bold tracking-tight text-foreground">
                        {execution.command}
                      </span>
                      {execution.executionMode && (
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                            execution.executionMode === 'allowlisted'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-emerald-500/10 text-emerald-600',
                          )}
                        >
                          {execution.executionMode}
                        </span>
                      )}
                      <span className="text-xs text-secondary-content">
                        {formatRelativeTime(execution.startedAt)}
                      </span>
                    </div>

                    <div className="space-y-3 border-l border-border/40 pl-5">
                      {execution.status === 'running' && (
                        <div className="flex items-center gap-2 text-primary/50">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                            Streaming output
                          </span>
                        </div>
                      )}

                      {(execution.stdout || execution.stderr) && (
                        <div
                          className={cn(
                            'grid gap-3',
                            execution.stdout && execution.stderr ? 'xl:grid-cols-2' : 'grid-cols-1',
                          )}
                        >
                          {execution.stdout && (
                            <div className="overflow-hidden rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04]">
                              <div className="border-b border-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                                stdout
                              </div>
                              <pre className="whitespace-pre-wrap break-all px-4 py-3 text-[12px] text-secondary-content">
                                {execution.stdout}
                              </pre>
                            </div>
                          )}

                          {execution.stderr && (
                            <div className="overflow-hidden rounded-2xl border border-rose-500/10 bg-rose-500/[0.04]">
                              <div className="border-b border-rose-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">
                                stderr
                              </div>
                              <pre className="whitespace-pre-wrap break-all px-4 py-3 text-[12px] text-rose-400/90">
                                {execution.stderr}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {execution.status !== 'running' && (
                        <div
                          className={cn(
                            'flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.16em]',
                            execution.exitCode === 0 ? 'text-emerald-500/70' : 'text-rose-500/70',
                          )}
                        >
                          {execution.exitCode === 0 ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          <span>Exit {execution.exitCode ?? 0}</span>
                          {execution.durationMs ? <span>{execution.durationMs}ms</span> : null}
                          {execution.cwd ? <span>{truncate(execution.cwd, 56)}</span> : null}
                          {execution.timedOut ? <span>timed out</span> : null}
                          {execution.truncated ? <span>truncated</span> : null}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border/40 bg-background px-8 py-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                <div className="space-y-3 rounded-2xl border border-border/40 bg-card/20 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-primary">$</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-secondary-content">
                        execution mode
                      </span>
                    </div>
                    <div className="inline-flex rounded-full border border-border/40 bg-background/60 p-1">
                      <button
                        onClick={() => setPreferredMode('local')}
                        className={cn(
                          'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] transition-colors',
                          preferredMode === 'local'
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : 'text-secondary-content hover:text-foreground',
                        )}
                      >
                        Local shell
                      </button>
                      <button
                        onClick={() => setPreferredMode('dax')}
                        className={cn(
                          'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] transition-colors',
                          preferredMode === 'dax'
                            ? 'bg-blue-500/10 text-blue-700'
                            : 'text-secondary-content hover:text-foreground',
                        )}
                      >
                        Governed DAX
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                        preferredMode === 'local'
                          ? 'bg-emerald-500/10 text-emerald-700'
                          : 'bg-blue-500/10 text-blue-700',
                      )}
                    >
                      {preferredMode === 'local' ? 'local shell' : 'governed dax'}
                    </span>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Run a shell command locally, or hand it off via DAX..."
                      className="w-full bg-transparent font-mono text-base text-foreground outline-none"
                    />
                  </div>
                </div>

                {isRunning ? (
                  <button
                    onClick={handleTerminate}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-6 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-rose-500/20"
                  >
                    <Square className="h-3.5 w-3.5" />
                    Terminate
                  </button>
                ) : (
                  <button
                    onClick={() => void executeCommand()}
                    disabled={!input.trim() || isDaxLaunching}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-[10px] font-black uppercase tracking-[0.16em] text-primary-foreground shadow-lg shadow-primary/15 transition-opacity hover:opacity-90 disabled:opacity-30"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Execute
                  </button>
                )}

                <button
                  onClick={() => void launchViaDax()}
                  disabled={!input.trim() || isRunning || isDaxLaunching}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border/40 bg-card/30 px-6 text-[10px] font-black uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-card/50 disabled:opacity-30"
                >
                  {isDaxLaunching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                  Run via DAX
                </button>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px] text-secondary-content">
                <span>Enter runs in the selected mode.</span>
                <span>Arrow up/down recalls history.</span>
                <span>DAX launches a governed run with approvals and replay.</span>
              </div>
            </div>
          </div>
        </main>

        {showSidebar && (
          <aside className="flex w-[340px] shrink-0 flex-col border-l border-border/40 bg-card/20 backdrop-blur-3xl">
            <div className="border-b border-border/40 p-5">
              <div className="flex items-center gap-2.5">
                <TerminalSquare className="h-4 w-4 text-secondary-content" />
                <h3 className="text-label">Knowledge Buffer</h3>
              </div>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto p-5">
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-label-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Saved Snippets
                </div>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <input
                      value={snippetName}
                      onChange={(event) => setSnippetName(event.target.value)}
                      placeholder="Snippet name"
                      className="rounded-xl border border-border/30 bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary/20"
                    />
                    <button
                      onClick={saveCurrentSnippet}
                      disabled={!input.trim()}
                      className="rounded-xl border border-border/30 bg-background/50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/20 hover:bg-background disabled:opacity-30"
                    >
                      Save current command
                    </button>
                  </div>

                  {orderedSnippets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/40 bg-background/40 p-4 text-sm text-secondary-content">
                      Save reusable commands here with a name and preferred mode.
                    </div>
                  ) : (
                    orderedSnippets.map((snippet) => (
                      <div
                        key={snippet.id}
                        className="rounded-2xl border border-border/20 bg-background/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            onClick={() => {
                              setInput(snippet.command);
                              setPreferredMode(snippet.mode);
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="truncate text-sm font-semibold text-foreground">
                              {snippet.name}
                            </div>
                            <div className="mt-2 font-mono text-[11px] text-secondary-content">
                              {truncate(snippet.command, 48)}
                            </div>
                          </button>
                          <button
                            onClick={() => deleteSnippet(snippet.id)}
                            className="text-[10px] font-black uppercase tracking-[0.16em] text-secondary-content transition-colors hover:text-rose-500"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                              snippet.mode === 'local'
                                ? 'bg-emerald-500/10 text-emerald-700'
                                : 'bg-blue-500/10 text-blue-700',
                            )}
                          >
                            {snippet.mode === 'local' ? 'local shell' : 'governed dax'}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.16em] text-secondary-content">
                            {formatRelativeTime(snippet.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-label-sm">
                  <History className="h-3.5 w-3.5" />
                  Recent Commands
                </div>
                <div className="space-y-2">
                  {recentHistory.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/40 bg-background/40 p-4 text-sm text-secondary-content">
                      Your command history will appear here.
                    </div>
                  ) : (
                    recentHistory.slice(0, 10).map((entry) => (
                      <button
                        key={entry.command}
                        onClick={() => setInput(entry.command)}
                        className="w-full rounded-2xl border border-border/20 bg-background/40 p-3 text-left transition-colors hover:border-primary/20 hover:bg-background"
                      >
                        <div className="font-mono text-[11px] text-foreground">{entry.command}</div>
                        <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-secondary-content">
                          {entry.count} runs • {formatRelativeTime(entry.lastRunAt)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-label-sm">
                  <Zap className="h-3.5 w-3.5" />
                  Quick Commands
                </div>
                <div className="space-y-4">
                  {commandTemplates.map((group) => (
                    <div key={group.category} className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-secondary-content">
                        {group.category}
                      </div>
                      <div className="space-y-2">
                        {group.commands.map((command) => (
                          <button
                            key={command}
                            onClick={() => setInput(command)}
                            className="flex w-full items-center justify-between rounded-xl border border-border/20 bg-background/40 p-3 text-left transition-colors hover:border-primary/20 hover:bg-background"
                          >
                            <code className="text-[11px] text-secondary-content">{command}</code>
                            <Command className="h-3.5 w-3.5 text-primary/80" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-label-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Allowlisted Templates
                </div>
                <div className="space-y-2">
                  {allowlistedCommands.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/40 bg-background/40 p-4 text-sm text-secondary-content">
                      No allowlisted commands are seeded for this workspace yet.
                    </div>
                  ) : (
                    allowlistedCommands.map((command) => (
                      <button
                        key={command.id}
                        onClick={() => setInput(command.name)}
                        className="w-full rounded-2xl border border-border/20 bg-background/40 p-3 text-left transition-colors hover:border-primary/20 hover:bg-background"
                      >
                        <div className="text-sm font-semibold text-foreground">{command.name}</div>
                        {command.template ? (
                          <div className="mt-2 font-mono text-[11px] text-secondary-content">
                            {truncate(command.template, 52)}
                          </div>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="border-t border-border/40 bg-muted/10 p-5">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/50" />
                <div className="space-y-2 text-[11px] leading-relaxed text-secondary-content">
                  <p>Local Execute runs immediately on the Soothsayer host inside the workspace root.</p>
                  <p>Run via DAX is for governed, reviewable, multi-step operator work.</p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
