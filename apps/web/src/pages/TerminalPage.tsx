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
  Settings
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
  { category: 'Source Control', icon: <FileCode2 className="h-4 w-4" />, commands: ['git status', 'git log --oneline -10', 'git diff'] },
  { category: 'Package Manager', icon: <Command className="h-4 w-4" />, commands: ['npm run lint', 'npm test', 'npm audit'] },
  { category: 'System Info', icon: <Settings className="h-4 w-4" />, commands: ['ls -la', 'df -h', 'top -l 1'] },
];

export function TerminalPage() {
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const [input, setInput] = useState('');
  const [executions, setExecutions] = useState<CommandExecution[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [executions]);

  const ensureWorkspaceId = async () => {
    if (currentWorkspace?.id) {
      return currentWorkspace.id;
    }
    const workspacesResponse = await apiHelpers.getWorkspaces();
    const workspaces = Array.isArray(workspacesResponse.data)
      ? workspacesResponse.data
      : [];
    const first = workspaces[0]?.workspace || workspaces[0];
    if (!first?.id) {
      throw new Error('No workspace found. Create a workspace first.');
    }
    setCurrentWorkspace({
      id: first.id,
      name: first.name,
      slug: first.slug,
      description: first.description,
      settings: first.settings,
    });
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

      const result = response.data as unknown as {
        status?: string;
        output?: string;
        errorOutput?: string;
        exitCode?: number;
      };

      const mergedOutput = [result.output, result.errorOutput].filter(Boolean).join('\n');
      setExecutions((prev) =>
        prev.map((e) =>
          e.id === execution.id
            ? {
                ...e,
                output: mergedOutput || '(no output)',
                status: result.status === 'completed' ? 'completed' : 'failed',
                exitCode: typeof result.exitCode === 'number' ? result.exitCode : 1,
                completedAt: new Date().toISOString(),
              }
            : e
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command execution failed';
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  const clearTerminal = () => {
    setExecutions([]);
  };

  const copyOutput = (output: string) => {
    navigator.clipboard.writeText(output);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="page-container flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 w-fit text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
            <TerminalIcon className="h-3 w-3" />
            Direct Execution
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Console</h1>
          <p className="mt-2 text-sm text-muted-foreground font-medium">Execute policy-checked shell commands directly within the workspace context.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearTerminal}
            className="flex h-10 items-center gap-2 rounded-full border border-border bg-background px-6 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted transition-all active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
          <button className="flex h-10 items-center gap-2 rounded-full border border-border bg-background px-6 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted transition-all active:scale-95">
            <Download className="h-3.5 w-3.5" />
            Export Log
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-6 min-h-0">
        {/* Main Terminal Area */}
        <div className="flex flex-col flex-1 card-professional overflow-hidden border-primary/10">
          <div className="flex-1 overflow-hidden bg-[#0A0A0A] relative">
            {/* Window controls decoration */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-[#141414] border-b border-white/5 flex items-center px-4 gap-2 z-10">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="mx-auto flex items-center gap-2 text-[#666666] text-xs font-mono">
                <Shield className="h-3 w-3" />
                Governed Shell
              </div>
            </div>

            <div
              ref={outputRef}
              className="absolute inset-0 top-10 overflow-auto p-6 font-mono text-[13px] leading-relaxed text-gray-300 scrollbar-thin"
            >
              <AnimatePresence mode="popLayout">
                {executions.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full flex-col items-center justify-center text-[#444444]"
                  >
                    <TerminalIcon className="mb-6 h-16 w-16 opacity-50" />
                    <p className="text-base font-bold tracking-tight">Terminal Ready</p>
                    <p className="mt-2 text-xs opacity-70">
                      Commands will be evaluated against active workspace policies.
                    </p>
                  </motion.div>
                ) : (
                  executions.map((execution, i) => (
                    <motion.div 
                      key={execution.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("mb-6 group", i !== executions.length - 1 && "pb-6 border-b border-white/5")}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-500 font-bold">➜</span>
                        <span className="text-[#A3B6CC] mr-1">~</span>
                        <span className="text-white font-semibold flex-1">{execution.command}</span>
                        
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          {execution.status === 'running' && (
                            <Clock className="h-4 w-4 animate-pulse text-blue-400" />
                          )}
                          {execution.status === 'completed' && (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          )}
                          {execution.status === 'failed' && (
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                          )}
                          {execution.status === 'pending_approval' && (
                            <Shield className="h-4 w-4 text-amber-500" />
                          )}
                          <button
                            onClick={() => copyOutput(execution.output)}
                            className="rounded p-1.5 text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      {execution.output && (
                        <motion.pre 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-3 whitespace-pre-wrap text-gray-400 pl-4 border-l border-white/10"
                        >
                          {execution.output}
                        </motion.pre>
                      )}
                      
                      {execution.exitCode !== undefined && (
                        <div className={cn(
                          "mt-2 text-[10px] font-bold uppercase tracking-widest pl-4",
                          execution.exitCode === 0 ? "text-emerald-500/70" : "text-rose-500/70"
                        )}>
                          Process exited with code {execution.exitCode}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-card p-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">
                  $
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter command to evaluate..."
                  className="h-12 w-full rounded-2xl border border-border bg-muted/20 pl-10 pr-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all group-hover:bg-muted/40"
                />
              </div>
              {isRunning ? (
                <button
                  onClick={() => setIsRunning(false)}
                  className="flex h-12 items-center gap-3 rounded-2xl bg-rose-500 px-8 text-[11px] font-black uppercase tracking-widest text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                >
                  <Square className="h-4 w-4 fill-current" />
                  Terminate
                </button>
              ) : (
                <button
                  onClick={executeCommand}
                  disabled={!input.trim()}
                  className="flex h-12 items-center gap-3 rounded-2xl bg-primary px-8 text-[11px] font-black uppercase tracking-widest text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/10 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Execute
                </button>
              )}
            </div>
            <div className="mt-3 px-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> Policy Guard Enabled</span>
              <span>Press Enter ⏎ to run</span>
            </div>
          </div>
        </div>

        {/* Sidebar Templates */}
        <div className="w-80 flex flex-col gap-6 shrink-0 hidden lg:flex">
          <div className="card-professional p-6 flex flex-col gap-6 h-full">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border/50 pb-4">
              Snippet Library
            </h3>
            <div className="overflow-auto space-y-8 pr-2 scrollbar-thin">
              {commandTemplates.map((category) => (
                <div key={category.category} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <div className="rounded-lg bg-secondary p-1.5 text-muted-foreground">
                      {category.icon}
                    </div>
                    {category.category}
                  </div>
                  <div className="space-y-2">
                    {category.commands.map((cmd) => (
                      <button
                        key={cmd}
                        onClick={() => setInput(cmd)}
                        className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-left transition-all hover:bg-primary/5 hover:border-primary/20 hover:shadow-sm group flex items-center justify-between"
                      >
                        <code className="text-xs font-mono text-muted-foreground group-hover:text-primary transition-colors">{cmd}</code>
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-all -translate-x-2 group-hover:translate-x-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
