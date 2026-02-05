import { User, UserPreferences } from '../domain/user';

// Login
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Register
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Refresh Token
export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Password Reset
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

// Email Verification
export interface VerifyEmailRequest {
  token: string;
}

// Profile Update
export interface UpdateProfileRequest {
  name?: string;
  avatarUrl?: string;
  bio?: string;
  timezone?: string;
}

// Preferences Update
export interface UpdatePreferencesRequest {
  theme?: string;
  language?: string;
  notifications?: Partial<NotificationPreferencesRequest>;
  defaultPersonaId?: string;
  defaultWorkspaceId?: string;
}

export interface NotificationPreferencesRequest {
  email: boolean;
  inApp: boolean;
  approvalRequests: boolean;
  workflowCompletions: boolean;
  mentions: boolean;
}

// Password Change
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Session
export interface Session {
  id: string;
  userId: string;
  userAgent: string;
  ipAddress: string;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export interface SessionListResponse {
  sessions: Session[];
}

// API Key
export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface CreateApiKeyRequest {
  name: string;
  expiresAt?: Date;
  permissions?: string[];
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  key: string; // Only returned on creation
}

export interface ApiKeyListResponse {
  apiKeys: ApiKey[];
}

// Current User Response
export interface CurrentUserResponse {
  user: User;
  preferences: UserPreferences;
  organizations: OrganizationMembership[];
  activeWorkspace?: WorkspaceSummary;
}

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: string;
}
