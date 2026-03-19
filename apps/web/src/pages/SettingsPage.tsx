import { useState, useMemo, useEffect } from 'react';
import { 
  Cloud, 
  Laptop, 
  Server, 
  Bot, 
  Cpu, 
  Zap, 
  Globe, 
  Webhook, 
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Github,
  MessageSquare,
  ClipboardList,
  Layout,
  FileText,
  Gamepad2,
  HardDrive,
  ChevronRight,
  Monitor,
  Moon,
  Sun,
  Palette,
  ShieldCheck,
  Activity,
  History,
  Lock,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useAIProviderStore, type AIProvider } from '@/stores/ai-provider.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useTheme } from '@/components/common/ThemeProvider';
import { apiHelpers } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap: Record<string, React.ReactNode> = {
  bot: <Bot className="h-8 w-8" />,
  cpu: <Cpu className="h-8 w-8" />,
  server: <Server className="h-8 w-8" />,
  laptop: <Laptop className="h-8 w-8" />,
  zap: <Zap className="h-8 w-8" />,
  globe: <Globe className="h-8 w-8" />,
  webhook: <Webhook className="h-8 w-8" />,
  cloud: <Cloud className="h-8 w-8" />,
  settings: <SettingsIcon className="h-8 w-8" />,
};

type IntegrationKey = 'github' | 'slack' | 'google_drive' | 'jira' | 'notion' | 'linear' | 'discord';

interface SettingsTab {
  id: 'profile' | 'appearance' | 'notifications' | 'ai-providers' | 'integrations' | 'governance';
  label: string;
  icon: any;
  badge?: string;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'ai-providers' | 'integrations' | 'governance'>('ai-providers');
  const { user, updateUser } = useAuthStore();
  const { 
    providers, 
    activeProvider, 
    connectionStatus, 
    updateProviderConfig, 
    addModelToProvider, 
    removeModelFromProvider,
    testConnection,
    setActiveProvider
  } = useAIProviderStore();
  const { currentWorkspace, updateWorkspace } = useWorkspaceStore();
  const { theme, setTheme } = useTheme();

  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [newModelByProvider, setNewModelByProvider] = useState<Record<string, { id: string; name: string; contextLength: string }>>({});
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [testingIntegration, setTestingIntegration] = useState<IntegrationKey | null>(null);
  const [savingManualFor, setSavingManualFor] = useState<IntegrationKey | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [governanceForm, setGovernanceForm] = useState({
    defaultProvider: (currentWorkspace?.settings as any)?.defaultProvider || 'openai',
    defaultModel: (currentWorkspace?.settings as any)?.defaultModel || 'gpt-4-turbo-preview',
  });

  const [integrationStatus, setIntegrationStatus] = useState<Record<string, { connected: boolean; configured: boolean; message: string; accountName?: string }>>({});
  const [manualTokenByIntegration, setManualTokenByIntegration] = useState<Record<string, string>>({});
  const [manualAccountByIntegration, setManualAccountByIntegration] = useState<Record<string, string>>({});
  const [manualCloudIdByIntegration, setManualCloudIdByIntegration] = useState<Record<string, string>>({});

  const oauthIntegrations = new Set<IntegrationKey>(['github', 'slack', 'jira', 'notion', 'linear', 'discord', 'google_drive']);
  const [oauthReadiness, setOauthReadiness] = useState<Record<string, { ready: boolean; missing: string[] }>>({});

  const tabs: SettingsTab[] = [
    { id: 'ai-providers', label: 'AI Engines', icon: Cpu },
    { id: 'governance', label: 'Governance', icon: ShieldCheck, badge: 'V2' },
    { id: 'integrations', label: 'Integrations', icon: Webhook },
    { id: 'profile', label: 'Identity', icon: Lock },
    { id: 'appearance', label: 'Interface', icon: Palette },
    { id: 'notifications', label: 'Signals', icon: Activity },
  ];

  const testIntegration = async (name: IntegrationKey) => {
    setTestingIntegration(name);
    try {
      const response = await apiHelpers.testIntegration(name, currentWorkspace?.id);
      setIntegrationStatus((prev) => ({
        ...prev,
        [name]: response.data as any,
      }));
      if (response.data.connected) {
        toast.success(`${name} connection verified`);
      }
    } catch (error) {
      console.error(`Failed to test integration ${name}`, error);
    } finally {
      setTestingIntegration(null);
    }
  };

  const handleSaveProfile = () => {
    updateUser({ name: profileForm.name });
    toast.success('Profile updated successfully');
  };

  const handleSaveGovernance = async () => {
    if (!currentWorkspace?.id) return;
    
    setIsUpdatingSettings(true);
    try {
      const currentSettings = currentWorkspace.settings || {};
      const newSettings = {
        ...currentSettings,
        defaultProvider: governanceForm.defaultProvider || undefined,
        defaultModel: governanceForm.defaultModel || undefined,
      };
      
      await apiHelpers.updateWorkspace(currentWorkspace.id, {
        settings: newSettings,
      } as any);
      
      updateWorkspace(currentWorkspace.id, { settings: newSettings } as any);
      toast.success('Workspace governance settings updated');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update governance settings';
      toast.error(msg);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleTestConnection = async (providerId: AIProvider) => {
    const result = await testConnection(providerId);
    if (result) {
      toast.success(`Connected to ${providers.find(p => p.id === providerId)?.name}`);
    } else {
      toast.error('Connection failed. Please check your configuration.');
    }
  };

  const handleAddModel = (providerId: AIProvider) => {
    const entry = newModelByProvider[providerId] || { id: '', name: '', contextLength: '8192' };
    const modelId = entry.id.trim();
    const modelName = entry.name.trim();
    const contextLength = Number.parseInt(entry.contextLength, 10);

    if (!modelId || !modelName) {
      toast.error('Model ID and Model Name are required');
      return;
    }
    if (!Number.isFinite(contextLength) || contextLength <= 0) {
      toast.error('Context length must be a positive number');
      return;
    }

    addModelToProvider(providerId, {
      id: modelId,
      name: modelName,
      contextLength,
      capabilities: ['chat', 'code'],
    });

    setNewModelByProvider((prev) => ({
      ...prev,
      [providerId]: { id: '', name: '', contextLength: '8192' },
    }));
    toast.success(`Added model "${modelName}"`);
  };

  return (
    <div className="flex h-full bg-background">
      <div className="w-72 border-r border-border bg-card/30 backdrop-blur-xl shrink-0">
        <div className="p-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">System Config</h2>
        </div>
        <nav className="space-y-1 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'group flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all duration-300 active:scale-95',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20 translate-x-1'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <tab.icon className={cn("h-4.5 w-4.5 transition-transform group-hover:scale-110", activeTab === tab.id && "text-primary-foreground")} />
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.badge && (
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto bg-muted/[0.01]">
        <div className="p-16 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'ai-providers' && (
              <motion.div 
                key="ai-providers"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="space-y-2">
                  <h3 className="text-4xl font-bold tracking-tight">AI Engines</h3>
                  <p className="text-base font-medium text-muted-foreground leading-relaxed max-w-2xl">
                    Provision and manage the inference infrastructure that powers Soothsayer's execution and reasoning layers.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  <div className="card-professional p-8 flex flex-col items-center text-center gap-5 bg-blue-500/[0.02] border-blue-500/10 hover:bg-blue-500/[0.04] transition-colors cursor-default">
                    <div className="h-14 w-14 rounded-[1.5rem] bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-sm border border-blue-500/10">
                      <Cloud className="h-7 w-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold">Cloud Nodes</h4>
                      <p className="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-[0.2em]">Enterprise Authority</p>
                    </div>
                  </div>
                  <div className="card-professional p-8 flex flex-col items-center text-center gap-5 bg-emerald-500/[0.02] border-emerald-500/10 hover:bg-emerald-500/[0.04] transition-colors cursor-default">
                    <div className="h-14 w-14 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-500/10">
                      <Laptop className="h-7 w-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold">Local Runtime</h4>
                      <p className="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-[0.2em]">Sovereign Context</p>
                    </div>
                  </div>
                  <div className="card-professional p-8 flex flex-col items-center text-center gap-5 bg-orange-500/[0.02] border-orange-500/10 hover:bg-orange-500/[0.04] transition-colors cursor-default">
                    <div className="h-14 w-14 rounded-[1.5rem] bg-orange-500/10 flex items-center justify-center text-orange-600 shadow-sm border border-orange-500/10">
                      <Server className="h-7 w-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold">Inference Sync</h4>
                      <p className="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-[0.2em]">Custom Protocol</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {providers.map((provider) => {
                    const status = connectionStatus[provider.id];
                    const isActive = activeProvider === provider.id;
                    const icon = iconMap[provider.icon] || <Bot className="h-8 w-8" />;
                    
                    return (
                      <div
                        key={provider.id}
                        className={cn(
                          'card-professional overflow-hidden transition-all duration-500 group',
                          isActive ? 'border-primary shadow-apple-lg ring-1 ring-primary/10' : 'border-border bg-muted/[0.01] hover:border-primary/20'
                        )}
                      >
                        <div className="flex items-start gap-10 p-10">
                          <div className={cn(
                            "flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-[2rem] shadow-sm border border-border/50 transition-all duration-500 group-hover:scale-105 group-hover:rotate-3",
                            isActive ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-secondary text-primary group-hover:bg-primary/5"
                          )}>
                            {icon}
                          </div>
                          
                          <div className="flex-1 space-y-8 min-w-0">
                            <div className="flex items-center gap-4">
                              <h4 className="font-bold text-2xl tracking-tight">{provider.name}</h4>
                              <div className="flex gap-2">
                                {provider.isLocal && (
                                  <span className="rounded-full bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                                    Local Engine
                                  </span>
                                )}
                                {isActive && (
                                  <span className="rounded-full bg-primary px-4 py-1 text-[9px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 flex items-center gap-2">
                                    <Zap className="h-3 w-3 fill-current" />
                                    Operational Fallback
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-base font-medium text-muted-foreground leading-relaxed max-w-3xl italic border-l-2 border-border pl-6">
                              "{provider.description}"
                            </p>
                            
                            <div className="space-y-6 pt-8 border-t border-border/40">
                              {!provider.isLocal && (
                                <div className="space-y-3">
                                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 flex items-center gap-2">
                                    <Lock className="h-3 w-3" />
                                    Authorization Node
                                  </label>
                                  <div className="relative max-w-xl group">
                                    <input
                                      type={showApiKey[provider.id] ? 'text' : 'password'}
                                      value={provider.apiKey || ''}
                                      onChange={(e) =>
                                        updateProviderConfig(provider.id, { apiKey: e.target.value })
                                      }
                                      placeholder="Secret access identifier..."
                                      className="h-14 w-full rounded-2xl border border-border bg-muted/[0.03] px-6 pr-14 text-sm font-mono transition-all focus:bg-background focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none"
                                    />
                                    <button
                                      onClick={() =>
                                        setShowApiKey((prev) => ({
                                          ...prev,
                                          [provider.id]: !prev[provider.id],
                                        }))
                                      }
                                      className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                    >
                                      {showApiKey[provider.id] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 flex items-center gap-2">
                                  <Globe className="h-3 w-3" />
                                  Gateway Protocol
                                </label>
                                <div className="relative max-w-xl group">
                                  <input
                                    type="text"
                                    value={provider.baseUrl}
                                    onChange={(e) =>
                                      updateProviderConfig(provider.id, { baseUrl: e.target.value })
                                    }
                                    placeholder="https://api.gateway.node/v1"
                                    className="h-14 w-full rounded-2xl border border-border bg-muted/[0.03] px-6 text-sm font-mono transition-all focus:bg-background focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-6 pt-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 flex items-center gap-2">
                                  <Activity className="h-3 w-3" />
                                  Model Schema
                                </label>
                                <div className="flex flex-wrap gap-3">
                                  {provider.models.map((model) => (
                                    <span
                                      key={model.id}
                                      className="inline-flex items-center gap-3 rounded-2xl bg-background border border-border px-5 py-2.5 text-xs font-bold text-foreground shadow-sm group/model hover:border-primary/30 transition-all"
                                    >
                                      {model.name}
                                      <button
                                        type="button"
                                        onClick={() => removeModelFromProvider(provider.id, model.id)}
                                        className="text-muted-foreground hover:text-rose-500 transition-colors opacity-0 group-hover/model:opacity-100"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </span>
                                  ))}
                                  <button className="h-10 w-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all">
                                    <Plus className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="pt-8 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "h-2 w-2 rounded-full",
                                  status === 'connected' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                  status === 'error' ? "bg-rose-500 animate-pulse" : "bg-muted-foreground/30"
                                )} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  {status === 'connected' ? 'Authority Verified' : status === 'error' ? 'Handshake Failed' : 'Ready for Protocol'}
                                </span>
                              </div>
                              <div className="flex gap-4">
                                <button
                                  onClick={() => handleTestConnection(provider.id)}
                                  className="button-professional border border-border bg-background px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-muted"
                                >
                                  Verify Handshake
                                </button>
                                <button
                                  onClick={() => setActiveProvider(provider.id)}
                                  className={cn(
                                    "button-professional px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                                    isActive ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-secondary text-primary hover:bg-muted"
                                  )}
                                >
                                  Establish Fallback
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'governance' && (
              <motion.div 
                key="governance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="space-y-2">
                  <h3 className="text-4xl font-bold tracking-tight">Workspace Governance</h3>
                  <p className="text-base font-medium text-muted-foreground leading-relaxed max-w-2xl">
                    Configure high-level execution policies and global authority fallbacks.
                  </p>
                </div>

                <div className="card-professional p-10 bg-primary/5 border-primary/10">
                  <div className="flex items-start gap-8">
                    <div className="rounded-[1.5rem] bg-primary p-5 text-white shadow-xl shadow-primary/20">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <div className="flex-1 space-y-10">
                      <div>
                        <h4 className="text-2xl font-bold tracking-tight">Execution Authority</h4>
                        <p className="text-sm font-medium text-muted-foreground mt-2">Primary fallback engine for all runs in this workspace.</p>
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Default Node</label>
                          <div className="relative group">
                            <select 
                              value={governanceForm.defaultProvider}
                              onChange={(e) => setGovernanceForm({ ...governanceForm, defaultProvider: e.target.value })}
                              className="w-full appearance-none rounded-2xl border border-border bg-background px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                            >
                              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Default Inference</label>
                          <div className="relative group">
                            <select 
                              value={governanceForm.defaultModel}
                              onChange={(e) => setGovernanceForm({ ...governanceForm, defaultModel: e.target.value })}
                              className="w-full appearance-none rounded-2xl border border-border bg-background px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                            >
                              {providers.find(p => p.id === governanceForm.defaultProvider)?.models.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-border/40 flex justify-end">
                        <button 
                          onClick={handleSaveGovernance}
                          disabled={isUpdatingSettings}
                          className="button-professional bg-primary text-white flex items-center gap-3 px-10 py-4 shadow-2xl shadow-primary/20"
                        >
                          {isUpdatingSettings ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                          <span className="font-bold uppercase tracking-widest text-xs">Apply Policy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'integrations' && (
              <motion.div 
                key="integrations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="space-y-2">
                  <h3 className="text-4xl font-bold tracking-tight">Integrations</h3>
                  <p className="text-base font-medium text-muted-foreground leading-relaxed max-w-2xl">
                    Connect Soothsayer to external repositories, communication nodes, and issue trackers.
                  </p>
                </div>

                <div className="grid gap-6">
                  {[
                    { key: 'github', name: 'GitHub', icon: <Github className="h-6 w-6" />, description: 'Sync repositories and manage governed code changes' },
                    { key: 'slack', name: 'Slack', icon: <MessageSquare className="h-6 w-6" />, description: 'Real-time decision alerts and run notifications' },
                    { key: 'jira', name: 'Jira', icon: <ClipboardList className="h-6 w-6" />, description: 'Automated issue mapping and execution history' },
                    { key: 'linear', name: 'Linear', icon: <Layout className="h-6 w-6" />, description: 'Controlled workflow tracking and triage' },
                    { key: 'notion', name: 'Notion', icon: <FileText className="h-6 w-6" />, description: 'Document generation and documentation audit' },
                    { key: 'discord', name: 'Discord', icon: <Gamepad2 className="h-6 w-6" />, description: 'Community interaction and bot orchestration' },
                    { key: 'google_drive', name: 'Google Drive', icon: <HardDrive className="h-6 w-6" />, description: 'Secure file access and artifact storage' },
                  ].map((integration) => {
                    const status = integrationStatus[integration.key];
                    return (
                      <div 
                        key={integration.key}
                        className="card-professional group p-8 flex items-center justify-between border-border/60 hover:border-primary/20 transition-all duration-300"
                      >
                        <div className="flex items-center gap-8">
                          <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-secondary text-primary shadow-sm border border-border/50 group-hover:bg-primary/5 group-hover:text-primary transition-all duration-500">
                            {integration.icon}
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-xl tracking-tight">{integration.name}</h4>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-md">{integration.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => testIntegration(integration.key as IntegrationKey)}
                            disabled={testingIntegration === integration.key}
                            className="button-professional border border-border bg-background px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-muted"
                          >
                            {testingIntegration === integration.key ? 'Verifying...' : 'Verify'}
                          </button>
                          <button className="button-professional bg-primary text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/10">
                            Establish Link
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
