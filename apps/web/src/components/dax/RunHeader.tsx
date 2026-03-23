import { Activity, CircleDot, PauseCircle, ShieldAlert, RefreshCw } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { DaxRecoverySummary, DaxRunSnapshot } from '@/types/dax';

const statusTone: Record<DaxRunSnapshot['status'], string> = {
  created: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  queued: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  running: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  waiting_approval: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  failed: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  cancelled: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
};

interface RunHeaderProps {
  snapshot: DaxRunSnapshot;
  streamState: 'connecting' | 'reconnecting' | 'live' | 'closed';
  onRefresh: () => void;
  recoverySummary?: DaxRecoverySummary | null;
  isRecovering?: boolean;
  hasRecoveredThisSession?: boolean;
  targetContext?: {
    mode: 'explicit_repo_path' | 'default_cwd';
    repoPath?: string;
    workspaceName?: string;
    projectName?: string;
  };
}

export function RunHeader({
  snapshot,
  streamState,
  onRefresh,
  recoverySummary,
  isRecovering,
  hasRecoveredThisSession,
  targetContext,
}: RunHeaderProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]',
                statusTone[snapshot.status]
              )}
            >
              {snapshot.status.replace('_', ' ')}
            </div>
            {isRecovering && (
              <div className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Recovering
              </div>
            )}
            {!isRecovering && recoverySummary?.needsRecovery && (
              <div className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3" />
                Needs Recovery
              </div>
            )}
            {!isRecovering && hasRecoveredThisSession && (
              <div className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Restored
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Stream {streamState}
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{snapshot.title || 'DAX Run'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Run ID: <span className="font-mono text-xs">{snapshot.runId}</span>
            </p>
            {targetContext ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Target:{' '}
                <span className="text-foreground">
                  {targetContext.mode === 'explicit_repo_path'
                    ? targetContext.repoPath || 'Explicit repo path'
                    : 'Default DAX target (cwd)'}
                </span>
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <div className="text-xs uppercase tracking-wide">Created</div>
              <div className="mt-1 text-foreground">{formatDate(snapshot.createdAt)}</div>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <div className="text-xs uppercase tracking-wide">Current Step</div>
              <div className="mt-1 text-foreground">
                {snapshot.currentStep?.title || 'Waiting to begin'}
              </div>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <div className="text-xs uppercase tracking-wide">Pending Approvals</div>
              <div className="mt-1 text-foreground">{snapshot.pendingApprovalCount}</div>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <div className="text-xs uppercase tracking-wide">Artifacts</div>
              <div className="mt-1 text-foreground">{snapshot.artifactSummary?.total ?? 0}</div>
            </div>
          </div>

          {targetContext ? (
            <div className="rounded-xl border border-border bg-background/70 px-3 py-3 text-sm text-muted-foreground">
              <div className="text-xs uppercase tracking-wide">Targeting Mode</div>
              <div className="mt-1 text-foreground">
                {targetContext.mode === 'explicit_repo_path'
                  ? 'Explicit repo target'
                  : 'Fallback to DAX cwd'}
              </div>
              {targetContext.workspaceName ? (
                <div className="mt-1">
                  Workspace: <span className="text-foreground">{targetContext.workspaceName}</span>
                </div>
              ) : null}
              {targetContext.projectName ? (
                <div className="mt-1">
                  Project: <span className="text-foreground">{targetContext.projectName}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <button
            onClick={onRefresh}
            className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Refresh Snapshot
          </button>

          <div className="grid gap-2 text-sm text-muted-foreground">
            {snapshot.currentStep && (
              <div className="flex items-start gap-2">
                <CircleDot className="mt-0.5 h-4 w-4 text-sky-500" />
                <div>
                  <div className="font-medium text-foreground">{snapshot.currentStep.title}</div>
                  <div>{snapshot.currentStep.detail || snapshot.currentStep.status}</div>
                </div>
              </div>
            )}
            {snapshot.status === 'waiting_approval' && (
              <div className="flex items-start gap-2">
                <PauseCircle className="mt-0.5 h-4 w-4 text-orange-500" />
                <div>Run is paused for approval.</div>
              </div>
            )}
            {snapshot.trust?.blocked && (
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-500" />
                <div>
                  {snapshot.trust.reasons?.[0] || 'Trust system marked this run as blocked.'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
