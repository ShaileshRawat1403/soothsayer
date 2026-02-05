import { Organization, Workspace, WorkspaceMember, WorkspaceRole, WorkspaceSettings, Project, ProjectMember, ProjectRole, ProjectSettings } from '../domain/workspace';

// Organization
export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  logoUrl?: string;
  settings?: Partial<OrganizationSettingsRequest>;
}

export interface OrganizationSettingsRequest {
  allowSignup: boolean;
  defaultWorkspaceRole: WorkspaceRole;
  maxWorkspaces: number;
  enableAuditLogs: boolean;
  dataRetentionDays: number;
}

export interface OrganizationResponse {
  organization: Organization;
  memberCount: number;
  workspaceCount: number;
}

export interface OrganizationListResponse {
  organizations: OrganizationResponse[];
}

// Workspace
export interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  settings?: Partial<WorkspaceSettingsRequest>;
  isDefault?: boolean;
}

export interface WorkspaceSettingsRequest {
  defaultPersonaId?: string;
  enabledToolIds?: string[];
  maxConcurrentJobs?: number;
  retentionDays?: number;
}

export interface WorkspaceResponse {
  workspace: Workspace;
  memberCount: number;
  projectCount: number;
  currentUserRole: WorkspaceRole;
}

export interface WorkspaceListResponse {
  workspaces: WorkspaceResponse[];
  total: number;
}

export interface WorkspaceDetailResponse extends WorkspaceResponse {
  members: WorkspaceMemberResponse[];
  projects: ProjectSummary[];
  recentActivity: ActivityItem[];
}

export interface WorkspaceMemberResponse {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface AddWorkspaceMemberRequest {
  email: string;
  role: WorkspaceRole;
}

export interface UpdateWorkspaceMemberRequest {
  role: WorkspaceRole;
}

// Project
export interface CreateProjectRequest {
  name: string;
  slug?: string;
  description?: string;
  settings?: Partial<ProjectSettingsRequest>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  settings?: Partial<ProjectSettingsRequest>;
}

export interface ProjectSettingsRequest {
  language?: string;
  framework?: string;
  buildCommand?: string;
  testCommand?: string;
  allowedPaths?: string[];
  blockedPaths?: string[];
}

export interface ProjectResponse {
  project: Project;
  memberCount: number;
  currentUserRole: ProjectRole;
}

export interface ProjectListResponse {
  projects: ProjectResponse[];
  total: number;
}

export interface ProjectDetailResponse extends ProjectResponse {
  members: ProjectMemberResponse[];
  recentConversations: ConversationSummary[];
  recentWorkflowRuns: WorkflowRunSummary[];
}

export interface ProjectMemberResponse {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: ProjectRole;
  joinedAt: Date;
}

export interface AddProjectMemberRequest {
  email: string;
  role: ProjectRole;
}

export interface UpdateProjectMemberRequest {
  role: ProjectRole;
}

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  updatedAt: Date;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt?: Date;
}

export interface WorkflowRunSummary {
  id: string;
  workflowName: string;
  status: string;
  startedAt: Date;
  durationMs?: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  userId: string;
  userName: string;
  createdAt: Date;
}
