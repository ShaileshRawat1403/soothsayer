import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'dax' | 'openai' | 'ollama' | 'groq' | 'bedrock' | 'custom';

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  icon: string;
  baseUrl: string;
  apiKey?: string;
  models: AIModel[];
  isLocal: boolean;
  isConfigured: boolean;
  defaultModel?: string;
}

export interface AIModel {
  id: string;
  name: string;
  description?: string;
  contextLength: number;
  capabilities: ('chat' | 'code' | 'vision' | 'function_calling')[];
  pricing?: {
    input: number;
    output: number;
  };
}

interface AIProviderState {
  providers: AIProviderConfig[];
  activeProvider: AIProvider;
  activeModel: string;
  isConnecting: boolean;
  connectionStatus: Record<AIProvider, 'connected' | 'disconnected' | 'error'>;
  setActiveProvider: (provider: AIProvider) => void;
  setActiveModel: (model: string) => void;
  updateProviderConfig: (id: AIProvider, config: Partial<AIProviderConfig>) => void;
  addModelToProvider: (provider: AIProvider, model: AIModel) => void;
  removeModelFromProvider: (provider: AIProvider, modelId: string) => void;
  testConnection: (provider: AIProvider) => Promise<boolean>;
  setConnectionStatus: (provider: AIProvider, status: 'connected' | 'disconnected' | 'error') => void;
}

const DEFAULT_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'dax',
    name: 'DAX Assistant',
    description: 'Primary governed assistant path. Keeps chat in DAX first and escalates to live runs when execution is needed.',
    icon: 'bot',
    baseUrl: '/api/dax',
    models: [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Default DAX-backed authority path aligned with Picobot.',
        contextLength: 1048576,
        capabilities: ['chat', 'code', 'vision', 'function_calling'],
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Faster DAX fallback for lighter conversations.',
        contextLength: 1048576,
        capabilities: ['chat', 'code', 'vision', 'function_calling'],
      },
    ],
    isLocal: false,
    isConfigured: true,
    defaultModel: 'gemini-2.5-pro',
  },
  {
    id: 'openai',
    name: 'OpenAI Fallback',
    description: 'Advanced override for direct API usage when you intentionally bypass the DAX-first path.',
    icon: 'globe',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextLength: 128000,
        capabilities: ['chat', 'code', 'vision', 'function_calling'],
        pricing: { input: 0.00015, output: 0.0006 },
      },
      {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        contextLength: 128000,
        capabilities: ['chat', 'code', 'vision', 'function_calling'],
      },
    ],
    isLocal: false,
    isConfigured: false,
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'ollama',
    name: 'Ollama Fallback',
    description: 'Advanced local fallback for private or offline inference outside the DAX authority path.',
    icon: 'server',
    baseUrl: 'http://localhost:11434',
    models: [
      { id: 'ministral-3:3b', name: 'Ministral 3B', contextLength: 8192, capabilities: ['chat', 'code'] },
      { id: 'llama3.2:1b', name: 'Llama 3.2 1B', contextLength: 8192, capabilities: ['chat', 'code'] },
      { id: 'phi3:mini', name: 'Phi-3 Mini', contextLength: 4096, capabilities: ['chat', 'code'] },
    ],
    isLocal: true,
    isConfigured: false,
    defaultModel: 'llama3.2:1b',
  },
  {
    id: 'groq',
    name: 'Groq Fallback',
    description: 'Advanced direct fallback for fast low-latency responses when DAX is intentionally overridden.',
    icon: 'zap',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      {
        id: 'llama3-70b-8192',
        name: 'Llama 3 70B',
        contextLength: 8192,
        capabilities: ['chat', 'code'],
        pricing: { input: 0.00059, output: 0.00079 },
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        contextLength: 32768,
        capabilities: ['chat', 'code'],
        pricing: { input: 0.00027, output: 0.00027 },
      },
    ],
    isLocal: false,
    isConfigured: false,
    defaultModel: 'llama3-70b-8192',
  },
  {
    id: 'bedrock',
    name: 'Bedrock Fallback',
    description: 'Advanced server-side AWS fallback for teams that want managed model access outside DAX primary mode.',
    icon: 'cloud',
    baseUrl: 'https://bedrock-runtime.us-east-1.amazonaws.com',
    models: [
      {
        id: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        name: 'Claude 3.5 Sonnet',
        contextLength: 200000,
        capabilities: ['chat', 'code', 'vision'],
      },
      {
        id: 'amazon.nova-pro-v1:0',
        name: 'Amazon Nova Pro',
        contextLength: 300000,
        capabilities: ['chat', 'code', 'vision'],
      },
    ],
    isLocal: false,
    isConfigured: true,
    defaultModel: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  },
  {
    id: 'custom',
    name: 'Custom Fallback',
    description: 'Manual override for an OpenAI-compatible endpoint when you need a non-standard direct provider.',
    icon: 'settings',
    baseUrl: '',
    models: [],
    isLocal: false,
    isConfigured: false,
  },
];

const DEFAULT_CONNECTION_STATUS: Record<AIProvider, 'connected' | 'disconnected' | 'error'> = {
  dax: 'connected',
  openai: 'disconnected',
  ollama: 'disconnected',
  groq: 'disconnected',
  bedrock: 'disconnected',
  custom: 'disconnected',
};

function mergeProviders(persistedProviders?: unknown): AIProviderConfig[] {
  const persistedMap = new Map<AIProvider, Partial<AIProviderConfig>>();

  if (Array.isArray(persistedProviders)) {
    for (const candidate of persistedProviders) {
      if (!candidate || typeof candidate !== 'object') {
        continue;
      }

      const config = candidate as Partial<AIProviderConfig>;
      const id = config.id;
      if (!id) {
        continue;
      }

      const supported = DEFAULT_PROVIDERS.find((provider) => provider.id === id);
      if (supported) {
        persistedMap.set(id, config);
      }
    }
  }

  return DEFAULT_PROVIDERS.map((provider) => {
    const persisted = persistedMap.get(provider.id);
    if (!persisted) {
      return provider;
    }

    return {
      ...provider,
      apiKey: persisted.apiKey,
      baseUrl: typeof persisted.baseUrl === 'string' && persisted.baseUrl.trim()
        ? persisted.baseUrl
        : provider.baseUrl,
    };
  });
}

function getProviderConfig(providers: AIProviderConfig[], provider: AIProvider) {
  return providers.find((entry) => entry.id === provider);
}

export const useAIProviderStore = create<AIProviderState>()(
  persist(
    (set, get) => ({
      providers: DEFAULT_PROVIDERS,
      activeProvider: 'dax',
      activeModel: 'gemini-2.5-pro',
      isConnecting: false,
      connectionStatus: DEFAULT_CONNECTION_STATUS,

      setActiveProvider: (provider) => {
        const providerConfig = getProviderConfig(get().providers, provider);
        set({
          activeProvider: provider,
          activeModel: providerConfig?.defaultModel || providerConfig?.models?.[0]?.id || '',
        });
      },

      setActiveModel: (model) => set({ activeModel: model }),

      updateProviderConfig: (id, config) =>
        set((state) => ({
          providers: state.providers.map((provider) =>
            provider.id === id
              ? {
                  ...provider,
                  ...config,
                  isConfigured:
                    provider.id === 'dax' ||
                    provider.id === 'bedrock' ||
                    !!(config.apiKey || provider.apiKey || provider.isLocal),
                }
              : provider,
          ),
        })),

      addModelToProvider: (provider, model) =>
        set((state) => ({
          providers: state.providers.map((entry) => {
            if (entry.id !== provider) {
              return entry;
            }

            const alreadyExists = entry.models.some((candidate) => candidate.id === model.id);
            if (alreadyExists) {
              return entry;
            }

            return { ...entry, models: [...entry.models, model] };
          }),
        })),

      removeModelFromProvider: (provider, modelId) =>
        set((state) => {
          const providers = state.providers.map((entry) => {
            if (entry.id !== provider) {
              return entry;
            }

            return { ...entry, models: entry.models.filter((model) => model.id !== modelId) };
          });

          const currentProvider = getProviderConfig(providers, state.activeProvider);
          const activeModelStillExists = currentProvider?.models.some(
            (model) => model.id === state.activeModel,
          );

          return {
            providers,
            activeModel: activeModelStillExists
              ? state.activeModel
              : (currentProvider?.defaultModel || currentProvider?.models?.[0]?.id || ''),
          };
        }),

      testConnection: async (provider) => {
        set({ isConnecting: true });
        const providerConfig = getProviderConfig(get().providers, provider);

        if (!providerConfig) {
          set({ isConnecting: false });
          return false;
        }

        try {
          if (provider === 'dax' || provider === 'bedrock') {
            get().setConnectionStatus(provider, 'connected');
            set({ isConnecting: false });
            return true;
          }

          if (providerConfig.isLocal) {
            const response = await fetch(`${providerConfig.baseUrl}/api/tags`, {
              method: 'GET',
              signal: AbortSignal.timeout(5000),
            }).catch(() => null);

            const connected = response?.ok || false;
            get().setConnectionStatus(provider, connected ? 'connected' : 'error');
            set({ isConnecting: false });
            return connected;
          }

          const connected = !!providerConfig.apiKey;
          get().setConnectionStatus(provider, connected ? 'connected' : 'disconnected');
          set({ isConnecting: false });
          return connected;
        } catch {
          get().setConnectionStatus(provider, 'error');
          set({ isConnecting: false });
          return false;
        }
      },

      setConnectionStatus: (provider, status) =>
        set((state) => ({
          connectionStatus: { ...state.connectionStatus, [provider]: status },
        })),
    }),
    {
      name: 'soothsayer-ai-providers',
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState as Partial<AIProviderState> | undefined) || {};
        const providers = mergeProviders(state.providers);
        const activeProvider = DEFAULT_PROVIDERS.some(
          (provider) => provider.id === state.activeProvider,
        )
          ? (state.activeProvider as AIProvider)
          : 'dax';
        const activeProviderConfig = getProviderConfig(providers, activeProvider);
        const activeModel =
          typeof state.activeModel === 'string' &&
          activeProviderConfig?.models?.some((model) => model.id === state.activeModel)
            ? state.activeModel
            : (activeProviderConfig?.defaultModel || activeProviderConfig?.models?.[0]?.id || '');

        return {
          providers: providers.map((provider) => ({
            id: provider.id,
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl,
          })),
          activeProvider,
          activeModel,
        };
      },
      merge: (persistedState, currentState) => {
        const current = currentState as AIProviderState;
        const persisted = (persistedState as Partial<AIProviderState> | undefined) || {};

        const providers = mergeProviders(persisted.providers);
        const activeProvider = DEFAULT_PROVIDERS.some(
          (provider) => provider.id === persisted.activeProvider,
        )
          ? (persisted.activeProvider as AIProvider)
          : current.activeProvider;
        const activeProviderConfig = getProviderConfig(providers, activeProvider);
        const activeModel =
          typeof persisted.activeModel === 'string' &&
          activeProviderConfig?.models?.some((model) => model.id === persisted.activeModel)
            ? persisted.activeModel
            : (activeProviderConfig?.defaultModel || activeProviderConfig?.models?.[0]?.id || '');

        return {
          ...current,
          providers,
          activeProvider,
          activeModel,
        };
      },
      partialize: (state) => ({
        providers: state.providers.map((provider) => ({
          id: provider.id,
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl,
        })),
        activeProvider: state.activeProvider,
        activeModel: state.activeModel,
      }),
    },
  ),
);
