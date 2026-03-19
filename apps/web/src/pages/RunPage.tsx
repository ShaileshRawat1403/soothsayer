import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Play, ShieldAlert, CheckCircle2, XCircle, Layout, Activity, User, ChevronDown } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { RunHeader } from '@/components/dax/RunHeader';
import { RunEventStream } from '@/components/dax/RunEventStream';
import { RunTimeline } from '@/components/dax/RunTimeline';
import { RunProfileCard } from '@/components/dax/RunProfileCard';
import { ApprovalModal } from '@/components/dax/ApprovalModal';
import { RunSummaryCard } from '@/components/dax/RunSummaryCard';
import { useRunConsole } from '@/hooks/useRunConsole';
import { useWorkspaceStore } from '@/stores/workspace.store';
import type { DaxCreateRunRequest } from '@/types/dax';

export function RunPage() {
  const { runId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isLauncher = runId === 'new';
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchInput, setLaunchInput] = useState('');
  const [launchKind, setLaunchKind] = useState<'general' | 'analysis' | 'edit'>('edit');
  const [personas, setPersonas] = useState<any[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const { currentWorkspace, currentProject } = useWorkspaceStore();

  const workspaceSettings =
    currentWorkspace?.settings && typeof currentWorkspace.settings === 'object'
      ? (currentWorkspace.settings as Record<string, unknown>)
      : null;

  const inferredRepoPath =
    typeof searchParams.get('repoPath') === 'string' && searchParams.get('repoPath')
      ? searchParams.get('repoPath') || undefined
      : typeof workspaceSettings?.repoPath === 'string'
        ? workspaceSettings.repoPath
        : typeof workspaceSettings?.defaultRepoPath === 'string'
          ? workspaceSettings.defaultRepoPath
          : typeof workspaceSettings?.targetRepoPath === 'string'
            ? workspaceSettings.targetRepoPath
            : undefined;

  const targetMode =
    (searchParams.get('targetMode') as 'explicit_repo_path' | 'default_cwd' | null) ||
    (inferredRepoPath ? 'explicit_repo_path' : 'default_cwd');

  const targetContext = {
    mode: targetMode,
    ...(inferredRepoPath ? { repoPath: inferredRepoPath } : {}),
    ...(currentWorkspace?.name ? { workspaceName: currentWorkspace.name } : {}),
    ...(currentProject?.name ? { projectName: currentProject.name } : {}),
  } as const;

  const {
    activeApproval,
    events,
    isApproving,
    isLoading,
    loadRun,
    resolveApproval,
    snapshot,
    streamState,
    summary,
  } = useRunConsole(runId, !isLauncher, inferredRepoPath);

  useEffect(() => {
    if (isLauncher) {
      const loadPersonas = async () => {
        try {
          const response = await apiHelpers.getPersonas();
          const list = response.data.personas || [];
          setPersonas(list);
          if (list.length > 0) setSelectedPersonaId(list[0].id);
        } catch (error) {
          console.error('Failed to load personas', error);
        }
      };
      void loadPersonas();
    }
  }, [isLauncher]);

  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

  const handleLaunch = async () => {
    const input = launchInput.trim();
    if (!input) {
      toast.error('Enter a run instruction first');
      return;
    }

    setIsLaunching(true);
    try {
      const payload: DaxCreateRunRequest = {
        intent: {
          input,
          kind: launchKind,
          ...(inferredRepoPath ? { repoPath: inferredRepoPath } : {}),
        },
        personaPreset: {
          personaId: selectedPersonaId || 'standard',
          approvalMode: 'strict', // Standard for workstation slice
        },
        metadata: {
          ...(currentWorkspace?.id ? { workspaceId: currentWorkspace.id } : {}),
          ...(currentProject?.id ? { projectId: currentProject.id } : {}),
        },
      };
      const response = await apiHelpers.createDaxRun(payload);
      const created = response.data;
      toast.success('DAX run started');
      const nextParams = new URLSearchParams();
      nextParams.set(
        'targetMode',
        inferredRepoPath ? 'explicit_repo_path' : 'default_cwd',
      );
      if (inferredRepoPath) {
        nextParams.set('repoPath', inferredRepoPath);
      }
      navigate(`/runs/${created.runId}?${nextParams.toString()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start DAX run';
      toast.error(message);
    } finally {
      setIsLaunching(false);
    }
  };

  if (isLauncher) {
    return (
      <div className="page-container flex flex-col gap-10">
        <Link to="/terminal" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Return to Terminal
        </Link>

        <section className="card-professional p-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Layout className="h-3 w-3" />
              Execution Launcher
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground">Initiate a live DAX run</h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Create a governed execution context. This run will be monitored by the DAX authority and will require manual approval for high-risk actions.
            </p>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_350px]">
            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  Execution Instruction
                </label>
                <textarea
                  value={launchInput}
                  onChange={(event) => setLaunchInput(event.target.value)}
                  placeholder="Specify the task for the AI authority..."
                  className="min-h-64 w-full rounded-[2.5rem] border border-border bg-background px-8 py-7 text-lg shadow-apple-lg focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-6 pt-4">
                <div className="flex items-center gap-2 bg-secondary p-1.5 rounded-full">
                  {(['general', 'analysis', 'edit'] as const).map((kind) => (
                    <button
                      key={kind}
                      onClick={() => setLaunchKind(kind)}
                      className={`rounded-full px-8 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
                        launchKind === kind
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {kind}
                    </button>
                  ))}
                </div>

                <button
                  disabled={isLaunching}
                  onClick={() => void handleLaunch()}
                  className="button-professional bg-primary text-primary-foreground hover:opacity-90 shadow-xl shadow-primary/20 flex items-center gap-3 px-10 py-4"
                >
                  {isLaunching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
                  <span className="text-base">Initiate Run</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="rounded-[2rem] border border-border bg-muted/30 p-8 space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Behavioral Persona
                  </label>
                  <div className="relative group">
                    <select
                      value={selectedPersonaId}
                      onChange={(e) => setSelectedPersonaId(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-border bg-background px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 shadow-apple transition-all"
                    >
                      {personas.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-transform group-hover:translate-y-[-40%]" />
                  </div>
                  {selectedPersona && (
                    <p className="px-1 text-xs font-medium text-muted-foreground leading-relaxed">
                      {selectedPersona.description}
                    </p>
                  )}
                </div>

                <div className="pt-6 border-t border-border/50 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Engine Path</span>
                    <span className="text-foreground">Implicit</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Policy Mode</span>
                    <span className="text-orange-600">Strict</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-border bg-background p-8">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                  Target Environment
                </div>
                <div className="text-sm font-bold text-foreground truncate">
                  {inferredRepoPath || 'Instance CWD'}
                </div>
                <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                  {inferredRepoPath 
                    ? 'Explicit repository target active' 
                    : 'System-wide default scope'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Synchronizing with Authority
          </span>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="page-container flex flex-col gap-6">
        <Link to="/runs/new" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Start New Context
        </Link>
        <section className="card-professional p-10 text-center">
          <h1 className="text-2xl font-bold">Context Unavailable</h1>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">
            The requested DAX run could not be synchronized. Verify network reachability and system configuration.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <Link to="/runs/new" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          New Execution
        </Link>
        <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Activity className="h-3 w-3" />
          Live Run Console
        </div>
      </div>

      <RunHeader
        snapshot={snapshot}
        streamState={streamState}
        onRefresh={() => void loadRun()}
        targetContext={targetContext}
      />

      {/* Blocked on Attention Banner - Refined */}
      {activeApproval && (
        <section className="rounded-[2.5rem] border border-orange-500/20 bg-orange-500/[0.02] p-10 shadow-apple animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-wrap items-center justify-between gap-10">
            <div className="flex items-start gap-8 max-w-2xl">
              <div className="rounded-3xl bg-orange-500 p-5 text-white shadow-xl shadow-orange-500/20">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Intervention Required</h2>
                <p className="text-base font-medium text-muted-foreground leading-relaxed">
                  Execution has reached a governed boundary. A high-risk <span className="text-foreground underline decoration-orange-500/30 underline-offset-8 font-black uppercase text-[13px] tracking-widest">{activeApproval.type.replace('_', ' ')}</span> action needs operator validation.
                </p>
                <div className="mt-6 inline-flex w-fit items-center gap-3 rounded-2xl bg-background border border-orange-500/20 px-5 py-3 text-[14px] font-mono font-bold text-orange-800 dark:text-orange-300 shadow-sm">
                  {activeApproval.title}: {activeApproval.reason}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                disabled={isApproving}
                onClick={() => void resolveApproval('deny')}
                className="rounded-full border-2 border-border bg-background px-10 py-4 text-sm font-black uppercase tracking-widest text-foreground hover:bg-muted transition-all active:scale-95 disabled:opacity-50"
              >
                Deny
              </button>
              <button
                disabled={isApproving}
                onClick={() => void resolveApproval('approve')}
                className="rounded-full bg-orange-500 px-10 py-4 text-sm font-black uppercase tracking-widest text-white hover:bg-orange-600 shadow-2xl shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {isApproving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Authorize
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-10 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-10 min-h-[700px]">
          <RunTimeline 
            events={events} 
            activeApprovalId={activeApproval?.approvalId} 
            highlightedEventId={searchParams.get('highlight')}
          />
        </div>
        
        <div className="flex flex-col gap-10">
          <RunSummaryCard summary={summary} />
          <RunProfileCard snapshot={snapshot} events={events} />
          <RunEventStream events={events} streamState={streamState} />
        </div>
      </div>

      <ApprovalModal
        approval={activeApproval}
        isSubmitting={isApproving}
        onResolve={resolveApproval}
      />
    </div>
  );
}
