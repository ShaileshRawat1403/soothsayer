import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useAIProviderStore, AIProvider } from '@/stores/ai-provider.store';
import { useTheme } from '@/components/common/ThemeProvider';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  User,
  Bell,
  Shield,
  Palette,
  Key,
  Globe,
  Cpu,
  Webhook,
  Save,
  Eye,
  EyeOff,
  Check,
  X,
  RefreshCw,
  Zap,
  Server,
  Cloud,
  Laptop,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Info,
  Plus,
  Trash2,
  Lock,
  GanttChartSquare,
  Github,
  MessageSquare,
  ClipboardList,
  Layout,
  FileText,
  Gamepad2,
  HardDrive,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';

type IntegrationKey =
  | 'github'
  | 'slack'
  | 'google_drive'
  | 'notion'
  | 'linear'
  | 'discord'
  | 'jira'
  ;

const baseTabs = [
  { id: 'ai-providers', label: 'AI Providers', icon: Cpu, badge: 'New' },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'integrations', label: 'Integrations', icon: Webhook },
];

export function SettingsPage() {
  type IntegrationState = {
    configured: boolean;
    connected: boolean;
    message: string;
    accountName?: string;
    connectedAt?: string;
    lastTestAt?: string;
    lastTestStatus?: 'pass' | 'fail' | 'not_configured';
  };

  const location = useLocation();
  const { user, updateUser } = useAuthStore();
  const { currentWorkspace, updateWorkspace } = useWorkspaceStore();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('ai-providers');
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, IntegrationState>>({});
  const [oauthReadiness, setOauthReadiness] = useState<Record<string, { ready: boolean; missing: string[] }>>({});
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [manualTokenByIntegration, setManualTokenByIntegration] = useState<Record<string, string>>({});
  const [manualAccountByIntegration, setManualAccountByIntegration] = useState<Record<string, string>>({});
  const [manualCloudIdByIntegration, setManualCloudIdByIntegration] = useState<Record<string, string>>({});
  const [savingManualFor, setSavingManualFor] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [governanceForm, setGovernanceForm] = useState({
    defaultProvider: '',
    defaultModel: '',
  });

  const oauthIntegrations = useMemo(
    () => new Set<IntegrationKey>(['github', 'slack', 'google_drive', 'jira', 'notion', 'linear', 'discord']),
    [],
  );
  
  const {
    providers,
    activeProvider,
    connectionStatus,
    setActiveProvider,
    updateProviderConfig,
    testConnection,
    isConnecting,
    addModelToProvider,
    removeModelFromProvider,
  } = useAIProviderStore();

  const isAdmin = currentUserRole === 'admin';

  const tabs = useMemo(() => {
    const list = [...baseTabs];
    if (isAdmin) {
      list.push({ id: 'governance', label: 'Governance', icon: GanttChartSquare });
    }
    return list;
  }, [isAdmin]);

  const [newModelByProvider, setNewModelByProvider] = useState<
    Record<string, { id: string; name: string; contextLength: string }>
  >({});

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    timezone: 'America/New_York',
    language: 'en',
  });

  const [notifications, setNotifications] = useState({
    emailDigest: true,
    commandAlerts: true,
    workflowUpdates: true,
    approvalRequests: true,
    securityAlerts: true,
  });

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    
    const loadRole = async () => {
      try {
        const response = await apiHelpers.getWorkspace(currentWorkspace.id);
        const data = response.data as any;
        setCurrentUserRole(data.currentUserRole);
        
        const settings = data.workspace?.settings || {};
        setGovernanceForm({
          defaultProvider: String(settings.defaultProvider || ''),
          defaultModel: String(settings.defaultModel || ''),
        });
      } catch (error) {
        console.error('Failed to load workspace role', error);
      }
    };
    
    void loadRole();
  }, [currentWorkspace?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const integration = params.get('integration');
    const connected = params.get('connected');
    const error = params.get('error');
    if (!integration || connected === null) return;

    if (connected === '1') {
      toast.success(`${integration} connected`);
      setActiveTab('integrations');
    } else {
      toast.error(error ? decodeURIComponent(error) : `${integration} connection failed`);
      setActiveTab('integrations');
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab !== 'integrations') return;
    let mounted = true;

    const load = async () => {
      try {
        const [statusResponse, readinessResponse] = await Promise.all([
          apiHelpers.getIntegrationStatus(currentWorkspace?.id),
          apiHelpers.getOAuthReadiness(),
        ]);
        const list = (statusResponse.data || []) as Array<{
          name: string;
          configured: boolean;
          connected: boolean;
          message: string;
          accountName?: string;
          connectedAt?: string;
          lastTestAt?: string;
          lastTestStatus?: 'pass' | 'fail' | 'not_configured';
        }>;
        if (!mounted) return;
        const next: Record<string, IntegrationState> = {};
        for (const row of list) {
          next[row.name] = {
            configured: Boolean(row.configured),
            connected: Boolean(row.connected),
            message: String(row.message || ''),
            accountName: row.accountName ? String(row.accountName) : undefined,
            connectedAt: row.connectedAt ? String(row.connectedAt) : undefined,
            lastTestAt: row.lastTestAt ? String(row.lastTestAt) : undefined,
            lastTestStatus: row.lastTestStatus,
          };
        }
        setIntegrationStatus(next);

        const readinessList = (readinessResponse.data || []) as Array<{
          name: string;
          ready: boolean;
          missing: string[];
        }>;
        const readinessMap: Record<string, { ready: boolean; missing: string[] }> = {};
        for (const row of readinessList) {
          readinessMap[row.name] = {
            ready: Boolean(row.ready),
            missing: Array.isArray(row.missing) ? row.missing.map(String) : [],
          };
        }
        setOauthReadiness(readinessMap);
      } catch (error) {
        if (!mounted) return;
        const msg = error instanceof Error ? error.message : 'Failed to fetch integration status';
        toast.error(msg);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [activeTab, currentWorkspace?.id]);

  const formatDateTime = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString();
  };

  const testIntegration = async (name: IntegrationKey) => {
    setTestingIntegration(name);
    try {
      const response = await apiHelpers.testIntegration(name, currentWorkspace?.id);
      const row = response.data as IntegrationState;
      setIntegrationStatus((prev) => ({
        ...prev,
        [name]: {
          configured: Boolean(row.configured),
          connected: Boolean(row.connected),
          message: String(row.message || ''),
          accountName: row.accountName,
          connectedAt: row.connectedAt,
          lastTestAt: row.lastTestAt,
          lastTestStatus: row.lastTestStatus,
        },
      }));
      if (row.connected) {
        toast.success(`${name} connected`);
      } else {
        toast.error(`${name}: ${row.message || 'not connected'}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Integration test failed';
      toast.error(msg);
    } finally {
      setTestingIntegration(null);
    }
  };

  const connectOAuthIntegration = async (
    name: 'github' | 'slack' | 'google_drive' | 'jira' | 'notion' | 'linear' | 'discord',
  ) => {
    try {
      const response = await apiHelpers.getIntegrationConnectUrl(name, currentWorkspace?.id);
      const payload = response.data as { authUrl?: string };
      if (!payload?.authUrl) {
        throw new Error('Missing OAuth URL');
      }
      window.location.href = payload.authUrl;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start OAuth flow';
      toast.error(msg);
    }
  };

  const disconnectOAuthIntegration = async (
    name: 'github' | 'slack' | 'google_drive' | 'jira' | 'notion' | 'linear' | 'discord',
  ) => {
    try {
      await apiHelpers.disconnectIntegration(name, currentWorkspace?.id);
      await testIntegration(name);
      toast.success(`${name} disconnected`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to disconnect integration';
      toast.error(msg);
    }
  };

  const saveManualToken = async (name: IntegrationKey) => {
    const accessToken = (manualTokenByIntegration[name] || '').trim();
    if (!accessToken) {
      toast.error('Access token is required');
      return;
    }
    setSavingManualFor(name);
    try {
      await apiHelpers.setIntegrationManualToken(name, {
        workspaceId: currentWorkspace?.id,
        accessToken,
        accountName: (manualAccountByIntegration[name] || '').trim() || undefined,
        cloudId: name === 'jira' ? (manualCloudIdByIntegration[name] || '').trim() || undefined : undefined,
      });
      await testIntegration(name);
      toast.success(`${name} manual token saved`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save manual token';
      toast.error(msg);
    } finally {
      setSavingManualFor(null);
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
      });
      
      updateWorkspace(currentWorkspace.id, { settings: newSettings });
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

  const mockApiKey = 'sk-soothsayer-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

import { useState, useMemo } from 'react';
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
    testConnection
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

  const tabs = [
    { id: 'ai-providers', label: 'AI Engines', icon: Cpu },
    { id: 'governance', label: 'Governance', icon: ShieldCheck, badge: 'V2' },
    { id: 'integrations', label: 'Integrations', icon: Webhook },
    { id: 'profile', label: 'Identity', icon: Lock },
    { id: 'appearance', label: 'Interface', icon: Palette },
    { id: 'notifications', label: 'Signals', icon: Activity },
  ] as const;

  const testIntegration = async (name: IntegrationKey) => {
    setTestingIntegration(name);
    try {
      const response = await apiHelpers.testIntegration(name, currentWorkspace?.id);
      setIntegrationStatus((prev) => ({
        ...prev,
        [name]: response.data,
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

  const connectOAuthIntegration = async (name: IntegrationKey) => {
    try {
      const response = await apiHelpers.getIntegrationAuthUrl(name, currentWorkspace?.id);
      window.location.href = response.data.url;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get auth URL';
      toast.error(msg);
    }
  };

  const disconnectOAuthIntegration = async (
    name: 'github' | 'slack' | 'google_drive' | 'jira' | 'notion' | 'linear' | 'discord',
  ) => {
    try {
      await apiHelpers.disconnectIntegration(name, currentWorkspace?.id);
      await testIntegration(name);
      toast.success(`${name} disconnected`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to disconnect integration';
      toast.error(msg);
    }
  };

  const saveManualToken = async (name: IntegrationKey) => {
    const accessToken = (manualTokenByIntegration[name] || '').trim();
    if (!accessToken) {
      toast.error('Access token is required');
      return;
    }
    setSavingManualFor(name);
    try {
      await apiHelpers.setIntegrationManualToken(name, {
        workspaceId: currentWorkspace?.id,
        accessToken,
        accountName: (manualAccountByIntegration[name] || '').trim() || undefined,
        cloudId: name === 'jira' ? (manualCloudIdByIntegration[name] || '').trim() || undefined : undefined,
      });
      await testIntegration(name);
      toast.success(`${name} manual token saved`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save manual token';
      toast.error(msg);
    } finally {
      setSavingManualFor(null);
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
      });
      
      updateWorkspace(currentWorkspace.id, { settings: newSettings });
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
      {/* Sidebar - Local to Settings */}
      <div className="w-72 border-r border-border bg-card/30 backdrop-blur-xl">
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

      {/* Content Area */}
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
                                  onClick={() => useAIProviderStore.getState().setActiveProvider(provider.id)}
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
            {/* Conceptually apply similar styling to governance and integrations if visited */}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
                                <input
                                  type="text"
                                  placeholder="Label"
                                  value={newModelByProvider[provider.id]?.name || ''}
                                  onChange={(e) =>
                                    setNewModelByProvider((prev) => ({
                                      ...prev,
                                      [provider.id]: {
                                        id: prev[provider.id]?.id || '',
                                        name: e.target.value,
                                        contextLength: prev[provider.id]?.contextLength || '8192',
                                      },
                                    }))
                                  }
                                  className="h-10 rounded-xl border border-border bg-background px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                />
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    placeholder="Window"
                                    value={newModelByProvider[provider.id]?.contextLength || '8192'}
                                    onChange={(e) =>
                                      setNewModelByProvider((prev) => ({
                                        ...prev,
                                        [provider.id]: {
                                          id: prev[provider.id]?.id || '',
                                          name: prev[provider.id]?.name || '',
                                          contextLength: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-10 w-full rounded-xl border border-border bg-background px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddModel(provider.id)}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-4 min-w-[120px]">
                          <div className="flex flex-col items-end gap-1">
                            {status === 'connected' ? (
                              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                                <CheckCircle className="h-3 w-3" />
                                Trace Ready
                              </div>
                            ) : status === 'error' ? (
                              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-rose-600">
                                <AlertCircle className="h-3 w-3" />
                                Path Blocked
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                <Info className="h-3 w-3" />
                                Not Linked
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 w-full">
                            <button
                              onClick={() => handleTestConnection(provider.id)}
                              disabled={isConnecting}
                              className="w-full flex items-center justify-center gap-2 rounded-full border border-border bg-background py-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground hover:bg-muted transition-all disabled:opacity-50"
                            >
                              <RefreshCw className={cn("h-3 w-3", isConnecting && "animate-spin")} />
                              Test
                            </button>
                            
                            {!isActive ? (
                              <button
                                onClick={() => setActiveProvider(provider.id)}
                                className="w-full flex items-center justify-center gap-2 rounded-full bg-primary py-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground shadow-lg shadow-primary/10 hover:opacity-90 transition-all"
                              >
                                <Zap className="h-3 w-3" />
                                Route
                              </button>
                            ) : (
                              <div className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-500/10 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 border border-emerald-500/20">
                                <Check className="h-3 w-3" />
                                Current
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'governance' && isAdmin && (
            <div className="space-y-10">
              <div className="space-y-2">
                <h3 className="text-3xl font-bold tracking-tight">Workspace Governance</h3>
                <p className="text-muted-foreground font-medium">
                  Configure execution policies and default provider paths for this workspace.
                </p>
              </div>

              <div className="grid gap-8">
                <section className="card-professional p-10 bg-background shadow-apple-lg border-primary/5">
                  <div className="flex items-start gap-6 mb-10">
                    <div className="rounded-[1.5rem] bg-primary p-4 text-white shadow-xl shadow-primary/20">
                      <Lock className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold tracking-tight">Execution Authority</h4>
                      <p className="text-sm font-medium text-muted-foreground mt-1">
                        Define which engine and model should be the primary authority for all runs.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="space-y-6">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground block ml-1">
                        Default Engine Node
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {providers.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setGovernanceForm({ ...governanceForm, defaultProvider: p.id })}
                            className={cn(
                              'flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300',
                              governanceForm.defaultProvider === p.id
                                ? 'border-primary bg-primary/[0.02] shadow-apple ring-4 ring-primary/5'
                                : 'border-border hover:border-primary/30 bg-muted/10'
                            )}
                          >
                            <span className="text-2xl">{p.icon}</span>
                            <div className="min-w-0">
                              <div className="text-sm font-black truncate text-foreground">{p.name}</div>
                              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{p.isLocal ? 'Local Node' : 'Cloud Node'}</div>
                            </div>
                            {governanceForm.defaultProvider === p.id && (
                              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center ml-auto">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                        <button
                          onClick={() => setGovernanceForm({ ...governanceForm, defaultProvider: '' })}
                          className={cn(
                            'flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300',
                            governanceForm.defaultProvider === ''
                              ? 'border-primary bg-primary/[0.02] shadow-apple ring-4 ring-primary/5'
                              : 'border-border hover:border-primary/30 bg-muted/10'
                          )}
                        >
                          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shadow-sm">
                            <RefreshCw className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-black truncate text-foreground">Inherited Path</div>
                            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">System Default</div>
                          </div>
                          {governanceForm.defaultProvider === '' && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center ml-auto">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6 pt-10 border-t border-border/50">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground block ml-1">
                        Inference Selection
                      </label>
                      <div className="relative max-w-lg group">
                        <select
                          value={governanceForm.defaultModel}
                          onChange={(e) => setGovernanceForm({ ...governanceForm, defaultModel: e.target.value })}
                          className="w-full appearance-none rounded-2xl border border-border bg-background px-6 py-5 text-sm font-bold text-foreground focus:outline-none focus:ring-4 focus:ring-primary/5 shadow-apple transition-all"
                        >
                          <option value="">Engine Default Logic</option>
                          {providers
                            .find(p => p.id === governanceForm.defaultProvider)
                            ?.models.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover:text-foreground transition-colors">
                          <ChevronRight className="h-5 w-5 rotate-90" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground max-w-xl leading-relaxed italic">
                        " If no model is selected, DAX will automatically resolve the most capable engine from the selected node. "
                      </p>
                    </div>

                    <div className="pt-10 flex justify-end">
                      <button
                        disabled={isUpdatingSettings}
                        onClick={handleSaveGovernance}
                        className="button-professional bg-primary text-primary-foreground hover:opacity-90 shadow-2xl shadow-primary/20 flex items-center gap-3 px-10 py-4"
                      >
                        {isUpdatingSettings ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        <span className="text-base font-bold uppercase tracking-widest">Apply Governance Policy</span>
                      </button>
                    </div>
                  </div>
                </section>

                <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/[0.02] p-8 shadow-sm">
                  <div className="flex gap-6">
                    <div className="rounded-2xl bg-amber-500/10 p-3 flex-shrink-0 self-start">
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="text-sm">
                      <h5 className="text-lg font-bold text-amber-900 dark:text-amber-400 tracking-tight">Policy Resolution Hierarchy</h5>
                      <p className="mt-2 text-amber-800/80 dark:text-amber-500/80 font-medium leading-relaxed">
                        Workspace-level settings act as the primary operational fallback. Individual persona configurations or direct run intent overrides will always take precedence over these defaults to ensure task-specific performance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl space-y-10">
              <h3 className="text-3xl font-bold tracking-tight">Profile Settings</h3>
              
              <div className="card-professional p-10 space-y-10">
                <div className="flex items-center gap-8">
                  <div className="relative group">
                    <div className="flex h-28 w-24 items-center justify-center rounded-[2rem] bg-primary text-4xl font-bold text-white shadow-xl shadow-primary/10 transition-transform duration-500 group-hover:scale-105">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <button className="absolute -bottom-2 -right-2 rounded-2xl bg-background border border-border p-3 shadow-lg hover:bg-muted transition-colors text-primary">
                      <Palette className="h-5 w-5" />
                    </button>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold tracking-tight">{user?.name || 'Authorized User'}</h4>
                    <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">{user?.email}</p>
                    <div className="mt-4 flex gap-3">
                      <button className="rounded-full bg-secondary px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-muted transition-all active:scale-95">
                        Update Avatar
                      </button>
                      <button className="rounded-full border border-border bg-background px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-muted transition-all active:scale-95">
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-8 sm:grid-cols-2 pt-10 border-t border-border/50">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="h-12 w-full rounded-2xl border border-border bg-muted/20 px-4 text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Email Identity</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="h-12 w-full rounded-2xl border border-border bg-muted/50 px-4 text-sm font-bold opacity-60 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    className="button-professional bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/10 flex items-center gap-2 px-10 py-3"
                  >
                    <Save className="h-4 w-4" />
                    Save Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="max-w-3xl space-y-10">
              <h3 className="text-3xl font-bold tracking-tight">Appearance</h3>
              
              <div className="space-y-8">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground block ml-1">Interface Theme</label>
                <div className="grid grid-cols-3 gap-6">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        'card-professional group p-10 flex flex-col items-center gap-6 transition-all duration-500 active:scale-95',
                        theme === t
                          ? 'border-primary bg-primary/[0.02] shadow-apple ring-4 ring-primary/5'
                          : 'border-border hover:border-primary/30 hover:scale-[1.02]'
                      )}
                    >
                      <div className={cn(
                        "h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-colors duration-500",
                        theme === t ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      )}>
                        {t === 'light' && <Sun className="h-8 w-8" />}
                        {t === 'dark' && <Moon className="h-8 w-8" />}
                        {t === 'system' && <Monitor className="h-8 w-8" />}
                      </div>
                      <div className="text-xs font-black uppercase tracking-[0.2em]">{t}</div>
                      {theme === t && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl space-y-10">
              <h3 className="text-3xl font-bold tracking-tight">Signals</h3>
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-3xl border border-border bg-muted/[0.02] p-6 transition-all hover:bg-muted/30 hover:border-primary/20"
                  >
                    <div>
                      <div className="text-sm font-bold tracking-tight">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground mt-1">
                        Configure alerts for {key.toLowerCase().replace(/([A-Z])/g, ' $1')}
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [key]: !value })}
                      className={cn(
                        'relative h-8 w-14 rounded-full transition-all duration-300',
                        value ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-muted border border-border'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute left-1.5 top-1.5 h-5 w-5 rounded-full shadow-sm transition-all duration-300',
                          value ? 'translate-x-6 bg-white' : 'bg-muted-foreground/40'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="max-w-4xl space-y-10">
              <div className="space-y-2">
                <h3 className="text-3xl font-bold tracking-tight">Integrations</h3>
                <p className="text-muted-foreground font-medium">Link external systems to the execution authority.</p>
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
                  const oauthState = oauthReadiness[integration.key];
                  const oauthReady = oauthState?.ready ?? false;
                  const missingKeys = oauthState?.missing || [];
                  const showOAuthUnavailable =
                    oauthIntegrations.has(integration.key as IntegrationKey) && !oauthReady;
                  const status = integrationStatus[integration.key];
                  return <div
                    key={integration.key}
                    className="card-professional group overflow-hidden border-border/60 hover:border-primary/20 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between p-8">
                      <div className="flex items-center gap-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary shadow-sm border border-border/50 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                          {integration.icon}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-lg tracking-tight">{integration.name}</h4>
                          <p className="text-xs font-medium text-muted-foreground leading-relaxed max-w-sm">{integration.description}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span
                              className={cn(
                                'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border',
                                status?.connected
                                  ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10'
                                  : status?.configured
                                    ? 'bg-amber-500/5 text-amber-600 border-amber-500/10'
                                    : 'bg-muted text-muted-foreground border-border',
                              )}
                            >
                              {status?.message || 'Ready to Connect'}
                            </span>
                            {status?.accountName && (
                              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                Alias: {status.accountName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {oauthIntegrations.has(integration.key as IntegrationKey) && (
                          status?.connected ? (
                            <button
                              onClick={() =>
                                disconnectOAuthIntegration(
                                  integration.key as any
                                )
                              }
                              className="rounded-full bg-secondary px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-all"
                            >
                              Unlink
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                connectOAuthIntegration(
                                  integration.key as any
                                )
                              }
                              disabled={!oauthReady}
                              className="rounded-full bg-primary px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/10 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                            >
                              OAuth Link
                            </button>
                          )
                        )}
                        <button
                          onClick={() => testIntegration(integration.key as IntegrationKey)}
                          disabled={testingIntegration === integration.key}
                          className="rounded-full border border-border bg-background px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted transition-all active:scale-95 disabled:opacity-50"
                        >
                          {testingIntegration === integration.key ? 'Testing...' : 'Verify'}
                        </button>
                      </div>
                    </div>
                    {/* Manual token simplified */}
                    <div className="px-8 pb-8 pt-0">
                      <details className="group/details">
                        <summary className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-2">
                          <ChevronRight className="h-3 w-3 transition-transform group-open/details:rotate-90" />
                          Manual Access Protocol
                        </summary>
                        <div className="grid gap-4 sm:grid-cols-3 mt-6 animate-in slide-in-from-top-2 duration-300">
                          <div className="space-y-2">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-center">Token Node</span>
                            <input
                              type="password"
                              placeholder="Access secret"
                              value={manualTokenByIntegration[integration.key] || ''}
                              onChange={(e) =>
                                setManualTokenByIntegration((prev) => ({ ...prev, [integration.key]: e.target.value }))
                              }
                              className="h-10 w-full rounded-xl border border-border bg-muted/20 px-4 text-xs font-mono transition-all focus:outline-none focus:ring-2 focus:ring-primary/10"
                            />
                          </div>
                          <div className="space-y-2">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identity</span>
                            <input
                              type="text"
                              placeholder="Alias"
                              value={manualAccountByIntegration[integration.key] || ''}
                              onChange={(e) =>
                                setManualAccountByIntegration((prev) => ({ ...prev, [integration.key]: e.target.value }))
                              }
                              className="h-10 w-full rounded-xl border border-border bg-muted/20 px-4 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary/10"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={() => saveManualToken(integration.key as IntegrationKey)}
                              disabled={savingManualFor === integration.key}
                              className="h-10 w-full rounded-xl bg-secondary text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95 disabled:opacity-50"
                            >
                              {savingManualFor === integration.key ? 'Saving' : 'Commit'}
                            </button>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
