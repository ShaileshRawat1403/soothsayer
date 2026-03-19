import type { DaxRunSnapshot, DaxRunStatus, DaxStreamEvent } from '@/types/dax';

export function isTerminalRunStatus(status: DaxRunStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export function shouldRefreshApprovalsForEvent(event: DaxStreamEvent): boolean {
  return (
    event.type === 'approval.requested' ||
    event.type === 'approval.resolved' ||
    (event.type === 'run.state_changed' &&
      (event.payload.currentStatus === 'waiting_approval' ||
        event.payload.currentStatus === 'completed' ||
        event.payload.currentStatus === 'failed'))
  );
}

export function shouldRefreshSummaryForEvent(event: DaxStreamEvent): boolean {
  return event.type === 'run.completed' || event.type === 'run.failed';
}

export function applyDaxEventToSnapshot(
  snapshot: DaxRunSnapshot | null,
  event: DaxStreamEvent,
): DaxRunSnapshot | null {
  if (!snapshot || snapshot.runId !== event.runId) {
    return snapshot;
  }

  const next: DaxRunSnapshot = {
    ...snapshot,
    updatedAt: event.timestamp,
    lastEvent: {
      eventId: event.eventId,
      sequence: event.sequence,
      cursor: event.cursor,
      timestamp: event.timestamp,
    },
  };

  switch (event.type) {
    case 'run.started':
      next.status = 'running';
      next.startedAt = next.startedAt || event.timestamp;
      break;
    case 'run.state_changed':
      if (typeof event.payload.currentStatus === 'string') {
        next.status = event.payload.currentStatus as DaxRunStatus;
      }
      break;
    case 'step.proposed':
      if (typeof event.payload.stepId === 'string' && typeof event.payload.title === 'string') {
        next.currentStep = {
          stepId: event.payload.stepId,
          title: event.payload.title,
          detail: typeof event.payload.detail === 'string' ? event.payload.detail : undefined,
          status: 'proposed',
        };
      }
      break;
    case 'step.started':
      if (typeof event.payload.stepId === 'string' && typeof event.payload.title === 'string') {
        next.currentStep = {
          stepId: event.payload.stepId,
          title: event.payload.title,
          detail: typeof event.payload.detail === 'string' ? event.payload.detail : undefined,
          status: 'running',
        };
      }
      break;
    case 'step.completed':
      if (typeof event.payload.stepId === 'string' && typeof event.payload.title === 'string') {
        next.currentStep = {
          stepId: event.payload.stepId,
          title: event.payload.title,
          detail: typeof event.payload.detail === 'string' ? event.payload.detail : undefined,
          status: 'completed',
        };
      }
      break;
    case 'step.failed':
      if (typeof event.payload.stepId === 'string' && typeof event.payload.title === 'string') {
        next.currentStep = {
          stepId: event.payload.stepId,
          title: event.payload.title,
          detail:
            typeof event.payload.error === 'object' &&
            event.payload.error &&
            'message' in event.payload.error &&
            typeof event.payload.error.message === 'string'
              ? event.payload.error.message
              : undefined,
          status: 'failed',
        };
      }
      break;
    case 'approval.requested':
      next.status = 'waiting_approval';
      next.pendingApprovalCount += 1;
      break;
    case 'approval.resolved':
      next.pendingApprovalCount = Math.max(0, next.pendingApprovalCount - 1);
      if (next.status === 'waiting_approval' && next.pendingApprovalCount === 0) {
        next.status = 'running';
      }
      break;
    case 'artifact.created': {
      const artifact = typeof event.payload.artifact === 'object' && event.payload.artifact ? event.payload.artifact : undefined;
      const artifactId =
        artifact && 'artifactId' in artifact && typeof artifact.artifactId === 'string' ? artifact.artifactId : undefined;
      const artifactType = artifact && 'type' in artifact && typeof artifact.type === 'string' ? artifact.type : undefined;
      const latestArtifactIds = [
        ...(next.artifactSummary?.latestArtifactIds ?? []),
        ...(artifactId ? [artifactId] : []),
      ].slice(-3);

      next.artifactSummary = {
        total: (next.artifactSummary?.total ?? 0) + 1,
        byType: artifactType
          ? {
              ...(next.artifactSummary?.byType ?? {}),
              [artifactType]: (next.artifactSummary?.byType?.[artifactType] ?? 0) + 1,
            }
          : next.artifactSummary?.byType,
        latestArtifactIds,
      };
      break;
    }
    case 'run.completed':
      next.status = 'completed';
      next.completedAt = event.timestamp;
      break;
    case 'run.failed':
      next.status = 'failed';
      next.completedAt = event.timestamp;
      break;
    default:
      break;
  }

  return next;
}
