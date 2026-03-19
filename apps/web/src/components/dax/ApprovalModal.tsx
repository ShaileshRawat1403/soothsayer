import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { DaxApprovalDecision, DaxApprovalRecord } from '@/types/dax';

interface ApprovalModalProps {
  approval: DaxApprovalRecord | null;
  isSubmitting: boolean;
  onResolve: (decision: DaxApprovalDecision, comment?: string) => Promise<void>;
}

const riskTone: Record<NonNullable<DaxApprovalRecord['risk']>, string> = {
  low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  critical: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

export function ApprovalModal({ approval, isSubmitting, onResolve }: ApprovalModalProps) {
  const [comment, setComment] = useState('');

  useEffect(() => {
    setComment('');
  }, [approval?.approvalId]);

  if (!approval) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            <div>
              <h2 className="text-lg font-semibold">Approval Required</h2>
              <p className="text-sm text-muted-foreground">
                This DAX run is paused until we send a decision.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]', riskTone[approval.risk])}>
              {approval.risk} risk
            </span>
            <span className="text-sm text-muted-foreground">{approval.type.replace('_', ' ')}</span>
          </div>

          <div>
            <div className="text-base font-semibold">{approval.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{approval.reason}</p>
          </div>

          <div className="grid gap-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Command</div>
              <div className="mt-1 break-words font-mono text-xs text-foreground">
                {approval.context?.command || 'Not provided'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">File Path</div>
              <div className="mt-1 break-words font-mono text-xs text-foreground">
                {approval.context?.filePath || 'Not provided'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Tool</div>
              <div className="mt-1 text-foreground">
                {approval.context?.toolName || 'Not provided'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Requested</div>
              <div className="mt-1 text-foreground">{formatDate(approval.createdAt)}</div>
            </div>
          </div>

          {approval.context?.notes?.length ? (
            <div className="rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
              {approval.context.notes.join(', ')}
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium">Comment</label>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Optional audit note for this approval decision"
              className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <button
            disabled={isSubmitting}
            onClick={() => void onResolve('deny', comment.trim() || undefined)}
            className="rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Deny
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => void onResolve('approve', comment.trim() || undefined)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
