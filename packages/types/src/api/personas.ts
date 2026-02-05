import { Persona, PersonaConfig, PersonaVersion, PersonaPreference, PersonaRecommendation, AutoPersonaResult, PersonaCategory } from '../domain/persona';

// List Personas
export interface PersonaListRequest {
  workspaceId?: string;
  category?: PersonaCategory;
  includeBuiltIn?: boolean;
  includeCustom?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PersonaListResponse {
  personas: PersonaSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface PersonaSummary {
  id: string;
  name: string;
  slug: string;
  category: PersonaCategory;
  description: string;
  avatarUrl?: string;
  isBuiltIn: boolean;
  version: number;
  totalUsages: number;
  successRate: number;
  avgRating: number;
}

// Get Persona
export interface PersonaDetailResponse {
  persona: Persona;
  versions: PersonaVersionSummary[];
  userPreference?: PersonaPreference;
}

export interface PersonaVersionSummary {
  id: string;
  version: number;
  changelog?: string;
  createdAt: Date;
}

// Create Persona
export interface CreatePersonaRequest {
  name: string;
  category: PersonaCategory;
  description: string;
  avatarUrl?: string;
  workspaceId?: string;
  config: PersonaConfigRequest;
}

export interface PersonaConfigRequest {
  mission: string;
  communicationStyle: string;
  verbosityLevel: string;
  decisionStyle: string;
  riskTolerance: string;
  outputFormat: string;
  expertiseTags: string[];
  toolPreferences: ToolPreferenceRequest[];
  constraints: string[];
  approvalDefaults: ApprovalDefaultsRequest;
  systemPromptTemplate?: string;
}

export interface ToolPreferenceRequest {
  toolId: string;
  priority: 'primary' | 'secondary' | 'fallback' | 'disabled';
}

export interface ApprovalDefaultsRequest {
  requireApprovalForTier: number;
  autoApproveCategories: string[];
  alwaysApproveCategories: string[];
}

export interface CreatePersonaResponse {
  persona: Persona;
}

// Update Persona
export interface UpdatePersonaRequest {
  name?: string;
  description?: string;
  avatarUrl?: string;
  config?: Partial<PersonaConfigRequest>;
  changelog?: string;
}

export interface UpdatePersonaResponse {
  persona: Persona;
  newVersion: number;
}

// Clone Persona
export interface ClonePersonaRequest {
  sourcePersonaId: string;
  name: string;
  workspaceId?: string;
}

export interface ClonePersonaResponse {
  persona: Persona;
}

// Import/Export
export interface ExportPersonaResponse {
  persona: PersonaExport;
}

export interface PersonaExport {
  version: string; // Export format version
  exportedAt: Date;
  persona: {
    name: string;
    category: PersonaCategory;
    description: string;
    config: PersonaConfig;
  };
}

export interface ImportPersonaRequest {
  data: PersonaExport;
  workspaceId?: string;
  overrideName?: string;
}

export interface ImportPersonaResponse {
  persona: Persona;
}

// Persona Preference
export interface SetPersonaPreferenceRequest {
  personaId: string;
  workspaceId?: string;
  isDefault: boolean;
  customOverrides?: Partial<PersonaConfigRequest>;
}

export interface PersonaPreferenceResponse {
  preference: PersonaPreference;
}

// Auto Persona
export interface AutoPersonaRequest {
  input: string;
  workspaceId?: string;
  context?: AutoPersonaContext;
}

export interface AutoPersonaContext {
  projectId?: string;
  conversationId?: string;
  previousPersonaId?: string;
  recentTasks?: string[];
}

export interface AutoPersonaResponse {
  result: AutoPersonaResult;
}

// Persona Compare
export interface PersonaCompareRequest {
  personaIds: string[];
  taskDescription?: string;
}

export interface PersonaCompareResponse {
  personas: PersonaComparisonItem[];
  recommendation?: PersonaRecommendation;
}

export interface PersonaComparisonItem {
  persona: PersonaSummary;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  score?: number;
}

// Persona Analytics
export interface PersonaAnalyticsRequest {
  personaId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PersonaAnalyticsResponse {
  personaId: string;
  period: { start: Date; end: Date };
  metrics: PersonaMetrics;
  usageByDay: DailyUsage[];
  taskTypeDistribution: TaskTypeCount[];
  toolUsage: ToolUsageCount[];
}

export interface PersonaMetrics {
  totalUsages: number;
  uniqueUsers: number;
  successRate: number;
  avgCompletionTime: number;
  avgRating: number;
  totalRatings: number;
}

export interface DailyUsage {
  date: string;
  usages: number;
  successRate: number;
}

export interface TaskTypeCount {
  taskType: string;
  count: number;
  percentage: number;
}

export interface ToolUsageCount {
  toolId: string;
  toolName: string;
  count: number;
  successRate: number;
}

// Version Management
export interface GetPersonaVersionRequest {
  personaId: string;
  version: number;
}

export interface RollbackPersonaRequest {
  personaId: string;
  targetVersion: number;
}

export interface RollbackPersonaResponse {
  persona: Persona;
  rolledBackFrom: number;
  rolledBackTo: number;
}
