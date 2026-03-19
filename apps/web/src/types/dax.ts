export type {
  DaxApprovalDecision,
  DaxApprovalRecord,
  DaxApprovalStatus,
  DaxApprovalsResponse,
  DaxArtifactRecord,
  DaxCreateRunRequest,
  DaxCreateRunResponse,
  DaxHealthResponse,
  DaxPendingApprovalSummary,
  DaxRunEvent,
  DaxRunListItem,
  DaxRunOverviewResponse,
  DaxRunSnapshot,
  DaxRunSourceSurface,
  DaxRunStatus,
  DaxRunSummary,
  DaxStreamEvent,
  DaxRunTargetingSummary,
} from '@soothsayer/types';

import type { DaxResolveApprovalRequest as SharedDaxResolveApprovalRequest } from '@soothsayer/types';

export type DaxResolveApprovalRequest = Omit<
  SharedDaxResolveApprovalRequest,
  'actorId' | 'source'
>;
