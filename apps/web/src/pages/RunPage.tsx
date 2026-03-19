import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Play, ShieldAlert, CheckCircle2, Activity, ChevronDown, User } from 'lucide-react';
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
          approvalMode: 'strict',
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
      nextParams.set('targetMode', inferredRepoPath ? 'explicit_repo_path' : 'default_cwd');
      if (inferredRepoPath) nextParams.set('repoPath', inferredRepoPath);
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
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 p-8">
        <div className="flex items-center justify-between">
          <Link to="/terminal" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Back to Console
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
            <Play className="h-2.5 w-2.5 fill-current" />
            Launcher
          </div>
        </div>

        <section className="card-professional p-10 border-border/40">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-3xl font-black tracking-tighter text-foreground">Initiate Trace</h1>
                <textarea
                  value={launchInput}
                  onChange={(event) => setLaunchInput(event.target.value)}
                  placeholder="Specify instruction..."
                  className="min-h-48 w-full rounded-3xl border border-border/60 bg-background px-6 py-5 text-base shadow-inner focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-muted-foreground/20"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-6 pt-4">
                <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-full border border-border/40">
                  {(['general', 'analysis', 'edit'] as const).map((kind) => (
                    <button
                      key={kind}
                      onClick={() => setLaunchKind(kind)}
                      className={`rounded-full px-6 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                        launchKind === kind
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground/60 hover:text-foreground'
                      }`}
                    >
                      {kind}
                    </button>
                  ))}
                </div>

                <button
                  disabled={isLaunching}
                  onClick={() => void handleLaunch()}
                  className="button-professional bg-primary text-primary-foreground hover:opacity-90 shadow-xl shadow-primary/20 flex items-center gap-2 px-10 h-12"
                >
                  {isLaunching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                  <span className="text-xs font-black uppercase tracking-widest">Execute</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-border/40 bg-muted/10 p-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Persona
                  </label>
                  <div className="relative group">
                    <select
                      value={selectedPersonaId}
                      onChange={(e) => setSelectedPersonaId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-3 text-xs font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    >
                      {personas.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <span>Mode</span>
                    <span className="text-orange-600">Strict</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/40 bg-background p-6">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
                  Environment
                </div>
                <div className="text-[11px] font-black text-foreground truncate uppercase tracking-tight">
                  {inferredRepoPath || 'Instance Root'}
                </div>
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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary/20" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
            Synchronizing Authority
          </span>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Link to="/dax" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Back to Monitor
        </Link>
        <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          <Activity className="h-3 w-3" />
          Live Console
        </div>
      </div>

      <RunHeader
        snapshot={snapshot}
        streamState={streamState}
        onRefresh={() => void loadRun()}
        targetContext={targetContext}
      />

      {activeApproval && (
        <section className="rounded-3xl border border-orange-500/20 bg-orange-500/[0.02] p-8 shadow-apple animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center justify-between gap-8">
            <div className="flex items-start gap-6 max-w-xl">
              <div className="rounded-2xl bg-orange-500 p-4 text-white shadow-lg shadow-orange-500/20">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-black tracking-tight text-foreground uppercase">Authorization Node</h2>
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                  Execution suspended at governed boundary. Action validation required.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-background border border-orange-500/20 px-4 py-2 text-[12px] font-mono font-bold text-orange-800 dark:text-orange-300">
                  {activeApproval.reason}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                disabled={isApproving}
                onClick={() => void resolveApproval('deny')}
                className="rounded-full border border-border bg-background px-8 py-3 text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-muted active:scale-95 disabled:opacity-50"
              >
                Deny
              </button>
              <button
                disabled={isApproving}
                onClick={() => void resolveApproval('approve')}
                className="rounded-full bg-orange-500 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Authorize
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6 min-h-[600px]">
          <RunTimeline 
            events={events} 
            activeApprovalId={activeApproval?.approvalId} 
            highlightedEventId={searchParams.get('highlight')}
          />
        </div>
        
        <div className="flex flex-col gap-6">
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

function ArrowLeft({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
    </svg>
  );
}
