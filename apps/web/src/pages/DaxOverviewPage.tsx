import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, HeartPulse, ShieldAlert, Workflow, Bell, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiHelpers } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { ApprovalInbox } from '@/components/dax/ApprovalInbox';
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
  const [globalOverview, setGlobalOverview] = useState<DaxRunOverviewResponse | null>(null);
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

  const scopeLabel = inferredRepoPath ? 'Selected repo scope' : 'Default DAX instance scope';
  const scopeDescription = inferredRepoPath
    ? `Showing DAX activity for ${inferredRepoPath}.`
    : 'No workspace repo is selected, so this view is showing the default DAX instance scope.';

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [healthResponse, overviewResponse, globalOverviewResponse] = await Promise.all([
          apiHelpers.getDaxHealth(),
          apiHelpers.getDaxOverview(inferredRepoPath),
          // Always fetch global overview (unscoped) for the system-wide approval inbox
          apiHelpers.getDaxOverview(undefined),
        ]);
        if (!mounted) return;
        setHealth(healthResponse.data);
        setOverview(overviewResponse.data);
        setGlobalOverview(globalOverviewResponse.data);
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

  const globalApprovals = globalOverview?.pendingApprovals || [];
  const hasGlobalApprovals = globalApprovals.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 p-10">
      <section className="card-professional p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Activity className="h-3 w-3" />
              Authority Monitor
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground">DAX Control Panel</h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              System-level visibility into governed execution. Monitor connectivity, manage pending approvals, and track recent run outcomes.
            </p>
          </div>

          <Link
            to="/runs/new"
            className="button-professional bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/10 flex items-center gap-2"
          >
            Start direct run
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Global Approval Inbox V2 */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-3 px-2">
          <div className="rounded-2xl bg-primary p-3 text-primary-foreground shadow-lg shadow-primary/20">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Global Approval Inbox</h2>
            <p className="text-sm font-medium text-muted-foreground">
              Priority actions requiring operator authorization.
            </p>
          </div>
        </div>
        
        {hasGlobalApprovals ? (
          <ApprovalInbox approvals={globalApprovals} runLink={runLink} />
        ) : (
          <div className="card-professional p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Clear Workspace</h3>
            <p className="mt-1 text-xs text-muted-foreground">No pending approvals detected across the system.</p>
          </div>
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <section className="card-professional flex flex-col h-full overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/5 p-2.5 text-primary">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">DAX Connectivity</h2>
                <p className="text-xs font-medium text-muted-foreground">Verification of the execution authority.</p>
              </div>
            </div>
          </div>

          <div className="p-8 flex-1">
            {isLoading ? (
              <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Synchronizing health state...
              </div>
            ) : health ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] p-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70">
                    Status
                  </div>
                  <div className="mt-2 text-lg font-bold text-emerald-700">
                    Operational
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-muted/20 p-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Version
                  </div>
                  <div className="mt-2 text-sm font-bold text-foreground">{health.version}</div>
                </div>
                <div className="rounded-2xl border border-border bg-muted/20 p-5 md:col-span-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Authority Endpoint
                  </div>
                  <div className="mt-2 font-mono text-xs font-medium text-foreground truncate">
                    {health.baseUrl || 'Unknown'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] p-6 text-sm font-medium text-rose-700">
                Connection failure. The execution authority is unreachable.
              </div>
            )}
          </div>
        </section>

        <section className="card-professional flex flex-col h-full overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-500/5 p-2.5 text-orange-600">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Policy Guidance</h2>
                <p className="text-xs font-medium text-muted-foreground">First control-plane operational slice.</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground font-medium">
              This interface provides high-level coordination. It does not mirror real-time execution transcripts.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground font-medium">
              Use the Approval Inbox to authorize actions. Navigate to the Live Run Console for granular trace details and decision support.
            </p>
          </div>
        </section>
      </div>

      <section className="card-professional overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Environmental Scope</h2>
            <p className="text-xs font-medium text-muted-foreground">
              {scopeDescription}
            </p>
          </div>
          <div className="rounded-full border border-border bg-background px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-foreground">
            {scopeLabel}
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Active Contexts</h3>
            </div>
            <div className="space-y-3">
              {(overview?.activeRuns || []).length === 0 ? (
                <p className="text-xs font-medium text-muted-foreground py-4">
                  No active executions in current scope.
                </p>
              ) : (
                overview!.activeRuns.map((run) => (
                  <RunRow key={run.runId} run={run} to={runLink(run)} />
                ))
              )}
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Workflow className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Recent Outcomes</h3>
            </div>
            <div className="space-y-3">
              {(overview?.recentRuns || []).length === 0 ? (
                <p className="text-xs font-medium text-muted-foreground py-4">
                  No recent execution history.
                </p>
              ) : (
                overview!.recentRuns.map((run) => (
                  <RunRow key={run.runId} run={run} to={runLink(run)} />
                ))
              )}
            </div>
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
      className="group block rounded-2xl border border-border bg-background p-4 transition-all hover:border-primary/30 hover:shadow-apple"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{run.runId.substring(0, 12)}</div>
          <div className="mt-1 text-sm font-bold text-foreground group-hover:text-primary transition-colors">{run.title || 'Untitled Context'}</div>
          <div className="mt-1 text-[11px] font-medium text-muted-foreground">
            {run.currentStep?.title || 'Inactive'} · {run.sourceSurface}
          </div>
        </div>
        <div className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border ${
          run.status === 'running' || run.status === 'waiting_approval'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-secondary text-muted-foreground border-border'
        }`}>
          {run.status}
        </div>
      </div>
    </Link>
  );
}
