import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, HeartPulse, ShieldAlert, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiHelpers } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import type {
  DaxHealthResponse,
  DaxPendingApprovalSummary,
  DaxRunListItem,
  DaxRunOverviewResponse,
} from '@/types/dax';

function formatCheckedAt(value?: string): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function DaxOverviewPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [health, setHealth] = useState<DaxHealthResponse | null>(null);
  const [overview, setOverview] = useState<DaxRunOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const workspaceSettings =
    currentWorkspace?.settings && typeof currentWorkspace.settings === 'object'
      ? (currentWorkspace.settings as Record<string, unknown>)
      : null;
  const inferredRepoPath =
    typeof workspaceSettings?.repoPath === 'string'
      ? workspaceSettings.repoPath
      : typeof workspaceSettings?.defaultRepoPath === 'string'
        ? workspaceSettings.defaultRepoPath
        : typeof workspaceSettings?.targetRepoPath === 'string'
          ? workspaceSettings.targetRepoPath
          : undefined;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [healthResponse, overviewResponse] = await Promise.all([
          apiHelpers.getDaxHealth(),
          apiHelpers.getDaxOverview(inferredRepoPath),
        ]);
        if (!mounted) return;
        setHealth(healthResponse.data);
        setOverview(overviewResponse.data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load DAX health';
        toast.error(message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [inferredRepoPath]);

  const runLink = (run: { runId: string; targeting?: { mode: 'explicit_repo_path' | 'default_cwd'; repoPath?: string } }) => {
    const query = new URLSearchParams({
      targetMode: run.targeting?.mode || 'default_cwd',
      ...(run.targeting?.repoPath ? { repoPath: run.targeting.repoPath } : {}),
    });
    return `/runs/${run.runId}?${query.toString()}`;
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              DAX Control Panel
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Governed execution overview</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This surface is for system-level visibility into DAX-backed execution. Use it to confirm DAX availability and navigate into the live run console, not to duplicate execution transcripts.
            </p>
          </div>

          <Link
            to="/runs/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Start direct run
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">DAX health</h2>
              <p className="text-sm text-muted-foreground">Connectivity truth for the execution authority.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 text-sm text-muted-foreground">Checking DAX connectivity…</div>
          ) : health ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                  Status
                </div>
                <div className="mt-2 text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                  Healthy
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Version
                </div>
                <div className="mt-2 text-sm font-medium text-foreground">{health.version}</div>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Base URL
                </div>
                <div className="mt-2 break-all text-sm text-foreground">
                  {health.baseUrl || 'Unknown'}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Last checked
                </div>
                <div className="mt-2 text-sm text-foreground">{formatCheckedAt(health.checkedAt)}</div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
              DAX health could not be loaded. Check `DAX_BASE_URL`, upstream auth posture, and network reachability.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Phase 3B note</h2>
              <p className="text-sm text-muted-foreground">What this first control-plane slice covers.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <p>
              This first DAX overview page intentionally starts with health and navigation. It does not duplicate the live run console.
            </p>
            <p>
              Use the sections below to see active work, approval attention, and recent run outcomes. Open the live run console for transcript, approvals, and detailed execution state.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-6">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Active runs</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(overview?.activeRuns || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No active DAX runs right now.</p>
            ) : (
              overview!.activeRuns.map((run) => (
                <RunRow key={run.runId} run={run} to={runLink(run)} />
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Pending approvals</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(overview?.pendingApprovals || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending approvals across current DAX runs.</p>
            ) : (
              overview!.pendingApprovals.map((approval) => (
                <ApprovalRow key={approval.approvalId} approval={approval} to={runLink(approval)} />
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-6">
          <div className="flex items-center gap-3">
            <Workflow className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Recent runs</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(overview?.recentRuns || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent completed or failed DAX runs yet.</p>
            ) : (
              overview!.recentRuns.map((run) => (
                <RunRow key={run.runId} run={run} to={runLink(run)} />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function RunRow({
  run,
  to,
}: {
  run: DaxRunListItem;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-border bg-background/80 p-4 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs text-foreground">{run.runId}</div>
          <div className="mt-1 text-sm font-medium text-foreground">{run.title || 'Untitled run'}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {run.currentStep?.title || 'No current step'} · {run.sourceSurface} ·{' '}
            {run.targeting?.repoPath || 'Default DAX target (cwd)'}
          </div>
        </div>
        <div className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
          {run.status}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Approvals: {run.pendingApprovalCount}</span>
        <span>Updated: {formatCheckedAt(run.updatedAt)}</span>
      </div>
    </Link>
  );
}

function ApprovalRow({
  approval,
  to,
}: {
  approval: DaxPendingApprovalSummary;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-border bg-background/80 p-4 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs text-foreground">{approval.runId}</div>
          <div className="mt-1 text-sm font-medium text-foreground">{approval.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {approval.reason} · {approval.sourceSurface} · {approval.targeting?.repoPath || 'Default DAX target (cwd)'}
          </div>
        </div>
        <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
          {approval.risk}
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Requested: {formatCheckedAt(approval.createdAt)}
      </div>
    </Link>
  );
}
