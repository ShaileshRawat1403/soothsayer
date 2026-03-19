export type {
  DaxApprovalDecision,
  DaxApprovalRecord,
  DaxApprovalStatus,
  DaxApprovalsResponse,
  DaxArtifactRecord,
  DaxCreateRunRequest,
  DaxCreateRunResponse,
  DaxRunEvent,
  DaxRunSnapshot,
  DaxRunStatus,
  DaxRunSummary,
  DaxStreamEvent,
} from '@soothsayer/types';

import type { DaxResolveApprovalRequest as SharedDaxResolveApprovalRequest } from '@soothsayer/types';

export type DaxResolveApprovalRequest = Omit<
  SharedDaxResolveApprovalRequest,
  'actorId' | 'source'
>;
