import { useEffect, useMemo, useRef, useState } from 'react';
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
  DaxRunStatus,
  DaxRunSummary,
  DaxStreamEvent,
} from '@/types/dax';

async function readData<T>(promise: Promise<{ data: T }>): Promise<T> {
  const response = await promise;
  return response.data;
}

async function delayWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
      resolve();
    };

    signal.addEventListener('abort', onAbort);
  });
}

function isTerminalStatus(status?: DaxRunStatus | null): boolean {
  return Boolean(status && isTerminalRunStatus(status));
}

export function useRunConsole(runId: string, enabled = true) {
  const [snapshot, setSnapshot] = useState<DaxRunSnapshot | null>(null);
  const [events, setEvents] = useState<DaxStreamEvent[]>([]);
  const [approvals, setApprovals] = useState<DaxApprovalRecord[]>([]);
  const [summary, setSummary] = useState<DaxRunSummary | null>(null);
  const [streamState, setStreamState] = useState<'connecting' | 'reconnecting' | 'live' | 'closed'>('closed');
  const [isLoading, setIsLoading] = useState(enabled);
  const [isApproving, setIsApproving] = useState(false);
  const lastCursorRef = useRef<string | undefined>(undefined);
  const latestStatusRef = useRef<DaxRunStatus | null>(null);

  const activeApproval = useMemo(
    () => approvals.find((approval) => approval.status === 'pending') || null,
    [approvals],
  );

  const refreshSnapshot = async () => {
    const nextSnapshot = await readData(apiHelpers.getDaxRun(runId));
    lastCursorRef.current = nextSnapshot.lastEvent?.cursor;
    latestStatusRef.current = nextSnapshot.status;
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
    lastCursorRef.current = undefined;
    latestStatusRef.current = null;

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
    const maxReconnectAttempts = 5;

    const syncAfterReconnect = async () => {
      const nextSnapshot = await refreshSnapshot();
      if (nextSnapshot.pendingApprovalCount > 0 || nextSnapshot.status === 'waiting_approval') {
        await refreshApprovals();
      }
      if (isTerminalRunStatus(nextSnapshot.status)) {
        await refreshSummary();
      }
      return nextSnapshot;
    };

    void (async () => {
      let reconnectAttempts = 0;

      while (!controller.signal.aborted) {
        setStreamState(reconnectAttempts === 0 ? 'connecting' : 'reconnecting');

        try {
          if (reconnectAttempts > 0) {
            const nextSnapshot = await syncAfterReconnect();
            if (isTerminalStatus(nextSnapshot.status)) {
              setStreamState('closed');
              return;
            }
          }

          await streamDaxRunEvents(runId, {
            cursor: lastCursorRef.current,
            signal: controller.signal,
            onOpen: () => {
              reconnectAttempts = 0;
              setStreamState('live');
            },
            onEvent: (event) => {
              lastCursorRef.current = event.cursor || lastCursorRef.current;
              setEvents((current) => {
                if (current.some((existing) => existing.eventId === event.eventId)) {
                  return current;
                }
                return [...current, event];
              });

              setSnapshot((current) => {
                const nextSnapshot = applyDaxEventToSnapshot(current, event);
                latestStatusRef.current = nextSnapshot?.status ?? latestStatusRef.current;
                lastCursorRef.current = nextSnapshot?.lastEvent?.cursor ?? lastCursorRef.current;
                return nextSnapshot;
              });

              if (shouldRefreshApprovalsForEvent(event)) {
                void refreshApprovals();
              }

              if (shouldRefreshSummaryForEvent(event)) {
                void Promise.all([refreshSnapshot(), refreshSummary()]);
              }
            },
          });

          if (controller.signal.aborted || isTerminalStatus(latestStatusRef.current)) {
            setStreamState('closed');
            return;
          }

          reconnectAttempts += 1;
          if (reconnectAttempts > maxReconnectAttempts) {
            break;
          }
          await delayWithAbort(Math.min(1000 * 2 ** (reconnectAttempts - 1), 5000), controller.signal);
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }

          reconnectAttempts += 1;
          if (reconnectAttempts > maxReconnectAttempts) {
            setStreamState('closed');
            const message = error instanceof Error ? error.message : 'Run stream disconnected';
            toast.error(message);
            return;
          }

          setStreamState('reconnecting');
          await delayWithAbort(Math.min(1000 * 2 ** (reconnectAttempts - 1), 5000), controller.signal);
        }
      }
    })();

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
