import { OperationTier, RiskLevel } from './tool';

export interface Policy {
  id: string;
  workspaceId?: string; // null for global policies
  name: string;
  description: string;
  isActive: boolean;
  priority: number; // Lower = higher priority
  rules: PolicyRule[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyRule {
  id: string;
  policyId: string;
  name: string;
  description?: string;
  condition: PolicyCondition;
  action: PolicyAction;
  isActive: boolean;
  order: number;
}

export interface PolicyCondition {
  type: ConditionType;
  config: ConditionConfig;
  children?: PolicyCondition[];
  logic?: 'and' | 'or';
}

export type ConditionType =
  | 'tier'
  | 'risk_level'
  | 'tool'
  | 'user_role'
  | 'time'
  | 'path'
  | 'command'
  | 'content'
  | 'rate'
  | 'composite';

export interface ConditionConfig {
  // Tier condition
  tiers?: OperationTier[];
  
  // Risk level condition
  riskLevels?: RiskLevel[];
  
  // Tool condition
  toolIds?: string[];
  toolCategories?: string[];
  
  // User role condition
  roles?: string[];
  userIds?: string[];
  
  // Time condition
  timeRange?: {
    start: string; // HH:mm
    end: string;
    timezone?: string;
    daysOfWeek?: number[];
  };
  
  // Path condition
  pathPatterns?: string[];
  pathMode?: 'allow' | 'deny';
  
  // Command condition
  commandPatterns?: string[];
  commandMode?: 'allow' | 'deny';
  
  // Content condition
  contentPatterns?: string[];
  contentMode?: 'allow' | 'deny' | 'flag';
  
  // Rate condition
  maxPerMinute?: number;
  maxPerHour?: number;
  maxPerDay?: number;
}

export interface PolicyAction {
  type: ActionType;
  config: ActionConfig;
}

export type ActionType =
  | 'allow'
  | 'deny'
  | 'require_approval'
  | 'notify'
  | 'audit'
  | 'transform';

export interface ActionConfig {
  // Approval action
  approvers?: string[]; // User IDs or roles
  approvalTimeout?: number; // milliseconds
  escalationChain?: string[];
  
  // Notify action
  notifyChannels?: ('email' | 'slack' | 'in-app')[];
  notifyRecipients?: string[];
  notifyTemplate?: string;
  
  // Audit action
  auditLevel?: 'basic' | 'detailed' | 'full';
  auditRetention?: number; // days
  
  // Transform action
  transformations?: Transformation[];
  
  // Deny action
  denyMessage?: string;
  denyCode?: string;
}

export interface Transformation {
  type: 'redact' | 'replace' | 'mask' | 'truncate';
  pattern?: string;
  replacement?: string;
  fields?: string[];
}

// Approval Request
export interface ApprovalRequest {
  id: string;
  workspaceId: string;
  policyRuleId: string;
  requesterId: string;
  type: ApprovalType;
  status: ApprovalStatus;
  title: string;
  description: string;
  context: ApprovalContext;
  approvers: ApprovalAssignment[];
  expiresAt: Date;
  decidedAt?: Date;
  decidedBy?: string;
  decisionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ApprovalType =
  | 'command_execution'
  | 'tool_invocation'
  | 'workflow_step'
  | 'data_access'
  | 'configuration_change';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export interface ApprovalContext {
  toolId?: string;
  commandId?: string;
  workflowRunId?: string;
  stepId?: string;
  inputs?: Record<string, unknown>;
  riskAssessment?: RiskAssessment;
  previousApprovals?: string[]; // IDs of related approvals
}

export interface RiskAssessment {
  level: RiskLevel;
  factors: RiskFactor[];
  score: number; // 0-100
  recommendation: 'approve' | 'review' | 'deny';
}

export interface RiskFactor {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  score: number;
}

export interface ApprovalAssignment {
  userId?: string;
  role?: string;
  assignedAt: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  response?: 'approved' | 'rejected';
  note?: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  organizationId: string;
  workspaceId?: string;
  userId?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  changes?: AuditChanges;
  metadata: AuditMetadata;
  createdAt: Date;
}

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'approve'
  | 'reject'
  | 'login'
  | 'logout'
  | 'export'
  | 'import';

export type ResourceType =
  | 'user'
  | 'organization'
  | 'workspace'
  | 'project'
  | 'persona'
  | 'conversation'
  | 'message'
  | 'command'
  | 'workflow'
  | 'workflow_run'
  | 'tool'
  | 'policy'
  | 'approval'
  | 'api_key'
  | 'file';

export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: Record<string, { old: unknown; new: unknown }>;
}

export interface AuditMetadata {
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  sessionId?: string;
  apiKeyId?: string;
  reason?: string;
  policyRuleId?: string;
}

// Policy Evaluation Result
export interface PolicyEvaluationResult {
  allowed: boolean;
  matchedPolicies: MatchedPolicy[];
  requiredApprovals: RequiredApproval[];
  transformations: Transformation[];
  auditRequired: boolean;
  denyReason?: string;
}

export interface MatchedPolicy {
  policyId: string;
  policyName: string;
  ruleId: string;
  ruleName: string;
  action: ActionType;
}

export interface RequiredApproval {
  policyRuleId: string;
  approvers: string[];
  timeout: number;
  context: string;
}
