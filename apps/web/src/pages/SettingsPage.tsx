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
  ChevronDown,
  User,
  Key,
  Shield,
  X,
  ChevronUp,
  Box,
  Command,
  ArrowUpRight
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
  bot: <Bot className="h-4 w-4" />,
  cpu: <Cpu className="h-4 w-4" />,
  server: <Server className="h-4 w-4" />,
  laptop: <Laptop className="h-4 w-4" />,
  zap: <Zap className="h-4 w-4" />,
  globe: <Globe className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
  cloud: <Cloud className="h-4 w-4" />,
  settings: <SettingsIcon className="h-4 w-4" />,
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

  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [newModelByProvider, setNewModelByProvider] = useState<Record<string, { id: string; name: string; contextLength: string }>>({});
  const [testingIntegration, setTestingIntegration] = useState<IntegrationKey | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [governanceForm, setGovernanceForm] = useState({
    defaultProvider: (currentWorkspace?.settings as any)?.defaultProvider || 'dax',
    defaultModel: (currentWorkspace?.settings as any)?.defaultModel || 'gemini-2.5-pro',
  });

  const [signals, setSignals] = useState({
    executionAlerts: true,
    approvalGated: true,
    systemFaults: true,
    handoffSync: false,
    auditLogging: true,
    realtimeMetrics: true
  });

  const tabs: SettingsTab[] = [
    { id: 'ai-providers', label: 'Engines', icon: Cpu },
    { id: 'governance', label: 'Governance', icon: ShieldCheck, badge: 'V2' },
    { id: 'integrations', label: 'Nodes', icon: Webhook },
    { id: 'profile', label: 'Identity', icon: User },
    { id: 'appearance', label: 'Interface', icon: Palette },
    { id: 'notifications', label: 'Signals', icon: Activity },
  ];

  const handleSaveProfile = () => {
    updateUser({ name: profileForm.name });
    toast.success('Identity synchronized');
  };

  const handleSaveGovernance = async () => {
    if (!currentWorkspace?.id) return;
    setIsUpdatingSettings(true);
    try {
      const newSettings = {
        ...currentWorkspace.settings,
        defaultProvider: governanceForm.defaultProvider || undefined,
        defaultModel: governanceForm.defaultModel || undefined,
      };
      await apiHelpers.updateWorkspace(currentWorkspace.id, { settings: newSettings } as any);
      updateWorkspace(currentWorkspace.id, { settings: newSettings } as any);
      toast.success('Policy applied');
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleTestIntegration = async (name: IntegrationKey) => {
    setTestingIntegration(name);
    try {
      await apiHelpers.testIntegration(name, currentWorkspace?.id);
      toast.success(`${name} verified`);
    } catch (error) {
      toast.error(`${name} node fault`);
    } finally {
      setTestingIntegration(null);
    }
  };

  return (
    <div className="flex h-full bg-background animate-in-up">
      {/* Sidebar - Pro Minimal */}
      <div className="w-60 border-r border-border/30 bg-card/20 backdrop-blur-xl shrink-0">
        <div className="p-8">
          <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 leading-none">Configuration</h2>
        </div>
        <nav className="space-y-0.5 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3.5 py-2 transition-all active-scale',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40'
              )}
            >
              <tab.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 duration-300" />
              <span className="text-[10px] font-black uppercase tracking-widest truncate">{tab.label}</span>
              {tab.badge && (
                <span className="ml-auto rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[8px] font-black text-amber-600">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Viewport */}
      <div className="flex-1 overflow-auto scrollbar-none">
        <div className="p-12 max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'ai-providers' && (
              <motion.div key="ai-providers" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-10">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tighter uppercase">Inference Infrastructure</h3>
                  <p className="text-[13px] font-medium text-muted-foreground/60 leading-relaxed">DAX is the primary assistant authority. Direct providers remain available as advanced fallback paths.</p>
                </div>

                <div className="grid gap-3">
                  {providers.map((provider) => {
                    const status = connectionStatus[provider.id];
                    const isActive = activeProvider === provider.id;
                    const isExpanded = expandedProvider === provider.id;
                    return (
                      <div key={provider.id} className={cn(
                        "group rounded-2xl border border-border/40 transition-all duration-500 overflow-hidden",
                        isActive ? "border-primary/20 bg-primary/[0.01]" : "bg-card/20",
                        isExpanded && "ring-1 ring-primary/10 shadow-lg"
                      )}>
                        <div 
                          onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                          className="p-6 flex items-center justify-between cursor-pointer hover:bg-muted/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-5">
                            <div className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 transition-all duration-500 group-hover:scale-105",
                              isActive ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-muted/30 text-primary"
                            )}>
                              {iconMap[provider.icon] || <Bot className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5">
                                <h4 className="font-black uppercase text-xs tracking-widest leading-none">{provider.name}</h4>
                                {isActive && <div className="h-1 w-1 rounded-full bg-primary shadow-[0_0_6px_rgba(0,0,0,0.4)]" />}
                              </div>
                              <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mt-1.5 leading-none">{provider.isLocal ? 'Local Runtime' : 'Cloud Node'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-1.5 w-1.5 rounded-full transition-all duration-500",
                              status === 'connected' ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" : "bg-muted-foreground/20"
                            )} />
                            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-300", isExpanded && "rotate-180")} />
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/20 overflow-hidden">
                              <div className="p-8 space-y-10">
                                <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed italic border-l-2 border-primary/10 pl-6">"{provider.description}"</p>
                                <div className="grid gap-6 sm:grid-cols-2">
                                  {!provider.isLocal && (
                                    <div className="space-y-3">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Access Identity</label>
                                      <div className="relative group/key">
                                        <input 
                                          type={showApiKey[provider.id] ? 'text' : 'password'}
                                          value={provider.apiKey || ''}
                                          onChange={e => updateProviderConfig(provider.id, { apiKey: e.target.value })}
                                          placeholder="sk-..."
                                          className="w-full h-10 rounded-xl border border-border/60 bg-background px-4 pr-10 text-[11px] font-mono focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                                        />
                                        <button onClick={(e) => { e.stopPropagation(); setShowApiKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] })); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors">
                                          {showApiKey[provider.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Gateway Endpoint</label>
                                    <input 
                                      value={provider.baseUrl}
                                      onChange={e => updateProviderConfig(provider.id, { baseUrl: e.target.value })}
                                      className="w-full h-10 rounded-xl border border-border/60 bg-background px-4 text-[11px] font-mono focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4 border-t border-border/20">
                                  <button onClick={() => testConnection(provider.id)} className="button-professional border border-border/60 hover:bg-muted text-foreground">Verify Handshake</button>
                                  <button onClick={() => { setActiveProvider(provider.id); toast.success('Execution path updated'); }} className={cn("button-professional", isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-primary text-white shadow-lg shadow-primary/10")}>
                                    {isActive ? 'Established' : 'Apply Authority'}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'governance' && (
              <motion.div key="governance" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-10">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tighter uppercase">Operational Policy</h3>
                  <p className="text-[13px] font-medium text-muted-foreground/60 leading-relaxed">Establish decentralized authority fallbacks and workspace directives.</p>
                </div>
                <div className="p-10 rounded-[2rem] border border-primary/10 bg-primary/[0.01] space-y-10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                    <ShieldCheck className="h-40 w-40" />
                  </div>
                  <div className="relative z-10 space-y-8 max-w-xl">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Default Node</label>
                        <div className="relative group">
                          <select value={governanceForm.defaultProvider} onChange={e => setGovernanceForm({...governanceForm, defaultProvider: e.target.value})} className="w-full appearance-none rounded-xl border border-border/60 bg-background px-4 py-3.5 text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-primary/5 outline-none transition-all">
                            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 pointer-events-none group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary/60 ml-1">Schema Priority</label>
                        <div className="relative group">
                          <select value={governanceForm.defaultModel} onChange={e => setGovernanceForm({...governanceForm, defaultModel: e.target.value})} className="w-full appearance-none rounded-xl border border-border/60 bg-background px-4 py-3.5 text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-primary/5 outline-none transition-all">
                            {providers.find(p => p.id === governanceForm.defaultProvider)?.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 pointer-events-none group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-primary/10 flex justify-end">
                      <button onClick={handleSaveGovernance} disabled={isUpdatingSettings} className="button-professional bg-primary text-white h-11 px-10 shadow-xl shadow-primary/10 flex items-center gap-2 active-scale">
                        {isUpdatingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Apply Policy Node
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'integrations' && (
              <motion.div key="integrations" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-10">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tighter uppercase">External Nodes</h3>
                  <p className="text-[13px] font-medium text-muted-foreground/60 leading-relaxed">Connect external repositories and communication protocol layers.</p>
                </div>
                <div className="grid gap-3">
                  {[
                    { id: 'github', name: 'GitHub', icon: <Github className="h-4 w-4" />, desc: 'Code repository synchronization and PR audit.' },
                    { id: 'slack', name: 'Slack', icon: <MessageSquare className="h-4 w-4" />, desc: 'Real-time trace alerts and signal notifications.' },
                    { id: 'jira', name: 'Jira', icon: <ClipboardList className="h-4 w-4" />, desc: 'Issue tracking and execution history mapping.' },
                    { id: 'linear', name: 'Linear', icon: <Layout className="h-4 w-4" />, desc: 'Project management and task lifecycle audit.' },
                    { id: 'notion', name: 'Notion', icon: <FileText className="h-4 w-4" />, desc: 'Knowledge base and document trace integration.' },
                    { id: 'discord', name: 'Discord', icon: <Gamepad2 className="h-4 w-4" />, desc: 'Community interaction and bot orchestration.' },
                    { id: 'google_drive', name: 'Google Drive', icon: <HardDrive className="h-4 w-4" />, desc: 'Cloud resource access and artifact storage.' }
                  ].map(node => (
                    <div key={node.id} className="p-6 rounded-2xl border border-border/40 bg-card/20 flex items-center justify-between group hover-glow transition-all duration-300">
                      <div className="flex items-center gap-6">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary border border-border/40 transition-transform group-hover:scale-105 duration-500">
                          {node.icon}
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest">{node.name}</h4>
                          <p className="text-[11px] font-medium text-muted-foreground/60 mt-1 leading-none">{node.desc}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleTestIntegration(node.id as any)} className="button-professional border border-border/60 hover:bg-muted text-foreground">
                          {testingIntegration === node.id ? 'Handshaking...' : 'Verify'}
                        </button>
                        <button className="button-professional bg-primary text-white shadow-lg shadow-primary/10">Establish Link</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-10">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tighter uppercase">Operational Signals</h3>
                  <p className="text-[13px] font-medium text-muted-foreground/60">Manage real-time alerts and decentralized execution state updates.</p>
                </div>
                <div className="grid gap-2">
                  {Object.entries(signals).map(([key, active]) => (
                    <button 
                      key={key} 
                      onClick={() => setSignals(s => ({ ...s, [key]: !active }))}
                      className="group flex items-center justify-between p-6 rounded-2xl border border-border/40 bg-card/20 hover:bg-card/40 transition-all text-left active-scale"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("h-1.5 w-1.5 rounded-full transition-all duration-500", active ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" : "bg-muted-foreground/20")} />
                        <span className="text-xs font-black uppercase tracking-widest text-foreground/80 group-hover:text-primary transition-colors">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                      </div>
                      <div className={cn("h-5 w-9 rounded-full transition-all duration-300 flex items-center px-1", active ? "bg-primary shadow-lg shadow-primary/10" : "bg-muted")}>
                        <div className={cn("h-3 w-3 rounded-full bg-background shadow-sm transition-transform duration-300", active ? "translate-x-4" : "")} />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-10">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tighter uppercase">Identity Profile</h3>
                  <p className="text-[13px] font-medium text-muted-foreground/60 leading-relaxed">Configure operator profile and synchronization nodes.</p>
                </div>
                <div className="p-10 rounded-[2rem] border border-border/40 bg-card/20 space-y-10 shadow-sm">
                  <div className="flex items-center gap-8">
                    <div className="h-20 w-20 rounded-[2rem] bg-primary text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-primary/10 group overflow-hidden">
                      <motion.div initial={false} whileHover={{ scale: 1.1 }} className="flex items-center justify-center w-full h-full">
                        {user?.name?.charAt(0) || 'O'}
                      </motion.div>
                    </div>
                    <div>
                      <h4 className="font-black uppercase text-xl tracking-tight leading-none">{user?.name}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] mt-2.5 leading-none">{user?.email} • Operator Synchronized</p>
                    </div>
                  </div>
                  <div className="grid gap-8 sm:grid-cols-2 pt-10 border-t border-border/20">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Handle</label>
                      <input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full h-11 rounded-xl border border-border/60 bg-background px-5 text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-primary/5 outline-none transition-all" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Email Protocol</label>
                      <input value={profileForm.email} disabled className="w-full h-11 rounded-xl border border-border bg-muted/50 px-5 text-xs font-bold opacity-40 cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button onClick={handleSaveProfile} className="button-professional bg-primary text-white h-11 px-10 shadow-xl shadow-primary/10 active-scale">Synchronize Identity</button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div key="appearance" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-10">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tighter uppercase">Interface Logic</h3>
                  <p className="text-[13px] font-medium text-muted-foreground/60">Customize the workstation visual layer and telemetry.</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {(['light', 'dark', 'system'] as const).map(t => (
                    <button key={t} onClick={() => setTheme(t)} className={cn("p-10 rounded-[2rem] border border-border/40 flex flex-col items-center gap-6 transition-all duration-500 active-scale group", theme === t ? "bg-primary text-white shadow-xl shadow-primary/10" : "bg-card/30 text-muted-foreground hover:border-primary/20")}>
                      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500", theme === t ? "bg-white/10 text-white" : "bg-muted/50 group-hover:text-primary")}>
                        {t === 'light' && <Sun className="h-6 w-6" />}
                        {t === 'dark' && <Moon className="h-6 w-6" />}
                        {t === 'system' && <Monitor className="h-6 w-6" />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
