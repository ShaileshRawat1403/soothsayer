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
} from 'lucide-react';
import { toast } from 'sonner';

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
  { category: 'Git', commands: ['git status', 'git log --oneline -10', 'git diff'] },
  { category: 'NPM', commands: ['npm run lint', 'npm test', 'npm audit'] },
  { category: 'System', commands: ['ls -la', 'df -h', 'top -l 1'] },
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
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
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
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Command Runner</h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
            {executions.length} executions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearTerminal}
            className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm hover:bg-accent"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
          <button className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm hover:bg-accent">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Terminal Output */}
        <div className="flex-1 overflow-hidden">
          <div
            ref={outputRef}
            className="terminal-container h-full overflow-auto bg-gray-900 p-4 text-gray-100"
          >
            {executions.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-500">
                <Shield className="mb-4 h-12 w-12" />
                <p className="text-lg">Safe Command Execution</p>
                <p className="mt-2 text-sm">
                  Commands are policy-checked and logged for auditability
                </p>
              </div>
            ) : (
              executions.map((execution) => (
                <div key={execution.id} className="mb-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-green-400">{execution.command}</span>
                    <div className="flex-1" />
                    {execution.status === 'running' && (
                      <Clock className="h-4 w-4 animate-pulse text-blue-400" />
                    )}
                    {execution.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                    {execution.status === 'failed' && (
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    )}
                    {execution.status === 'pending_approval' && (
                      <Shield className="h-4 w-4 text-amber-400" />
                    )}
                    <button
                      onClick={() => copyOutput(execution.output)}
                      className="rounded p-1 hover:bg-gray-800"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-300">
                    {execution.output}
                  </pre>
                  {execution.exitCode !== undefined && (
                    <div className="mt-1 text-xs text-gray-500">
                      Exit code: {execution.exitCode}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Command Templates Sidebar */}
        <div className="w-64 border-l border-border bg-card">
          <div className="border-b border-border p-3">
            <h3 className="text-sm font-medium">Command Templates</h3>
          </div>
          <div className="overflow-auto p-2">
            {commandTemplates.map((category) => (
              <div key={category.category} className="mb-4">
                <div className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                  {category.category}
                </div>
                <div className="space-y-1">
                  {category.commands.map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => setInput(cmd)}
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <code className="text-xs">{cmd}</code>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter command..."
              className="h-10 w-full rounded-md border border-input bg-background pl-7 pr-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {isRunning ? (
            <button
              onClick={() => setIsRunning(false)}
              className="flex h-10 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={executeCommand}
              disabled={!input.trim()}
              className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Run
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Commands are policy-checked before execution</span>
          <span>Press Enter to run</span>
        </div>
      </div>
    </div>
  );
}
