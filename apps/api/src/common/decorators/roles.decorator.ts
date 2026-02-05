import { SetMetadata } from '@nestjs/common';

export interface RequiredRoles {
  organization?: string[];
  workspace?: string[];
  project?: string[];
}

export const ROLES_KEY = 'roles';
export const Roles = (roles: RequiredRoles) => SetMetadata(ROLES_KEY, roles);

// Convenience decorators
export const OrgOwner = () => Roles({ organization: ['owner'] });
export const OrgAdmin = () => Roles({ organization: ['owner', 'admin'] });
export const OrgMember = () => Roles({ organization: ['owner', 'admin', 'member'] });

export const WorkspaceAdmin = () => Roles({ workspace: ['admin'] });
export const WorkspaceEditor = () => Roles({ workspace: ['admin', 'editor'] });
export const WorkspaceOperator = () => Roles({ workspace: ['admin', 'editor', 'operator'] });
export const WorkspaceViewer = () => Roles({ workspace: ['admin', 'editor', 'operator', 'viewer'] });

export const ProjectOwner = () => Roles({ project: ['owner'] });
export const ProjectContributor = () => Roles({ project: ['owner', 'contributor'] });
export const ProjectViewer = () => Roles({ project: ['owner', 'contributor', 'viewer'] });
