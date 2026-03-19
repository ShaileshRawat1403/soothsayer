import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, HeartPulse, ShieldAlert, Workflow, Bell, Inbox, Cpu, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiHelpers } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { ApprovalInbox } from '@/components/dax/ApprovalInbox';
import { cn } from '@/lib/utils';
import type {
  DaxHealthResponse,
  DaxPendingApprovalSummary,
  DaxRunListItem,
  DaxRunOverviewResponse,
} from '@/types/dax';

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

  const scopeLabel = inferredRepoPath ? 'Selected repo scope' : 'Default instance';

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [healthResponse, overviewResponse, globalOverviewResponse] = await Promise.all([
          apiHelpers.getDaxHealth(),
          apiHelpers.getDaxOverview(inferredRepoPath),
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
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 p-8">
      {/* Authority Banner - Tightened */}
      <section className="card-professional p-8 border-border/40">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-sm border border-primary/10 transition-transform hover:scale-105">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tighter text-foreground">Authority Monitor</h1>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-600">Operational</span>
              </div>
              <p className="mt-1 text-sm font-medium text-muted-foreground leading-relaxed">
                Governed execution control plane. Manage active authorizations and track run integrity.
              </p>
            </div>
          </div>

          <Link
            to="/runs/new"
            className="button-professional bg-primary text-primary-foreground hover:opacity-90 shadow-xl shadow-primary/20 flex items-center gap-2 px-8"
          >
            Launch Run
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Global Approval Inbox V3 - Tightened */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2 text-primary-foreground shadow-lg shadow-primary/10">
              <Inbox className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-widest text-foreground">Queue Triage</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">SLA Status</span>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>
        
        {hasGlobalApprovals ? (
          <ApprovalInbox approvals={globalApprovals} runLink={runLink} />
        ) : (
          <div className="card-professional p-10 text-center bg-muted/[0.02] border-dashed border-border/60">
            <div className="mx-auto w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Bell className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground/60">Clear Buffer</h3>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">No pending authorizations</p>
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Connectivity */}
        <section className="card-professional flex flex-col h-full overflow-hidden border-border/40">
          <div className="border-b border-border/30 bg-muted/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <HeartPulse className="h-4 w-4 text-primary/60" />
              <h2 className="text-xs font-black uppercase tracking-widest">DAX Sync</h2>
            </div>
          </div>

          <div className="p-6 flex-1">
            {isLoading ? (
              <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">
                <Loader2 className="h-3 w-3 animate-spin" />
                Handshake...
              </div>
            ) : health ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border/40 bg-muted/5 p-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Version</span>
                  <span className="text-xs font-black font-mono">{health.version}</span>
                </div>
                <div className="rounded-xl border border-border/40 bg-muted/5 p-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-2">Endpoint Node</span>
                  <span className="text-[10px] font-mono text-foreground truncate block">{health.baseUrl || 'authority.local'}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-rose-500/10 bg-rose-500/[0.02] p-4 text-[10px] font-black uppercase tracking-widest text-rose-600">
                Connection Fault
              </div>
            )}
          </div>
        </section>

        {/* Operational Scope */}
        <section className="card-professional lg:col-span-2 overflow-hidden border-border/40">
          <div className="border-b border-border/30 bg-muted/10 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-primary/60" />
              <h2 className="text-xs font-black uppercase tracking-widest text-foreground">Recent Traces</h2>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{scopeLabel}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/20">
            <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto scrollbar-none">
              {(overview?.activeRuns || []).length === 0 ? (
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 py-10 text-center">No Active Flows</p>
              ) : (
                overview!.activeRuns.map((run) => (
                  <RunRow key={run.runId} run={run} to={runLink(run)} />
                ))
              )}
            </div>
            <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto scrollbar-none">
              {(overview?.recentRuns || []).length === 0 ? (
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 py-10 text-center">History Empty</p>
              ) : (
                overview!.recentRuns.map((run) => (
                  <RunRow key={run.runId} run={run} to={runLink(run)} />
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RunRow({ run, to }: { run: DaxRunListItem; to: string }) {
  return (
    <Link
      to={to}
      className="group block rounded-xl border border-border/40 bg-background/40 p-3.5 transition-all hover:border-primary/30 hover:shadow-apple active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-[9px] text-muted-foreground/40 uppercase tracking-widest">{run.runId.substring(0, 8)}</div>
          <div className="mt-0.5 text-xs font-black text-foreground group-hover:text-primary transition-colors truncate uppercase tracking-tight">{run.title || 'Untitled'}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">{run.sourceSurface}</span>
            {run.provider && (
              <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">{run.provider}</span>
            )}
          </div>
        </div>
        <div className={cn(
          "rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border",
          run.status === 'running' ? "bg-primary text-white border-primary shadow-lg shadow-primary/10" :
          run.status === 'waiting_approval' ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/10" :
          "bg-secondary text-muted-foreground border-border"
        )}>
          {run.status.replace('_', ' ')}
        </div>
      </div>
    </Link>
  );
}
