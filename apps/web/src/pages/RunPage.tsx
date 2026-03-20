import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft as ArrowLeftIcon,
  Loader2,
  Play,
  ShieldAlert,
  CheckCircle2,
  Activity,
  ChevronDown,
  User,
} from 'lucide-react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId);

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
        },
      };
      const response = await apiHelpers.createDaxRun(payload);
      const created = response.data;
      toast.success('Trace initialized');
      const nextParams = new URLSearchParams();
      nextParams.set('targetMode', inferredRepoPath ? 'explicit_repo_path' : 'default_cwd');
      if (inferredRepoPath) nextParams.set('repoPath', inferredRepoPath);
      navigate(`/runs/${created.runId}?${nextParams.toString()}`);
    } catch (error) {
      toast.error('Initialization fault');
    } finally {
      setIsLaunching(false);
    }
  };

  if (isLauncher) {
    return (
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 p-10 animate-in-up">
        <header className="flex items-center justify-between border-b border-border/40 pb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-label">
              <Activity className="h-3 w-3" />
              Direct Entry
            </div>
            <h1 className="text-3xl font-black tracking-tighter">Execution Launcher</h1>
          </div>
          <Link to="/terminal" className="btn-secondary text-secondary-content">
            Cancel
          </Link>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-label-sm ml-1">Instruction Buffer</label>
              <textarea
                value={launchInput}
                onChange={(e) => setLaunchInput(e.target.value)}
                placeholder="Specify execution path..."
                className="textarea-base"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-muted/20 p-1 rounded-xl border border-border/40">
                {(['general', 'analysis', 'edit'] as const).map((kind) => (
                  <button
                    key={kind}
                    onClick={() => setLaunchKind(kind)}
                    className={cn(
                      'px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                      launchKind === kind
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground/60 hover:text-foreground'
                    )}
                  >
                    {kind}
                  </button>
                ))}
              </div>
              <button
                onClick={handleLaunch}
                disabled={isLaunching || !launchInput.trim()}
                className="button-professional bg-primary text-white h-11 px-10 shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 disabled:opacity-20"
              >
                {isLaunching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Dispatch'}
              </button>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-border/40 bg-card/30 p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-label-sm">Persona Sync</label>
                <div className="relative group">
                  <select
                    value={selectedPersonaId}
                    onChange={(e) => setSelectedPersonaId(e.target.value)}
                    className="input-base w-full appearance-none"
                  >
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-content" />
                </div>
              </div>
              <div className="pt-4 border-t border-border/40">
                <div className="flex justify-between items-center text-label-sm">
                  <span className="text-muted-content">Authority</span>
                  <span className="text-emerald-600">Strict</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
          <span className="text-label-sm">Syncing Node</span>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-6 animate-in-up">
      <header className="flex items-center justify-between px-2">
        <Link
          to="/dax"
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeftIcon className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
          Authority Monitor
        </Link>
        <div className="flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-primary">
          <Activity className="h-3 w-3" />
          Live Trace
        </div>
      </header>

      <RunHeader
        snapshot={snapshot}
        streamState={streamState}
        onRefresh={() => void loadRun()}
        targetContext={targetContext}
      />

      <AnimatePresence>
        {activeApproval && (
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl border border-orange-500/10 bg-orange-500/[0.01] p-8 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-8">
              <div className="flex items-start gap-6 max-w-xl">
                <div className="rounded-[1.25rem] bg-orange-500 p-4 text-white shadow-lg shadow-orange-500/20">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight uppercase">Governance Gate</h2>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed mt-1 italic">
                    " {activeApproval.reason} "
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={isApproving}
                  onClick={() => void resolveApproval('deny')}
                  className="rounded-xl border border-border bg-background px-8 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/5 hover:text-rose-600 transition-all active:scale-95 disabled:opacity-20"
                >
                  Terminate
                </button>
                <button
                  disabled={isApproving}
                  onClick={() => void resolveApproval('approve')}
                  className="rounded-xl bg-primary px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 disabled:opacity-20 flex items-center gap-2"
                >
                  {isApproving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  Authorize
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

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
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}
