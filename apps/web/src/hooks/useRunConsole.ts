import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiHelpers, streamDaxRunEvents } from '@/lib/api';
import {
  applyDaxEventToSnapshot,
  isTerminalRunStatus,
  shouldRefreshApprovalsForEvent,
  shouldRefreshSummaryForEvent,
} from '@/lib/dax-run';
import type {
  DaxApprovalDecision,
  DaxApprovalRecord,
  DaxRunSnapshot,
  DaxRunSummary,
  DaxStreamEvent,
} from '@/types/dax';

async function readData<T>(promise: Promise<{ data: T }>): Promise<T> {
  const response = await promise;
  return response.data;
}

export function useRunConsole(runId: string, enabled = true) {
  const [snapshot, setSnapshot] = useState<DaxRunSnapshot | null>(null);
  const [events, setEvents] = useState<DaxStreamEvent[]>([]);
  const [approvals, setApprovals] = useState<DaxApprovalRecord[]>([]);
  const [summary, setSummary] = useState<DaxRunSummary | null>(null);
  const [streamState, setStreamState] = useState<'connecting' | 'live' | 'closed'>('closed');
  const [isLoading, setIsLoading] = useState(enabled);
  const [isApproving, setIsApproving] = useState(false);

  const activeApproval = useMemo(
    () => approvals.find((approval) => approval.status === 'pending') || null,
    [approvals],
  );

  const refreshSnapshot = async () => {
    const nextSnapshot = await readData(apiHelpers.getDaxRun(runId));
    setSnapshot(nextSnapshot);
    return nextSnapshot;
  };

  const refreshApprovals = async () => {
    const response = await readData(apiHelpers.getDaxRunApprovals(runId));
    setApprovals(response.approvals || []);
    return response.approvals || [];
  };

  const refreshSummary = async () => {
    try {
      const nextSummary = await readData(apiHelpers.getDaxRunSummary(runId));
      setSummary(nextSummary);
      return nextSummary;
    } catch {
      setSummary(null);
      return null;
    }
  };

  const loadRun = async () => {
    setIsLoading(true);
    try {
      const [nextSnapshot] = await Promise.all([refreshSnapshot(), refreshApprovals()]);
      if (isTerminalRunStatus(nextSnapshot.status)) {
        await refreshSummary();
      } else {
        setSummary(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load run';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setEvents([]);
    setApprovals([]);
    setSummary(null);
    setSnapshot(null);

    if (!enabled || !runId) {
      setIsLoading(false);
      setStreamState('closed');
      return;
    }

    void loadRun();
  }, [enabled, runId]);

  useEffect(() => {
    if (!enabled || !runId) {
      return;
    }

    const controller = new AbortController();
    setStreamState('connecting');

    void streamDaxRunEvents(runId, {
      signal: controller.signal,
      onEvent: (event) => {
        setStreamState('live');
        setEvents((current) => {
          if (current.some((existing) => existing.eventId === event.eventId)) {
            return current;
          }
          return [...current, event];
        });

        setSnapshot((current) => applyDaxEventToSnapshot(current, event));

        if (shouldRefreshApprovalsForEvent(event)) {
          void refreshApprovals();
        }

        if (shouldRefreshSummaryForEvent(event)) {
          void Promise.all([refreshSnapshot(), refreshSummary()]);
        }
      },
    }).catch((error) => {
      if (controller.signal.aborted) {
        return;
      }
      setStreamState('closed');
      const message = error instanceof Error ? error.message : 'Run stream disconnected';
      toast.error(message);
    });

    return () => {
      controller.abort();
      setStreamState('closed');
    };
  }, [enabled, runId]);

  const resolveApproval = async (decision: DaxApprovalDecision, comment?: string) => {
    if (!runId || !activeApproval) {
      return;
    }

    setIsApproving(true);
    try {
      await readData(
        apiHelpers.resolveDaxRunApproval(runId, activeApproval.approvalId, {
          decision,
          comment,
          requestId: activeApproval.approvalId,
        }),
      );
      await Promise.all([refreshApprovals(), refreshSnapshot()]);
      toast.success(`Approval ${decision === 'approve' ? 'approved' : 'denied'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resolve approval';
      toast.error(message);
    } finally {
      setIsApproving(false);
    }
  };

  return {
    activeApproval,
    approvals,
    events,
    isApproving,
    isLoading,
    loadRun,
    resolveApproval,
    snapshot,
    streamState,
    summary,
  };
}
