import { CheckCircle2, CircleSlash, FileText, ShieldCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { DaxRunSummary } from '@/types/dax';

interface RunSummaryCardProps {
  summary: DaxRunSummary | null;
}

export function RunSummaryCard({ summary }: RunSummaryCardProps) {
  if (!summary) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Run Summary</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Summary will appear once the run completes or fails.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Run Summary</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Final outcome reported by DAX for this run.
          </p>
        </div>
        <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {summary.outcome?.result || summary.status}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Steps
          </div>
          <div className="mt-2 text-2xl font-semibold">{summary.stepCount}</div>
        </div>
        <div className="rounded-xl bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-orange-500" />
            Approvals
          </div>
          <div className="mt-2 text-2xl font-semibold">{summary.approvalCount}</div>
        </div>
        <div className="rounded-xl bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-sky-500" />
            Artifacts
          </div>
          <div className="mt-2 text-2xl font-semibold">{summary.artifactCount}</div>
        </div>
        <div className="rounded-xl bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CircleSlash className="h-4 w-4 text-muted-foreground" />
            Completed
          </div>
          <div className="mt-2 text-sm font-medium">
            {summary.completedAt ? formatDate(summary.completedAt) : 'Still running'}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background/70 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Outcome</div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
          {summary.outcome?.summaryText || 'DAX did not return summary text for this run.'}
        </p>
      </div>
    </section>
  );
}
