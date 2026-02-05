export interface Persona {
  id: string;
  name: string;
  slug: string;
  category: PersonaCategory;
  description: string;
  avatarUrl?: string;
  isBuiltIn: boolean;
  isActive: boolean;
  version: number;
  createdById?: string;
  workspaceId?: string; // null for global personas
  config: PersonaConfig;
  analytics: PersonaAnalytics;
  createdAt: Date;
  updatedAt: Date;
}

export type PersonaCategory =
  | 'developer'
  | 'business'
  | 'specialist'
  | 'custom';

export interface PersonaConfig {
  mission: string;
  communicationStyle: CommunicationStyle;
  verbosityLevel: VerbosityLevel;
  decisionStyle: DecisionStyle;
  riskTolerance: RiskTolerance;
  outputFormat: OutputFormat;
  expertiseTags: string[];
  toolPreferences: ToolPreference[];
  constraints: string[];
  approvalDefaults: ApprovalDefaults;
  systemPromptTemplate: string;
}

export type CommunicationStyle =
  | 'formal'
  | 'professional'
  | 'friendly'
  | 'casual'
  | 'technical'
  | 'educational';

export type VerbosityLevel =
  | 'minimal'
  | 'concise'
  | 'standard'
  | 'detailed'
  | 'comprehensive';

export type DecisionStyle =
  | 'cautious'
  | 'balanced'
  | 'proactive'
  | 'aggressive';

export type RiskTolerance =
  | 'very-low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very-high';

export type OutputFormat =
  | 'text'
  | 'markdown'
  | 'structured'
  | 'code'
  | 'hybrid';

export interface ToolPreference {
  toolId: string;
  priority: 'primary' | 'secondary' | 'fallback' | 'disabled';
  customConfig?: Record<string, unknown>;
}

export interface ApprovalDefaults {
  requireApprovalForTier: number; // 0-3
  autoApproveCategories: string[];
  alwaysApproveCategories: string[];
}

export interface PersonaAnalytics {
  totalUsages: number;
  successRate: number;
  avgCompletionTime: number;
  avgRating: number;
  ratingCount: number;
  lastUsedAt?: Date;
}

export interface PersonaVersion {
  id: string;
  personaId: string;
  version: number;
  config: PersonaConfig;
  changelog?: string;
  createdById: string;
  createdAt: Date;
}

export interface PersonaPreference {
  id: string;
  userId: string;
  personaId: string;
  workspaceId?: string;
  isDefault: boolean;
  customOverrides?: Partial<PersonaConfig>;
  createdAt: Date;
  updatedAt: Date;
}

// Auto-persona recommendation
export interface PersonaRecommendation {
  personaId: string;
  persona: Persona;
  confidence: number;
  reasoning: string;
  matchedIntents: string[];
}

export interface AutoPersonaResult {
  recommendations: PersonaRecommendation[];
  selectedPersonaId: string;
  taskClassification: TaskClassification;
}

export interface TaskClassification {
  domain: string;
  intents: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  riskLevel: 'low' | 'medium' | 'high';
  suggestedTier: number;
}
