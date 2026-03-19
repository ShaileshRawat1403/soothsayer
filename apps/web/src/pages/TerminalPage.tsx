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
  Maximize2,
  TerminalSquare
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
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-black overflow-hidden relative">
      {/* Glossy Overlay for the entire page to kill the generic look */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.02] to-transparent z-10" />

      {/* Control Bar - Ultra Minimal */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-8 bg-black z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Isolated Node</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            <Box className="h-3 w-3" />
            {currentWorkspace?.name || 'Standard Runtime'}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setExecutions([])}
            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-rose-500 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Purge Buffer
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/10">
            <Shield className="h-3 w-3 text-emerald-500" />
            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Policy Strict</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Terminal Core - Pure Black */}
        <main className="flex-1 flex flex-col bg-black relative overflow-hidden">
          {/* Subtle CRT Effect Overlay */}
          <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
          
          <div 
            ref={outputRef}
            className="flex-1 overflow-y-auto p-12 font-mono text-[15px] leading-relaxed scrollbar-thin selection:bg-emerald-500/30 selection:text-emerald-200"
          >
            <AnimatePresence mode="popLayout">
              {executions.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-start justify-start pt-20"
                >
                  <div className="text-emerald-500/40 space-y-2 mb-12">
                    <pre className="text-[10px] leading-tight">
{`   _____  ____   ____ _______ _    _  _____       __     ________ _____  
  / ____|/ __ \\ / __ \\__   __| |  | |/ ____|   /\\\\ \\   / /  ____|  __ \\ 
 | (___ | |  | | |  | | | |  | |__| | (___    /  \\\\ \\_/ /| |__  | |__) |
  \\___ \\| |  | | |  | | | |  |  __  |\\___ \\  / /\\ \\\\   / |  __| |  _  / 
  ____) | |__| | |__| | | |  | |  | |____) |/ ____ \\| |  | |____| | \\ \\ 
 |_____/ \\____/ \\____/  |_|  |_|  |_|_____//_/    \\_\\_|  |______|_|  \\_\\`}
                    </pre>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] mt-4 ml-1">Terminal Interface v3.4.0 (Governed)</p>
                  </div>
                  <div className="flex items-center gap-3 text-white/20">
                    <div className="h-px w-8 bg-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Awaiting dispatch signal...</span>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-12">
                  {executions.map((exec) => (
                    <motion.div 
                      key={exec.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group/item"
                    >
                      {/* Prompt Line */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-500 font-black">operator@soothsayer</span>
                          <span className="text-white/20">:</span>
                          <span className="text-blue-400 font-bold">~</span>
                          <span className="text-white/40 font-black">$</span>
                        </div>
                        <span className="text-white font-bold tracking-tight">{exec.command}</span>
                        <div className="flex-1 h-px bg-white/5 mx-4" />
                        <time className="text-[9px] font-black text-white/10 uppercase tracking-widest">
                          {new Date(exec.startedAt).toLocaleTimeString()}
                        </time>
                      </div>
                      
                      {/* Output Content */}
                      <div className="relative pl-10 border-l-2 border-white/[0.03] ml-4 space-y-6">
                        {exec.status === 'running' && (
                          <div className="flex items-center gap-4 text-blue-400/80">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-[11px] font-black uppercase tracking-widest animate-pulse">Establishing Trace...</span>
                          </div>
                        )}
                        {exec.output && (
                          <pre className="whitespace-pre-wrap break-all text-white/70 text-[14px] leading-relaxed font-medium">
                            {exec.output}
                          </pre>
                        )}
                        {exec.status !== 'running' && (
                          <div className="flex items-center justify-between pt-4">
                            <div className={cn(
                              "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]",
                              exec.exitCode === 0 ? "text-emerald-500/40" : "text-rose-500/40"
                            )}>
                              {exec.exitCode === 0 ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                              Exit {exec.exitCode}
                            </div>
                            <button 
                              onClick={() => { navigator.clipboard.writeText(exec.output); toast.success('Buffer copied'); }}
                              className="opacity-0 group-hover/item:opacity-100 transition-opacity p-2 rounded-lg hover:bg-white/5 text-white/20 hover:text-white"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Prompt Area - Integrated into the bottom */}
          <div className="p-10 bg-black border-t border-white/5 relative z-30">
            <div className="flex items-center gap-6 max-w-6xl mx-auto w-full">
              <div className="flex items-center gap-3 text-emerald-500 font-black text-lg select-none">
                <span className="opacity-50">➜</span>
                <span>$</span>
              </div>
              <input 
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && executeCommand()}
                placeholder="Type instruction..."
                className="flex-1 bg-transparent border-none p-0 font-mono text-xl text-white focus:outline-none focus:ring-0 placeholder:text-white/5"
              />
              <div className="flex items-center gap-4">
                {isRunning ? (
                  <button 
                    onClick={() => setIsRunning(false)}
                    className="h-12 px-8 rounded-xl bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all active:scale-95"
                  >
                    Halt
                  </button>
                ) : (
                  <button 
                    onClick={executeCommand}
                    disabled={!input.trim()}
                    className="h-12 px-10 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-20 disabled:grayscale"
                  >
                    Execute
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Knowledge Sidebar - Hidden on small screens */}
        <aside className="w-96 border-l border-white/10 bg-black hidden xl:flex flex-col">
          <div className="p-8 border-b border-white/10">
            <div className="flex items-center gap-3">
              <TerminalSquare className="h-4 w-4 text-white/40" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Reference Buffer</h3>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-none">
            {commandTemplates.map(cat => (
              <div key={cat.category} className="space-y-5">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">{cat.category}</span>
                <div className="space-y-2">
                  {cat.commands.map(cmd => (
                    <button 
                      key={cmd}
                      onClick={() => setInput(cmd)}
                      className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/30 transition-all group flex items-center justify-between"
                    >
                      <code className="text-xs font-mono text-white/40 group-hover:text-emerald-400 transition-colors">{cmd}</code>
                      <ChevronRight className="h-3.5 w-3.5 text-emerald-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 bg-white/[0.02] border-t border-white/10">
            <div className="flex items-start gap-4">
              <Shield className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-2">Safety Lock Active</p>
                <p className="text-[11px] font-medium text-white/40 leading-relaxed italic">
                  Runtime instructions are audited by the DAX authority. Destructive commands require manual elevation.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
