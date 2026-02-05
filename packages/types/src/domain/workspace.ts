import { User } from './user';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  allowSignup: boolean;
  defaultWorkspaceRole: WorkspaceRole;
  maxWorkspaces: number;
  enableAuditLogs: boolean;
  dataRetentionDays: number;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  settings: WorkspaceSettings;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceSettings {
  defaultPersonaId?: string;
  enabledToolIds: string[];
  maxConcurrentJobs: number;
  retentionDays: number;
  policyOverrides: Record<string, unknown>;
}

export type WorkspaceRole = 'admin' | 'editor' | 'operator' | 'viewer';

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  user?: User;
  joinedAt: Date;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  settings: ProjectSettings;
  rootPath?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ProjectSettings {
  language?: string;
  framework?: string;
  buildCommand?: string;
  testCommand?: string;
  allowedPaths: string[];
  blockedPaths: string[];
}

export type ProjectRole = 'owner' | 'contributor' | 'viewer';

export interface ProjectMember {
  userId: string;
  projectId: string;
  role: ProjectRole;
  user?: User;
  joinedAt: Date;
}
