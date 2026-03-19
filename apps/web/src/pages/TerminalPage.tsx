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
  X
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
  { category: 'Source Control', icon: <FileCode2 className="h-3.5 w-3.5" />, commands: ['git status', 'git log --oneline -10', 'git diff'] },
  { category: 'Package Manager', icon: <Command className="h-3.5 w-3.5" />, commands: ['npm run lint', 'npm test', 'npm audit'] },
  { category: 'System Info', icon: <Settings className="h-3.5 w-3.5" />, commands: ['ls -la', 'df -h', 'top -l 1'] },
  { category: 'Network', icon: <Globe className="h-3.5 w-3.5" />, commands: ['curl -I localhost:3000', 'netstat -an', 'ping -c 3 google.com'] },
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
          e.id === execution.id ? { ...e, output: message, status: 'failed', exitCode: 1, completedAt: new Date().toISOString() } : e
        )
      );
      toast.error(message);
    }
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-black overflow-hidden relative">
      {/* Glossy Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.01] to-transparent z-10" />

      {/* Internal Control Bar - Tightened */}
      <header className="h-10 border-b border-white/5 flex items-center justify-between px-6 bg-black z-20 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Node Active</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-[9px] font-bold text-white/30 uppercase tracking-widest">
            <Box className="h-3 w-3" />
            {currentWorkspace?.name || 'Standard'}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowReference(!showReference)}
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded transition-colors text-[9px] font-black uppercase tracking-widest",
              showReference ? "text-emerald-500 bg-emerald-500/10" : "text-white/30 hover:text-white"
            )}
          >
            <History className="h-3 w-3" />
            Reference
          </button>
          <div className="h-3 w-px bg-white/10" />
          <button 
            onClick={() => setExecutions([])}
            className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-rose-500 transition-colors"
          >
            Purge
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Terminal Core */}
        <main className="flex-1 flex flex-col bg-black relative overflow-hidden">
          {/* Subtle CRT Effect */}
          <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,2px_100%]" />
          
          <div 
            ref={outputRef}
            className="flex-1 overflow-y-auto p-8 font-mono text-[13px] leading-relaxed scrollbar-none selection:bg-emerald-500/30 selection:text-emerald-200"
          >
            <AnimatePresence mode="popLayout">
              {executions.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-start justify-start pt-12"
                >
                  <div className="text-emerald-500/30 space-y-1 mb-8">
                    <pre className="text-[8px] leading-tight">
{`   _____  ____   ____ _______ _    _  _____       __     ________ _____  
  / ____|/ __ \\ / __ \\__   __| |  | |/ ____|   /\\\\ \\   / /  ____|  __ \\ 
 | (___ | |  | | |  | | | |  | |__| | (___    /  \\\\ \\_/ /| |__  | |__) |
  \\___ \\| |  | | |  | | | |  |  __  |\\___ \\  / /\\ \\\\   / |  __| |  _  / 
  ____) | |__| | |__| | | |  | |  | |____) |/ ____ \\| |  | |____| | \\ \\ 
 |_____/ \\____/ \\____/  |_|  |_|  |_|_____//_/    \\_\\_|  |______|_|  \\_\\`}
                    </pre>
                    <p className="text-[8px] font-black uppercase tracking-[0.4em] mt-2 ml-1">Terminal Interface v3.4.0 (Governed)</p>
                  </div>
                  <div className="flex items-center gap-3 text-white/10">
                    <div className="h-px w-6 bg-current" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Operator synchronized. Awaiting instruction.</span>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-8">
                  {executions.map((exec) => (
                    <motion.div 
                      key={exec.id}
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group/item"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-emerald-500/80 font-black text-[11px]">operator</span>
                          <span className="text-white/10 text-[11px]">$</span>
                        </div>
                        <span className="text-white font-bold tracking-tight text-[13px]">{exec.command}</span>
                        <div className="flex-1 h-px bg-white/[0.03] ml-2" />
                      </div>
                      
                      <div className="relative pl-6 border-l border-white/[0.03] ml-2 space-y-4">
                        {exec.status === 'running' && (
                          <div className="flex items-center gap-3 text-blue-400/60">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Establishing Trace...</span>
                          </div>
                        )}
                        {exec.output && (
                          <pre className="whitespace-pre-wrap break-all text-white/50 text-[12px] leading-relaxed font-medium">
                            {exec.output}
                          </pre>
                        )}
                        {exec.status !== 'running' && (
                          <div className={cn(
                            "flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em]",
                            exec.exitCode === 0 ? "text-emerald-500/30" : "text-rose-500/30"
                          )}>
                            {exec.exitCode === 0 ? <CheckCircle className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
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

          {/* Prompt Area - Integrated */}
          <div className="px-8 py-6 bg-black border-t border-white/5 relative z-30 shrink-0">
            <div className="flex items-center gap-4 max-w-5xl mx-auto w-full">
              <div className="flex items-center gap-2 text-emerald-500 font-black text-sm select-none">
                <span className="opacity-30">➜</span>
                <span>$</span>
              </div>
              <input 
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && executeCommand()}
                placeholder="Dispatch signal..."
                className="flex-1 bg-transparent border-none p-0 font-mono text-base text-white focus:outline-none focus:ring-0 placeholder:text-white/5"
              />
              <div className="flex items-center gap-3">
                {isRunning ? (
                  <button 
                    onClick={() => setIsRunning(false)}
                    className="h-8 px-4 rounded-lg bg-rose-500/80 text-white font-black uppercase tracking-widest text-[9px] shadow-[0_0_15px_rgba(244,63,94,0.2)] transition-all active:scale-95"
                  >
                    Halt
                  </button>
                ) : (
                  <button 
                    onClick={executeCommand}
                    disabled={!input.trim()}
                    className="h-8 px-6 rounded-lg bg-white text-black font-black uppercase tracking-widest text-[9px] hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-10"
                  >
                    Run
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
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="border-l border-white/10 bg-black flex flex-col shrink-0 overflow-hidden relative z-40"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TerminalSquare className="h-3.5 w-3.5 text-white/30" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Reference</h3>
                </div>
                <button onClick={() => setShowReference(false)} className="xl:hidden p-1 text-white/20 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-none">
                {commandTemplates.map(cat => (
                  <div key={cat.category} className="space-y-4">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/10">{cat.category}</span>
                    <div className="space-y-1.5">
                      {cat.commands.map(cmd => (
                        <button 
                          key={cmd}
                          onClick={() => setInput(cmd)}
                          className="w-full text-left p-3 rounded-lg border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] hover:border-emerald-500/20 transition-all group flex items-center justify-between"
                        >
                          <code className="text-[11px] font-mono text-white/30 group-hover:text-emerald-400 transition-colors">{cmd}</code>
                          <Zap className="h-3 w-3 text-emerald-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-white/[0.01] border-t border-white/5">
                <div className="flex items-start gap-3">
                  <Shield className="h-3.5 w-3.5 text-emerald-500/50 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium text-white/30 leading-relaxed italic">
                    Instructions are audited by the DAX authority.
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
