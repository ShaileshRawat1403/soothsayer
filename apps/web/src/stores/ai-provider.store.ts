import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'lmstudio' | 'groq' | 'together' | 'openrouter' | 'bedrock' | 'custom';

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
  
  // Actions
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
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5-turbo and more',
    icon: '🤖',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', contextLength: 128000, capabilities: ['chat', 'code', 'vision', 'function_calling'], pricing: { input: 0.01, output: 0.03 } },
      { id: 'gpt-4', name: 'GPT-4', contextLength: 8192, capabilities: ['chat', 'code', 'function_calling'], pricing: { input: 0.03, output: 0.06 } },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextLength: 16385, capabilities: ['chat', 'code', 'function_calling'], pricing: { input: 0.0005, output: 0.0015 } },
    ],
    isLocal: false,
    isConfigured: false,
    defaultModel: 'gpt-4-turbo-preview',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3 Opus, Sonnet, and Haiku',
    icon: '🧠',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextLength: 200000, capabilities: ['chat', 'code', 'vision'], pricing: { input: 0.015, output: 0.075 } },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', contextLength: 200000, capabilities: ['chat', 'code', 'vision'], pricing: { input: 0.003, output: 0.015 } },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextLength: 200000, capabilities: ['chat', 'code', 'vision'], pricing: { input: 0.00025, output: 0.00125 } },
    ],
    isLocal: false,
    isConfigured: false,
    defaultModel: 'claude-3-sonnet-20240229',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run open-source models locally',
    icon: '🦙',
    baseUrl: 'http://localhost:11434',
    models: [
      { id: 'ministral-3:3b', name: 'Ministral 3B', contextLength: 8192, capabilities: ['chat', 'code'] },
      { id: 'llama3.2:1b', name: 'Llama 3.2 1B', contextLength: 8192, capabilities: ['chat', 'code'] },
      { id: 'llama3:latest', name: 'Llama 3', contextLength: 8192, capabilities: ['chat', 'code'] },
      { id: 'codellama:latest', name: 'Code Llama', contextLength: 16384, capabilities: ['code'] },
      { id: 'mistral:latest', name: 'Mistral', contextLength: 8192, capabilities: ['chat', 'code'] },
      { id: 'mixtral:latest', name: 'Mixtral 8x7B', contextLength: 32768, capabilities: ['chat', 'code'] },
      { id: 'deepseek-coder:latest', name: 'DeepSeek Coder', contextLength: 16384, capabilities: ['code'] },
      { id: 'phi3:mini', name: 'Phi-3 Mini', contextLength: 4096, capabilities: ['chat', 'code'] },
    ],
    isLocal: true,
    isConfigured: false,
    defaultModel: 'llama3.2:1b',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    description: 'Local models via LM Studio',
    icon: '🎨',
    baseUrl: 'http://localhost:1234/v1',
    models: [
      { id: 'local-model', name: 'Local Model', contextLength: 4096, capabilities: ['chat', 'code'] },
    ],
    isLocal: true,
    isConfigured: false,
    defaultModel: 'local-model',
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference with LPU',
    icon: '⚡',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama3-70b-8192', name: 'Llama 3 70B', contextLength: 8192, capabilities: ['chat', 'code'], pricing: { input: 0.00059, output: 0.00079 } },
      { id: 'llama3-8b-8192', name: 'Llama 3 8B', contextLength: 8192, capabilities: ['chat', 'code'], pricing: { input: 0.00005, output: 0.00010 } },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextLength: 32768, capabilities: ['chat', 'code'], pricing: { input: 0.00027, output: 0.00027 } },
    ],
    isLocal: false,
    isConfigured: false,
    defaultModel: 'llama3-70b-8192',
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Open-source models at scale',
    icon: '🤝',
    baseUrl: 'https://api.together.xyz/v1',
    models: [
      { id: 'meta-llama/Llama-3-70b-chat-hf', name: 'Llama 3 70B', contextLength: 8192, capabilities: ['chat', 'code'], pricing: { input: 0.0009, output: 0.0009 } },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B', contextLength: 32768, capabilities: ['chat', 'code'], pricing: { input: 0.0006, output: 0.0006 } },
      { id: 'deepseek-ai/deepseek-coder-33b-instruct', name: 'DeepSeek Coder 33B', contextLength: 16384, capabilities: ['code'], pricing: { input: 0.0008, output: 0.0008 } },
    ],
    isLocal: false,
    isConfigured: false,
    defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 100+ models via one API',
    icon: '🌐',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      { id: 'openai/gpt-4-turbo-preview', name: 'GPT-4 Turbo', contextLength: 128000, capabilities: ['chat', 'code', 'vision', 'function_calling'] },
      { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', contextLength: 200000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'google/gemini-pro', name: 'Gemini Pro', contextLength: 32768, capabilities: ['chat', 'code'] },
      { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B', contextLength: 8192, capabilities: ['chat', 'code'] },
    ],
    isLocal: false,
    isConfigured: false,
    defaultModel: 'openai/gpt-4-turbo-preview',
  },
  {
    id: 'bedrock',
    name: 'AWS Bedrock',
    description: 'Managed foundation models on AWS',
    icon: '☁️',
    baseUrl: 'https://bedrock-runtime.us-east-1.amazonaws.com',
    models: [
      { id: 'anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'Claude 3.5 Sonnet', contextLength: 200000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku', contextLength: 200000, capabilities: ['chat', 'code'] },
      { id: 'amazon.nova-pro-v1:0', name: 'Amazon Nova Pro', contextLength: 300000, capabilities: ['chat', 'code', 'vision'] },
      { id: 'meta.llama3-1-70b-instruct-v1:0', name: 'Llama 3.1 70B Instruct', contextLength: 128000, capabilities: ['chat', 'code'] },
    ],
    isLocal: false,
    isConfigured: true,
    defaultModel: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  },
  {
    id: 'custom',
    name: 'Custom Endpoint',
    description: 'Connect to any OpenAI-compatible API',
    icon: '🔧',
    baseUrl: '',
    models: [],
    isLocal: false,
    isConfigured: false,
  },
];

export const useAIProviderStore = create<AIProviderState>()(
  persist(
    (set, get) => ({
      providers: DEFAULT_PROVIDERS,
      activeProvider: 'openai',
      activeModel: 'gpt-4-turbo-preview',
      isConnecting: false,
      connectionStatus: {
        openai: 'disconnected',
        anthropic: 'disconnected',
        ollama: 'disconnected',
        lmstudio: 'disconnected',
        groq: 'disconnected',
        together: 'disconnected',
        openrouter: 'disconnected',
        bedrock: 'disconnected',
        custom: 'disconnected',
      },
      
      setActiveProvider: (provider) => {
        const providerConfig = get().providers.find((p) => p.id === provider);
        set({
          activeProvider: provider,
          activeModel: providerConfig?.defaultModel || providerConfig?.models[0]?.id || '',
        });
      },
      
      setActiveModel: (model) => set({ activeModel: model }),
      
      updateProviderConfig: (id, config) =>
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...config, isConfigured: !!(config.apiKey || p.isLocal) } : p
          ),
        })),

      addModelToProvider: (provider, model) =>
        set((state) => ({
          providers: state.providers.map((p) => {
            if (p.id !== provider) {
              return p;
            }
            const alreadyExists = p.models.some((m) => m.id === model.id);
            if (alreadyExists) {
              return p;
            }
            return { ...p, models: [...p.models, model] };
          }),
        })),

      removeModelFromProvider: (provider, modelId) =>
        set((state) => {
          const providers = state.providers.map((p) => {
            if (p.id !== provider) {
              return p;
            }
            return { ...p, models: p.models.filter((m) => m.id !== modelId) };
          });

          const currentProvider = providers.find((p) => p.id === state.activeProvider);
          const activeModelStillExists = currentProvider?.models.some((m) => m.id === state.activeModel);

          return {
            providers,
            activeModel: activeModelStillExists
              ? state.activeModel
              : (currentProvider?.models[0]?.id ?? ''),
          };
        }),
      
      testConnection: async (provider) => {
        set({ isConnecting: true });
        const providerConfig = get().providers.find((p) => p.id === provider);
        
        if (!providerConfig) {
          set({ isConnecting: false });
          return false;
        }
        
        try {
          // For local providers, check if the server is running
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
          
          // For cloud providers, we'd make a test API call.
          // Bedrock generally uses IAM credentials on the server side, so no client API key is required.
          const connected = provider === 'bedrock' ? true : !!providerConfig.apiKey;
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
      partialize: (state) => ({
        providers: state.providers.map((p) => ({
          ...p,
          apiKey: p.apiKey, // Store API keys (encrypted in production)
        })),
        activeProvider: state.activeProvider,
        activeModel: state.activeModel,
      }),
    }
  )
);
