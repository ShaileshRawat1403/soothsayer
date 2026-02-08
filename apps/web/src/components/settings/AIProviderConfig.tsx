import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  TestTube,
  Check,
  X,
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Cpu,
  Globe,
  Zap,
  Star,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Server,
  Cloud,
} from 'lucide-react';
import { useAIProviderStore, AIProvider, AIModel } from '../../stores/ai-provider.store';
import { toast } from './Toast';

interface ProviderConfigProps {
  onClose?: () => void;
}

const providerIcons: Record<AIProvider['id'], React.ReactNode> = {
  openai: <Globe className="w-5 h-5 text-green-400" />,
  anthropic: <Zap className="w-5 h-5 text-orange-400" />,
  ollama: <Server className="w-5 h-5 text-blue-400" />,
  'lm-studio': <Cpu className="w-5 h-5 text-purple-400" />,
  groq: <Zap className="w-5 h-5 text-yellow-400" />,
  together: <Cloud className="w-5 h-5 text-cyan-400" />,
  openrouter: <Globe className="w-5 h-5 text-pink-400" />,
  custom: <Settings className="w-5 h-5 text-gray-400" />,
};

const providerDescriptions: Record<AIProvider['id'], string> = {
  openai: 'Industry-leading models including GPT-4 Turbo. Best for general tasks and coding.',
  anthropic: 'Claude models with excellent reasoning. Best for analysis and writing.',
  ollama: 'Run open-source models locally. Free and private.',
  'lm-studio': 'User-friendly local model hosting with OpenAI-compatible API.',
  groq: 'Ultra-fast inference for Llama and Mixtral models.',
  together: 'High-performance cloud for open-source models.',
  openrouter: 'Access 100+ models through a single API.',
  custom: 'Connect to any OpenAI-compatible endpoint.',
};

export const AIProviderConfig: React.FC<ProviderConfigProps> = ({ onClose }) => {
  const {
    providers,
    activeProvider,
    selectedModelId,
    setActiveProvider,
    setSelectedModel,
    updateProviderConfig,
    testConnection,
    refreshModels,
    addCustomProvider,
    removeProvider,
  } = useAIProviderStore();

  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set([activeProvider || '']));
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [refreshingProvider, setRefreshingProvider] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Set<string>>(new Set());
  const [customEndpoint, setCustomEndpoint] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
  });

  // Group providers by type
  const cloudProviders = providers.filter(p => ['openai', 'anthropic', 'groq', 'together', 'openrouter'].includes(p.id));
  const localProviders = providers.filter(p => ['ollama', 'lm-studio'].includes(p.id));
  const customProviders = providers.filter(p => p.id.startsWith('custom-'));

  const toggleExpanded = (providerId: string) => {
    const newExpanded = new Set(expandedProviders);
    if (newExpanded.has(providerId)) {
      newExpanded.delete(providerId);
    } else {
      newExpanded.add(providerId);
    }
    setExpandedProviders(newExpanded);
  };

  const toggleShowApiKey = (providerId: string) => {
    const newShow = new Set(showApiKeys);
    if (newShow.has(providerId)) {
      newShow.delete(providerId);
    } else {
      newShow.add(providerId);
    }
    setShowApiKeys(newShow);
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const success = await testConnection(providerId);
      if (success) {
        toast.success(`${providerId} connection successful!`);
      } else {
        toast.error(`${providerId} connection failed`, 'Check your API key and endpoint');
      }
    } catch (error) {
      toast.error(`${providerId} connection failed`, (error as Error).message);
    }
    setTestingProvider(null);
  };

  const handleRefreshModels = async (providerId: string) => {
    setRefreshingProvider(providerId);
    try {
      await refreshModels(providerId);
      toast.success('Models refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh models', (error as Error).message);
    }
    setRefreshingProvider(null);
  };

  const handleAddCustomEndpoint = () => {
    if (!customEndpoint.name || !customEndpoint.baseUrl) {
      toast.warning('Please fill in name and base URL');
      return;
    }
    
    addCustomProvider(customEndpoint.name, customEndpoint.baseUrl, customEndpoint.apiKey);
    toast.success(`Added ${customEndpoint.name} endpoint`);
    setCustomEndpoint({ name: '', baseUrl: '', apiKey: '' });
  };

  const renderProviderCard = (provider: AIProvider) => {
    const isExpanded = expandedProviders.has(provider.id);
    const isActive = activeProvider === provider.id;
    const isTesting = testingProvider === provider.id;
    const isRefreshing = refreshingProvider === provider.id;
    const showKey = showApiKeys.has(provider.id);

    return (
      <motion.div
        key={provider.id}
        layout
        className={`rounded-xl border overflow-hidden transition-all ${
          isActive
            ? 'border-blue-500/50 bg-blue-500/5'
            : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
        }`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => toggleExpanded(provider.id)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-500/20' : 'bg-gray-700/50'}`}>
              {providerIcons[provider.id] || providerIcons.custom}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-white">{provider.name}</h3>
                {isActive && (
                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                    Active
                  </span>
                )}
                {provider.isLocal && (
                  <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                    Local
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {provider.models.length} models available
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {provider.connected ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : provider.apiKey || provider.isLocal ? (
              <AlertCircle className="w-4 h-4 text-yellow-400" />
            ) : null}
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-700"
            >
              <div className="p-4 space-y-4">
                {/* Description */}
                <p className="text-sm text-gray-400">
                  {providerDescriptions[provider.id] || 'Custom AI provider endpoint'}
                </p>

                {/* API Key Input (for non-local providers) */}
                {!provider.isLocal && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={provider.apiKey || ''}
                        onChange={(e) => updateProviderConfig(provider.id, { apiKey: e.target.value })}
                        placeholder={`Enter your ${provider.name} API key`}
                        className="w-full px-3 py-2 pr-20 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowApiKey(provider.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Base URL Input (for local/custom providers) */}
                {(provider.isLocal || provider.id.startsWith('custom')) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={provider.baseUrl || ''}
                      onChange={(e) => updateProviderConfig(provider.id, { baseUrl: e.target.value })}
                      placeholder={provider.id === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}

                {/* Model Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-400">Model</label>
                    <button
                      onClick={() => handleRefreshModels(provider.id)}
                      disabled={isRefreshing}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                  <select
                    value={isActive ? selectedModelId : provider.models[0]?.id || ''}
                    onChange={(e) => {
                      setActiveProvider(provider.id);
                      setSelectedModel(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    {provider.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} {model.contextWindow ? `(${Math.round(model.contextWindow / 1000)}K)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleTestConnection(provider.id)}
                    disabled={isTesting}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    {isTesting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4" />
                    )}
                    Test Connection
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveProvider(provider.id);
                      toast.success(`Switched to ${provider.name}`);
                    }}
                    disabled={isActive}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-400 cursor-default'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isActive ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    {isActive ? 'Active' : 'Use Provider'}
                  </button>

                  {provider.id.startsWith('custom-') && (
                    <button
                      onClick={() => {
                        removeProvider(provider.id);
                        toast.info(`Removed ${provider.name}`);
                      }}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* External Link */}
                {provider.id !== 'custom' && !provider.id.startsWith('custom-') && (
                  <a
                    href={getProviderDocsUrl(provider.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View documentation
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const getProviderDocsUrl = (providerId: string): string => {
    const urls: Record<string, string> = {
      openai: 'https://platform.openai.com/docs',
      anthropic: 'https://docs.anthropic.com',
      ollama: 'https://ollama.ai/library',
      'lm-studio': 'https://lmstudio.ai/docs',
      groq: 'https://console.groq.com/docs',
      together: 'https://docs.together.ai',
      openrouter: 'https://openrouter.ai/docs',
    };
    return urls[providerId] || '#';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">AI Providers</h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure AI models for chat, code explanation, and analysis
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Cloud Providers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Cloud className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-gray-300">Cloud Providers</h3>
        </div>
        <div className="space-y-3">
          {cloudProviders.map(renderProviderCard)}
        </div>
      </div>

      {/* Local Providers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-medium text-gray-300">Local Models (Privacy-First)</h3>
        </div>
        <div className="space-y-3">
          {localProviders.map(renderProviderCard)}
        </div>
      </div>

      {/* Custom Providers */}
      {customProviders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-medium text-gray-300">Custom Endpoints</h3>
          </div>
          <div className="space-y-3">
            {customProviders.map(renderProviderCard)}
          </div>
        </div>
      )}

      {/* Add Custom Endpoint */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/30 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-300">Add Custom Endpoint</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={customEndpoint.name}
            onChange={(e) => setCustomEndpoint({ ...customEndpoint, name: e.target.value })}
            placeholder="Provider Name"
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-blue-500 outline-none"
          />
          <input
            type="text"
            value={customEndpoint.baseUrl}
            onChange={(e) => setCustomEndpoint({ ...customEndpoint, baseUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-blue-500 outline-none"
          />
          <input
            type="password"
            value={customEndpoint.apiKey}
            onChange={(e) => setCustomEndpoint({ ...customEndpoint, apiKey: e.target.value })}
            placeholder="API Key (optional)"
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-blue-500 outline-none"
          />
        </div>
        
        <button
          onClick={handleAddCustomEndpoint}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Endpoint
        </button>
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/20 p-4">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-white mb-2">Tips for Local Models</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• <strong>Ollama:</strong> Run <code className="px-1 py-0.5 bg-gray-700 rounded">ollama serve</code> then <code className="px-1 py-0.5 bg-gray-700 rounded">ollama pull llama3</code></li>
              <li>• <strong>LM Studio:</strong> Enable "Local Server" in settings, default port 1234</li>
              <li>• Local models keep your data private - nothing sent to cloud</li>
              <li>• Recommended: 16GB+ RAM for 7B models, 32GB+ for 13B models</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIProviderConfig;
