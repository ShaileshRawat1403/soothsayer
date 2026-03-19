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
  Loader2
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
  { category: 'Network', icon: <Globe className="h-4 w-4" />, commands: ['curl -I localhost:3000', 'netstat -an', 'ping -c 3 google.com'] },
];

function Globe({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
    </svg>
  );
}

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
          e.id === execution.id ? { ...e, output: message, status: 'failed', exitCode: 1, completedAt: new Date().toISOString() } : e
        )
      );
      toast.error(message);
    }
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-6 p-10 max-w-[1800px] mx-auto w-full">
      {/* Header Controls */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            <TerminalIcon className="h-3 w-3" />
            Direct Runtime
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Command Console</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-6 px-8 py-3 rounded-2xl bg-muted/20 border border-border/50 mr-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Sessions</span>
              <span className="text-sm font-bold">{executions.length}</span>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Policy</span>
              <span className="text-sm font-bold text-emerald-600">Strict</span>
            </div>
          </div>
          <button
            onClick={() => setExecutions([])}
            className="h-12 w-12 flex items-center justify-center rounded-2xl border border-border bg-background hover:bg-rose-500/5 hover:text-rose-600 transition-all active:scale-95"
            title="Clear Console"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button className="button-professional border border-border bg-background px-8 h-12 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-muted">
            <Download className="h-4 w-4" />
            Export Log
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-10 min-h-0 overflow-hidden">
        {/* Massive Terminal Window */}
        <div className="flex-1 flex flex-col card-professional border-primary/5 bg-[#0D0D0F] shadow-2xl relative group overflow-hidden">
          {/* Scanning Line Animation */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="w-full h-[2px] bg-primary/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] absolute top-0 animate-[scanning_8s_linear_infinite]" />
          </div>

          {/* Terminal Header */}
          <div className="h-12 bg-[#1A1A1C] border-b border-white/5 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/40" />
                <div className="w-3 h-3 rounded-full bg-amber-500/40" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                <Box className="h-3 w-3" />
                Isolated Context: {currentWorkspace?.name || 'Standard'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <Activity className="h-3 w-3 text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-500/80 uppercase">Authority Online</span>
              </div>
            </div>
          </div>

          {/* Output Stream */}
          <div 
            ref={outputRef}
            className="flex-1 overflow-y-auto p-10 font-mono text-[14px] leading-relaxed text-gray-400 scrollbar-thin selection:bg-primary/30"
          >
            <AnimatePresence mode="popLayout">
              {executions.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-muted-foreground/20"
                >
                  <Cpu className="h-20 w-20 mb-6 animate-pulse duration-[4000ms]" />
                  <p className="text-xs font-black uppercase tracking-[0.4em]">Awaiting Instruction</p>
                </motion.div>
              ) : (
                <div className="space-y-10">
                  {executions.map((exec, idx) => (
                    <motion.div 
                      key={exec.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group/item"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">$</span>
                          <span className="text-white/90 font-bold">{exec.command}</span>
                        </div>
                        <div className="h-px flex-1 bg-white/5" />
                        <div className="flex items-center gap-3 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <time className="text-[9px] font-bold text-white/20 uppercase">
                            {new Date(exec.startedAt).toLocaleTimeString()}
                          </time>
                          <button 
                            onClick={() => { navigator.clipboard.writeText(exec.output); toast.success('Output copied'); }}
                            className="p-1 hover:text-white transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="relative pl-6 border-l border-white/5 space-y-4">
                        {exec.status === 'running' && (
                          <div className="flex items-center gap-3 text-blue-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs font-bold animate-pulse">Processing technical trace...</span>
                          </div>
                        )}
                        {exec.output && (
                          <pre className="whitespace-pre-wrap break-all text-white/60 text-[13px] leading-relaxed">
                            {exec.output}
                          </pre>
                        )}
                        {exec.status !== 'running' && (
                          <div className={cn(
                            "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                            exec.exitCode === 0 ? "text-emerald-500/50" : "text-rose-500/50"
                          )}>
                            {exec.exitCode === 0 ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            Exit Code: {exec.exitCode}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Heavy Footer Input */}
          <div className="p-8 bg-[#141416] border-t border-white/5 shrink-0">
            <div className="flex items-center gap-6">
              <div className="relative flex-1">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3 text-primary">
                  <span className="font-bold text-lg">$</span>
                  <div className="h-4 w-px bg-primary/20" />
                </div>
                <input 
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeCommand()}
                  placeholder="Dispatch autonomous instruction..."
                  className="w-full h-16 rounded-[1.25rem] bg-black/40 border border-white/10 pl-16 pr-6 font-mono text-base text-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all placeholder:text-white/10 shadow-inner"
                />
              </div>
              <button 
                onClick={executeCommand}
                disabled={isRunning || !input.trim()}
                className={cn(
                  "h-16 px-10 rounded-[1.25rem] font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all active:scale-95 shadow-2xl",
                  isRunning ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90 disabled:opacity-50"
                )}
              >
                {isRunning ? (
                  <><Square className="h-4 w-4 fill-current" /> Terminate</>
                ) : (
                  <><Play className="h-4 w-4 fill-current" /> Dispatch</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Snippet Sidebar */}
        <div className="w-96 flex flex-col gap-6 shrink-0">
          <div className="card-professional p-8 flex flex-col h-full bg-muted/5 border-border/40">
            <div className="flex items-center gap-3 mb-10">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <History className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/80">Command Hub</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-10 scrollbar-none">
              {commandTemplates.map(cat => (
                <div key={cat.category} className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-2">{cat.category}</div>
                  <div className="space-y-2">
                    {cat.commands.map(cmd => (
                      <button 
                        key={cmd}
                        onClick={() => setInput(cmd)}
                        className="w-full text-left p-4 rounded-2xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-apple-lg transition-all group flex items-center justify-between"
                      >
                        <code className="text-xs font-mono text-muted-foreground group-hover:text-primary transition-colors">{cmd}</code>
                        <Zap className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-border/50">
              <div className="rounded-2xl bg-primary/5 p-5 border border-primary/10">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                  <Shield className="h-3.5 w-3.5" />
                  Operator Policy
                </div>
                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">
                  " All terminal instructions are proxied through the DAX control plane for safety analysis. "
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
