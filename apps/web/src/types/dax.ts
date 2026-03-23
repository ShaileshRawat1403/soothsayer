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
  SoothsayerApprovalDetail,
  SoothsayerOverview,
  SoothsayerRunDetail,
  SoothsayerWorkflowCard,
  DaxRecoverySummary,
  DaxRecoveryResult,
} from '@soothsayer/types';

import type { DaxResolveApprovalRequest as SharedDaxResolveApprovalRequest } from '@soothsayer/types';

export type DaxResolveApprovalRequest = Omit<SharedDaxResolveApprovalRequest, 'actorId' | 'source'>;
