import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Play } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { RunHeader } from '@/components/dax/RunHeader';
import { RunEventStream } from '@/components/dax/RunEventStream';
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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <Link to="/terminal" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Terminal
        </Link>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="max-w-2xl">
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              DAX Workstation Slice
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Start a live DAX run</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This launcher creates the first Soothsayer-backed DAX run, then drops us straight into the live run surface for observation, approvals, and summary.
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Execution Target
              </div>
              {inferredRepoPath ? (
                <>
                  <div className="mt-2 text-foreground">{inferredRepoPath}</div>
                  <div className="mt-1 text-muted-foreground">
                    This run will launch against the explicit repo target above.
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2 text-foreground">Default DAX target (cwd)</div>
                  <div className="mt-1 text-muted-foreground">
                    No explicit repo target is available in the current workspace context, so this launch will fall back to the DAX server cwd.
                  </div>
                </>
              )}
              {currentWorkspace?.name ? (
                <div className="mt-2 text-muted-foreground">
                  Workspace: <span className="text-foreground">{currentWorkspace.name}</span>
                </div>
              ) : null}
              {currentProject?.name ? (
                <div className="mt-1 text-muted-foreground">
                  Project: <span className="text-foreground">{currentProject.name}</span>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Instruction</label>
              <textarea
                value={launchInput}
                onChange={(event) => setLaunchInput(event.target.value)}
                placeholder="Example: inspect the repo, propose a safe patch for the failing auth flow, and wait for approval before editing files."
                className="min-h-40 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(['general', 'analysis', 'edit'] as const).map((kind) => (
                <button
                  key={kind}
                  onClick={() => setLaunchKind(kind)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    launchKind === kind
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {kind}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                disabled={isLaunching}
                onClick={() => void handleLaunch()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLaunching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Start Run
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading DAX run
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
        <Link to="/runs/new" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Start a new run instead
        </Link>
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Run unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We could not load this DAX run. Check `DAX_BASE_URL`, the run ID, and backend connectivity.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Link to="/runs/new" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          New run
        </Link>
      </div>

      <RunHeader
        snapshot={snapshot}
        streamState={streamState}
        onRefresh={() => void loadRun()}
        targetContext={targetContext}
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <RunEventStream events={events} streamState={streamState} />
        <RunSummaryCard summary={summary} />
      </div>

      <ApprovalModal
        approval={activeApproval}
        isSubmitting={isApproving}
        onResolve={resolveApproval}
      />
    </div>
  );
}
