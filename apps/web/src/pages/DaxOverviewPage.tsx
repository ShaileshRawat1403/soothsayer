import { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  HeartPulse,
  Workflow,
  Cpu,
  ChevronRight,
  Search,
  Zap,
  Terminal,
  ShieldCheck,
  History,
  XCircle,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiHelpers } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { ApprovalInbox } from '@/components/dax/ApprovalInbox';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  DaxHealthResponse,
  DaxPendingApprovalSummary,
  DaxRecoverySummary,
  DaxRunListItem,
  DaxRunOverviewResponse,
} from '@/types/dax';

export function DaxOverviewPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [health, setHealth] = useState<DaxHealthResponse | null>(null);
  const [overview, setOverview] = useState<DaxRunOverviewResponse | null>(null);
  const [globalOverview, setGlobalOverview] = useState<DaxRunOverviewResponse | null>(null);
  const [recoveryStatus, setRecoveryStatus] = useState<Record<string, DaxRecoverySummary>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'completed' | 'failed'>(
    'all'
  );
  const [showRecoveryOnly, setShowRecoveryOnly] = useState(false);

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
        const [healthResponse, overviewResponse, globalOverviewResponse] = await Promise.all([
          apiHelpers.getDaxHealth(),
          apiHelpers.getDaxOverview(inferredRepoPath),
          apiHelpers.getDaxOverview(undefined),
        ]);
        if (!mounted) return;
        setHealth(healthResponse.data);
        setOverview(overviewResponse.data);
        setGlobalOverview(globalOverviewResponse.data);

        const allRunIds = [
          ...(overviewResponse.data.activeRuns || []).map((r: DaxRunListItem) => r.runId),
          ...(overviewResponse.data.recentRuns || []).map((r: DaxRunListItem) => r.runId),
        ];
        if (allRunIds.length > 0) {
          try {
            const recoveryResponse = await apiHelpers.getDaxBatchRecoveryStatus(
              allRunIds,
              inferredRepoPath
            );
            if (mounted) {
              setRecoveryStatus(recoveryResponse.data);
            }
          } catch {
            // Recovery status is non-critical, don't fail the page load
          }
        }
      } catch (error) {
        toast.error('Authority handshake failed');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [inferredRepoPath]);

  const runLink = (run: any) => {
    const query = new URLSearchParams({
      targetMode: run.targeting?.mode || 'default_cwd',
      ...(run.targeting?.repoPath ? { repoPath: run.targeting.repoPath } : {}),
    });
    return `/runs/${run.runId}?${query.toString()}`;
  };

  const filteredRuns = useMemo(() => {
    let runs = [...(overview?.activeRuns || []), ...(overview?.recentRuns || [])];
    if (filterStatus !== 'all') {
      runs = runs.filter((r) => r.status === filterStatus);
    }
    if (showRecoveryOnly) {
      runs = runs.filter((r) => recoveryStatus[r.runId]?.needsRecovery === true);
    }
    if (searchQuery) {
      runs = runs.filter(
        (r) =>
          r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.runId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    const seen = new Set();
    return runs.filter((r) => {
      if (seen.has(r.runId)) return false;
      seen.add(r.runId);
      return true;
    });
  }, [overview, searchQuery, filterStatus, showRecoveryOnly, recoveryStatus]);

  const recoveryCount = useMemo(() => {
    const allRuns = [...(overview?.activeRuns || []), ...(overview?.recentRuns || [])];
    return allRuns.filter((r) => recoveryStatus[r.runId]?.needsRecovery).length;
  }, [overview, recoveryStatus]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 p-10 animate-in-up">
      {/* High-Density Authority Header */}
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 text-label">
              <Activity className="h-3 w-3" />
              DAX Control Plane
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">
              Authority Monitor
            </h1>
          </div>
          <Link
            to="/runs/new"
            className="btn-primary flex items-center gap-2.5 px-10 h-11 shadow-xl shadow-primary/10"
          >
            Dispatch Trace
            <Zap className="h-4 w-4 fill-current" />
          </Link>
        </div>

        {/* Quick Operational Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-border/40 bg-card/30 flex items-center justify-between hover-glow group transition-all">
            <div className="space-y-1">
              <span className="text-label-sm">Active Sync</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xl font-black">
                  {overview?.activeRuns?.length || 0} Flows
                </span>
              </div>
            </div>
            <Terminal className="h-5 w-5 text-muted-content group-hover:text-primary transition-colors" />
          </div>
          <div className="p-5 rounded-2xl border border-border/40 bg-card/30 flex items-center justify-between hover-glow group transition-all">
            <div className="space-y-1">
              <span className="text-label-sm">Gated Intents</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-orange-600">
                  {globalOverview?.pendingApprovals?.length || 0} Pending
                </span>
              </div>
            </div>
            <ShieldCheck className="h-5 w-5 text-muted-content group-hover:text-orange-500 transition-colors" />
          </div>
          <div className="p-5 rounded-2xl border border-border/40 bg-card/30 flex items-center justify-between hover-glow group transition-all">
            <div className="space-y-1">
              <span className="text-label-sm">System Node</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-black uppercase tracking-tight">
                  {health?.version || 'v1.0.0'}
                </span>
              </div>
            </div>
            <Cpu className="h-5 w-5 text-muted-content group-hover:text-primary transition-colors" />
          </div>
          <div className="p-5 rounded-2xl border border-border/40 bg-card/30 flex items-center justify-between hover-glow group transition-all">
            <div className="space-y-1">
              <span className="text-label-sm">SLA Status</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-black uppercase tracking-tight text-emerald-600/80">
                  Nominal
                </span>
              </div>
            </div>
            <HeartPulse className="h-5 w-5 text-muted-content group-hover:text-emerald-500 transition-colors" />
          </div>
        </div>
      </header>

      {/* Global Queue Dashboard */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-secondary-content leading-none">
              Authorization Queue
            </h2>
          </div>
          <span className="text-label-sm">Priority Triage Active</span>
        </div>

        {globalOverview?.pendingApprovals?.length ? (
          <ApprovalInbox approvals={globalOverview.pendingApprovals} runLink={runLink} />
        ) : (
          <div className="p-16 rounded-3xl border border-dashed border-border/60 bg-muted/[0.01] text-center flex flex-col items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-muted-content" />
            <span className="text-label-sm">Buffer Clean • Operational Readiness High</span>
          </div>
        )}
      </section>

      {/* Advanced Filter & Trace View */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-secondary-content leading-none">
            Operational Traces
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative group max-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary-content group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter traces..."
                className="input-search"
              />
            </div>
            <div className="flex gap-1 bg-muted/20 p-1 rounded-xl border border-border/40">
              {(['all', 'running', 'completed', 'failed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-label-sm transition-all',
                    filterStatus === s
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-interactive hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            {recoveryCount > 0 && (
              <button
                onClick={() => setShowRecoveryOnly(!showRecoveryOnly)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-label-sm transition-all border',
                  showRecoveryOnly
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-muted/20 text-interactive border-border/40 hover:text-amber-600'
                )}
              >
                <RefreshCw className="h-3 w-3" />
                Recovery ({recoveryCount})
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          {filteredRuns.length === 0 ? (
            <div className="p-20 text-center rounded-3xl border border-border/40 bg-card/10">
              <span className="text-label-sm">No matching signals found</span>
            </div>
          ) : (
            filteredRuns.map((run) => (
              <TraceRow
                key={run.runId}
                run={run}
                to={runLink(run)}
                recoveryStatus={recoveryStatus[run.runId]}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function TraceRow({
  run,
  to,
  recoveryStatus,
}: {
  run: DaxRunListItem;
  to: string;
  recoveryStatus?: DaxRecoverySummary;
}) {
  const needsRecovery = recoveryStatus?.needsRecovery === true;
  const isContractMutation = run.failureCode === 'contract_mutation';

  return (
    <Link
      to={to}
      className="group flex items-center justify-between p-5 rounded-2xl border border-border/40 bg-card/20 hover-lift hover-glow transition-all duration-300 active:scale-[0.995]"
    >
      <div className="flex items-center gap-8 min-w-0 flex-1">
        <div
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            isContractMutation
              ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
              : needsRecovery
                ? 'bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                : run.status === 'completed'
                  ? 'bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : run.status === 'failed'
                    ? 'bg-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                    : 'bg-primary animate-pulse'
          )}
        />

        <div className="flex items-center gap-10 flex-1 min-w-0">
          <div className="min-w-[120px] font-mono text-mono-sm uppercase tracking-widest shrink-0">
            {run.runId.substring(0, 12)}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[13px] font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors truncate block">
              {run.title || 'Inference Flow'}
            </span>
            <div className="flex items-center gap-3 mt-1 text-meta">
              <span className="flex items-center gap-1.5">
                <History className="h-2.5 w-2.5" /> {run.sourceSurface}
              </span>
              <span className="h-1 w-1 rounded-full bg-border/40" />
              <span>{run.provider || 'Authority Node'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8 shrink-0 ml-10">
        {isContractMutation && (
          <div className="rounded-lg px-2 py-1 text-label-sm bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            {run.failureLabel || 'Governance Violation'}
          </div>
        )}
        {needsRecovery && !isContractMutation && (
          <div className="rounded-lg px-2 py-1 text-label-sm bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Recovery
          </div>
        )}
        <div
          className={cn(
            'px-3 py-1 rounded-lg text-label-sm border',
            run.status === 'running'
              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/10'
              : run.status === 'waiting_approval'
                ? 'bg-orange-500/5 text-orange-600 border-orange-500/20'
                : run.status === 'completed'
                  ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10'
                  : 'bg-rose-500/5 text-rose-600 border-rose-500/10'
          )}
        >
          {run.status.replace('_', ' ')}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-content group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </Link>
  );
}
