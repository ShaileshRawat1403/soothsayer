export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  bio?: string;
  timezone?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: ThemePreference;
  language: string;
  notifications: NotificationPreferences;
  defaultPersonaId?: string;
  defaultWorkspaceId?: string;
}

export type ThemePreference = 
  | 'light' 
  | 'dark' 
  | 'midnight' 
  | 'forest' 
  | 'ocean' 
  | 'sunset'
  | 'system';

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  approvalRequests: boolean;
  workflowCompletions: boolean;
  mentions: boolean;
}

export type UserRole = 'owner' | 'admin' | 'member';

export interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: UserRole;
  user?: User;
  joinedAt: Date;
}
