import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { apiHelpers } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  Play,
  Square,
  Copy,
  Download,
  Trash2,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Terminal as TerminalIcon,
  Command,
  FileCode2,
  Settings,
  Cpu,
  Activity,
  History,
  Zap,
  Box,
  Loader2,
  TerminalSquare,
  Menu,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandExecution {
  id: string;
  command: string;
  output: string;
  status: 'running' | 'completed' | 'failed' | 'pending_approval';
  exitCode?: number;
  startedAt: string;
  completedAt?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

const commandTemplates = [
  {
    category: 'Source Control',
    icon: <FileCode2 className="h-3.5 w-3.5" />,
    commands: ['git status', 'git log --oneline -10', 'git diff'],
  },
  {
    category: 'Package Manager',
    icon: <Command className="h-3.5 w-3.5" />,
    commands: ['npm run lint', 'npm test', 'npm audit'],
  },
  {
    category: 'System Info',
    icon: <Settings className="h-3.5 w-3.5" />,
    commands: ['ls -la', 'df -h', 'top -l 1'],
  },
  {
    category: 'Network',
    icon: <Globe className="h-3.5 w-3.5" />,
    commands: ['curl -I localhost:3000', 'netstat -an', 'ping -c 3 google.com'],
  },
];

function Globe({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

export function TerminalPage() {
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const [input, setInput] = useState('');
  const [executions, setExecutions] = useState<CommandExecution[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showReference, setShowReference] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [executions]);

  const ensureWorkspaceId = async () => {
    if (currentWorkspace?.id) return currentWorkspace.id;
    const workspacesResponse = await apiHelpers.getWorkspaces();
    const workspaces = Array.isArray(workspacesResponse.data) ? workspacesResponse.data : [];
    const first = workspaces[0]?.workspace || workspaces[0];
    if (!first?.id) throw new Error('No workspace found.');
    setCurrentWorkspace(first);
    return first.id as string;
  };

  const executeCommand = async () => {
    if (!input.trim() || isRunning) return;

    const command = input.trim();
    const execution: CommandExecution = {
      id: `exec-${Date.now()}`,
      command,
      output: '',
      status: 'running',
      startedAt: new Date().toISOString(),
      riskLevel: command.includes('rm') || command.includes('sudo') ? 'high' : 'low',
    };

    setExecutions((prev) => [...prev, execution]);
    setInput('');
    setIsRunning(true);

    try {
      const workspaceId = await ensureWorkspaceId();
      const response = await apiHelpers.executeTerminalCommand({
        workspaceId,
        command,
        cwd: '.',
      });

      const result = response.data as any;
      const mergedOutput = [result.output, result.errorOutput].filter(Boolean).join('\n');

      setExecutions((prev) =>
        prev.map((e) =>
          e.id === execution.id
            ? {
                ...e,
                output: mergedOutput || '(no output)',
                status: result.status === 'completed' ? 'completed' : 'failed',
                exitCode: typeof result.exitCode === 'number' ? result.exitCode : 0,
                completedAt: new Date().toISOString(),
              }
            : e
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution failed';
      setExecutions((prev) =>
        prev.map((e) =>
          e.id === execution.id
            ? {
                ...e,
                output: message,
                status: 'failed',
                exitCode: 1,
                completedAt: new Date().toISOString(),
              }
            : e
        )
      );
      toast.error(message);
    }
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background overflow-hidden relative">
      {/* Internal Control Bar - Ultra Tight */}
      <header className="h-10 border-b border-border/40 flex items-center justify-between px-6 bg-background/60 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
            <span className="text-label-sm">Authority Online</span>
          </div>
          <div className="h-3 w-px bg-border/40" />
          <div className="flex items-center gap-2 text-label-sm">
            <Box className="h-3 w-3" />
            {currentWorkspace?.name || 'Standard Context'}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowReference(!showReference)}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest',
              showReference
                ? 'text-primary bg-primary/5'
                : 'text-muted-foreground/40 hover:text-foreground'
            )}
          >
            <History className="h-3 w-3" />
            Buffer
          </button>
          <div className="h-3 w-px bg-border/40" />
          <button
            onClick={() => setExecutions([])}
            className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-rose-500 transition-colors active:scale-95"
          >
            Purge
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Terminal Core - Nuanced Dark */}
        <main className="flex-1 flex flex-col bg-background relative overflow-hidden">
          <div
            ref={outputRef}
            className="flex-1 overflow-y-auto p-10 font-mono text-[13px] leading-relaxed scrollbar-none selection:bg-primary/10"
          >
            <AnimatePresence mode="popLayout">
              {executions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-start justify-start pt-12"
                >
                  <div className="text-primary/20 space-y-4 mb-8 border-l border-primary/10 pl-6">
                    <h1 className="text-2xl font-black tracking-tighter uppercase">
                      Direct Execution Node
                    </h1>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] mt-2">
                      Terminal Interface v3.4.0 (Governed)
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-muted-content">
                    <div className="h-px w-6 bg-current" />
                    <span className="text-label-sm">
                      Operator synchronized. Awaiting instruction.
                    </span>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-10">
                  {executions.map((exec) => (
                    <motion.div
                      key={exec.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group/item"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-primary/60 font-black text-[11px]">operator</span>
                          <span className="text-muted-foreground/20 text-[11px]">$</span>
                        </div>
                        <span className="text-foreground font-bold tracking-tight text-[13px]">
                          {exec.command}
                        </span>
                        <div className="flex-1 h-px bg-border/20 ml-2" />
                      </div>

                      <div className="relative pl-6 border-l border-border/40 ml-2 space-y-4">
                        {exec.status === 'running' && (
                          <div className="flex items-center gap-3 text-primary/40">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">
                              Establishing Trace...
                            </span>
                          </div>
                        )}
                        {exec.output && (
                          <pre className="whitespace-pre-wrap break-all text-secondary-content text-[12px] leading-relaxed font-medium">
                            {exec.output}
                          </pre>
                        )}
                        {exec.status !== 'running' && (
                          <div
                            className={cn(
                              'flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em]',
                              exec.exitCode === 0 ? 'text-emerald-500/40' : 'text-rose-500/40'
                            )}
                          >
                            {exec.exitCode === 0 ? (
                              <CheckCircle className="h-2.5 w-2.5" />
                            ) : (
                              <AlertTriangle className="h-2.5 w-2.5" />
                            )}
                            Exit {exec.exitCode}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Prompt Area - High-Fidelity */}
          <div className="px-10 py-8 bg-background border-t border-border/40 shrink-0">
            <div className="flex items-center gap-4 max-w-5xl mx-auto w-full">
              <div className="flex items-center gap-2 text-primary font-black text-sm select-none">
                <span className="opacity-20">➜</span>
                <span>$</span>
              </div>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                placeholder="Dispatch signal..."
                className="flex-1 bg-transparent border-none p-0 font-mono text-base text-foreground focus:outline-none focus:ring-0 text-placeholder-content"
              />
              <div className="flex items-center gap-3">
                {isRunning ? (
                  <button
                    onClick={() => setIsRunning(false)}
                    className="h-9 px-5 rounded-xl bg-rose-500 text-white font-black uppercase tracking-widest text-[9px] shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                  >
                    Terminate
                  </button>
                ) : (
                  <button
                    onClick={executeCommand}
                    disabled={!input.trim()}
                    className="h-9 px-8 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 disabled:opacity-10 transition-all"
                  >
                    Execute
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Knowledge Sidebar - Responsive Slide-out */}
        <AnimatePresence>
          {showReference && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="border-l border-border/40 bg-card/20 backdrop-blur-3xl flex flex-col shrink-0 overflow-hidden relative z-40"
            >
              <div className="p-6 border-b border-border/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <TerminalSquare className="h-3.5 w-3.5 text-secondary-content" />
                  <h3 className="text-label">Knowledge Buffer</h3>
                </div>
                <button
                  onClick={() => setShowReference(false)}
                  className="p-1 text-muted-content hover:text-foreground transition-colors active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-none">
                {commandTemplates.map((cat) => (
                  <div key={cat.category} className="space-y-4">
                    <span className="text-label-sm">{cat.category}</span>
                    <div className="space-y-1.5">
                      {cat.commands.map((cmd) => (
                        <button
                          key={cmd}
                          onClick={() => setInput(cmd)}
                          className="w-full text-left p-3 rounded-xl border border-border/20 bg-background/40 hover:border-primary/20 hover:bg-background transition-all group flex items-center justify-between active:scale-[0.98]"
                        >
                          <code className="text-[11px] font-mono text-secondary-content group-hover:text-primary transition-colors">
                            {cmd}
                          </code>
                          <Zap className="h-3 w-3 text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-muted/10 border-t border-border/40">
                <div className="flex items-start gap-3">
                  <Shield className="h-3.5 w-3.5 text-primary/40 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium text-secondary-content leading-relaxed italic">
                    All direct runtime instructions are audited by the execution authority.
                  </p>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
