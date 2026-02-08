import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useAIProviderStore, AIProvider } from '@/stores/ai-provider.store';
import { useTheme } from '@/components/common/ThemeProvider';
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
} from 'lucide-react';
import { toast } from 'sonner';

const tabs = [
  { id: 'ai-providers', label: 'AI Providers', icon: Cpu, badge: 'New' },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'integrations', label: 'Integrations', icon: Webhook },
];

export function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('ai-providers');
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  
  const {
    providers,
    activeProvider,
    activeModel,
    connectionStatus,
    setActiveProvider,
    updateProviderConfig,
    testConnection,
    isConnecting,
  } = useAIProviderStore();

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

  const handleSaveProfile = () => {
    updateUser({ name: profileForm.name });
    toast.success('Profile updated successfully');
  };

  const handleTestConnection = async (providerId: AIProvider) => {
    const result = await testConnection(providerId);
    if (result) {
      toast.success(`Connected to ${providers.find(p => p.id === providerId)?.name}`);
    } else {
      toast.error('Connection failed. Please check your configuration.');
    }
  };

  const mockApiKey = 'sk-soothsayer-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card/50">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your preferences</p>
        </div>
        <nav className="space-y-1 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'hover:bg-accent'
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.badge && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* AI Providers Tab */}
          {activeTab === 'ai-providers' && (
            <div className="max-w-4xl">
              <div className="mb-6">
                <h3 className="text-2xl font-bold">AI Providers</h3>
                <p className="text-muted-foreground">
                  Configure AI models for chat, code generation, and analysis
                </p>
              </div>

              {/* Provider Categories */}
              <div className="mb-8">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="rounded-xl border border-border bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4">
                    <Cloud className="h-8 w-8 text-blue-500 mb-2" />
                    <h4 className="font-semibold">Cloud Providers</h4>
                    <p className="text-sm text-muted-foreground">OpenAI, Anthropic, Groq</p>
                  </div>
                  <div className="rounded-xl border border-border bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4">
                    <Laptop className="h-8 w-8 text-green-500 mb-2" />
                    <h4 className="font-semibold">Local Models</h4>
                    <p className="text-sm text-muted-foreground">Ollama, LM Studio</p>
                  </div>
                  <div className="rounded-xl border border-border bg-gradient-to-br from-orange-500/10 to-amber-500/10 p-4">
                    <Server className="h-8 w-8 text-orange-500 mb-2" />
                    <h4 className="font-semibold">Custom Endpoints</h4>
                    <p className="text-sm text-muted-foreground">Any OpenAI-compatible API</p>
                  </div>
                </div>
              </div>

              {/* Provider List */}
              <div className="space-y-4">
                {providers.map((provider) => {
                  const status = connectionStatus[provider.id];
                  const isActive = activeProvider === provider.id;
                  
                  return (
                    <div
                      key={provider.id}
                      className={cn(
                        'rounded-xl border-2 p-4 transition-all',
                        isActive
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Provider Icon & Info */}
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-3xl">
                          {provider.icon}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-lg">{provider.name}</h4>
                            {provider.isLocal && (
                              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                                Local
                              </span>
                            )}
                            {isActive && (
                              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {provider.description}
                          </p>
                          
                          {/* Configuration */}
                          <div className="space-y-3">
                            {!provider.isLocal && (
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium w-24">API Key</label>
                                <div className="relative flex-1 max-w-md">
                                  <input
                                    type={showApiKey[provider.id] ? 'text' : 'password'}
                                    value={provider.apiKey || ''}
                                    onChange={(e) =>
                                      updateProviderConfig(provider.id, { apiKey: e.target.value })
                                    }
                                    placeholder={`Enter your ${provider.name} API key`}
                                    className="h-9 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                                  />
                                  <button
                                    onClick={() =>
                                      setShowApiKey((prev) => ({
                                        ...prev,
                                        [provider.id]: !prev[provider.id],
                                      }))
                                    }
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  >
                                    {showApiKey[provider.id] ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium w-24">Endpoint</label>
                              <input
                                type="text"
                                value={provider.baseUrl}
                                onChange={(e) =>
                                  updateProviderConfig(provider.id, { baseUrl: e.target.value })
                                }
                                placeholder="API endpoint URL"
                                className="h-9 flex-1 max-w-md rounded-lg border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>
                            
                            {/* Models */}
                            <div className="flex items-start gap-2">
                              <label className="text-sm font-medium w-24 pt-2">Models</label>
                              <div className="flex-1 flex flex-wrap gap-2">
                                {provider.models.slice(0, 4).map((model) => (
                                  <span
                                    key={model.id}
                                    className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium"
                                  >
                                    {model.name}
                                  </span>
                                ))}
                                {provider.models.length > 4 && (
                                  <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                                    +{provider.models.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-2">
                          {/* Connection Status */}
                          <div className="flex items-center gap-2">
                            {status === 'connected' && (
                              <span className="flex items-center gap-1 text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                Connected
                              </span>
                            )}
                            {status === 'error' && (
                              <span className="flex items-center gap-1 text-sm text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                Error
                              </span>
                            )}
                            {status === 'disconnected' && (
                              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Info className="h-4 w-4" />
                                Not connected
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTestConnection(provider.id)}
                              disabled={isConnecting}
                              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className={cn("h-4 w-4", isConnecting && "animate-spin")} />
                              Test
                            </button>
                            
                            {!isActive ? (
                              <button
                                onClick={() => setActiveProvider(provider.id)}
                                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
                              >
                                <Zap className="h-4 w-4" />
                                Activate
                              </button>
                            ) : (
                              <button
                                disabled
                                className="flex items-center gap-1.5 rounded-lg bg-green-500/20 px-3 py-1.5 text-sm text-green-600 cursor-default"
                              >
                                <Check className="h-4 w-4" />
                                Active
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Help Section */}
              <div className="mt-8 rounded-xl border border-border bg-secondary/30 p-4">
                <h4 className="flex items-center gap-2 font-semibold mb-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  Getting Started
                </h4>
                <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
                  <div>
                    <h5 className="font-medium text-foreground mb-1">Cloud Providers</h5>
                    <p>Get an API key from your provider's dashboard and paste it above. We recommend starting with OpenAI or Anthropic for the best experience.</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-foreground mb-1">Local Models</h5>
                    <p>Install <a href="https://ollama.ai" target="_blank" className="text-primary hover:underline">Ollama</a> or <a href="https://lmstudio.ai" target="_blank" className="text-primary hover:underline">LM Studio</a>, run a model locally, then connect here for private, offline AI.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <h3 className="mb-6 text-2xl font-bold">Profile Settings</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-4xl font-bold text-white shadow-lg">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <button className="absolute -bottom-2 -right-2 rounded-lg bg-secondary p-2 shadow-sm hover:bg-accent transition-colors">
                      <Palette className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold">{user?.name || 'User'}</h4>
                    <p className="text-muted-foreground">{user?.email}</p>
                    <button className="mt-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                      Change Avatar
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="max-w-2xl">
              <h3 className="mb-6 text-2xl font-bold">Appearance</h3>
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-medium">Theme</label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          'rounded-xl border-2 p-6 text-center transition-all hover:scale-105',
                          theme === t
                            ? 'border-primary bg-primary/10 shadow-md'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div className="mb-3 text-4xl">
                          {t === 'light' && '☀️'}
                          {t === 'dark' && '🌙'}
                          {t === 'system' && '💻'}
                        </div>
                        <div className="text-sm font-medium capitalize">{t}</div>
                        {theme === t && (
                          <div className="mt-2 flex justify-center">
                            <Check className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other tabs remain similar but enhanced */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <h3 className="mb-6 text-2xl font-bold">Notification Preferences</h3>
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-accent/50"
                  >
                    <div>
                      <div className="font-medium">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Receive notifications for {key.toLowerCase().replace(/([A-Z])/g, ' $1')}
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [key]: !value })}
                      className={cn(
                        'relative h-7 w-12 rounded-full transition-colors',
                        value ? 'bg-primary' : 'bg-secondary'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                          value && 'translate-x-5'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl">
              <h3 className="mb-6 text-2xl font-bold">Security</h3>
              <div className="space-y-4">
                <div className="rounded-xl border border-border p-6">
                  <h4 className="font-semibold mb-4">Change Password</h4>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current password"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                      Update Password
                    </button>
                  </div>
                </div>
                
                <div className="rounded-xl border border-border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <button className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="max-w-2xl">
              <h3 className="mb-6 text-2xl font-bold">API Keys</h3>
              <div className="rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">Personal API Key</h4>
                    <p className="text-sm text-muted-foreground">
                      Use this key to access the Soothsayer API
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-secondary p-4 font-mono text-sm">
                  {showApiKey['personal'] ? mockApiKey : '••••••••••••••••••••••••••••••••'}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setShowApiKey(prev => ({ ...prev, personal: !prev.personal }))}
                    className="rounded-lg bg-secondary px-4 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    {showApiKey['personal'] ? 'Hide' : 'Show'}
                  </button>
                  <button className="rounded-lg bg-secondary px-4 py-2 text-sm hover:bg-accent transition-colors">
                    Copy
                  </button>
                  <button className="rounded-lg bg-secondary px-4 py-2 text-sm hover:bg-accent transition-colors">
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="max-w-2xl">
              <h3 className="mb-6 text-2xl font-bold">Integrations</h3>
              <div className="space-y-4">
                {[
                  { name: 'GitHub', icon: '🐙', description: 'Connect repositories and sync code' },
                  { name: 'Slack', icon: '💬', description: 'Get notifications in Slack' },
                  { name: 'Jira', icon: '📋', description: 'Sync issues and projects' },
                  { name: 'Linear', icon: '📐', description: 'Connect your Linear workspace' },
                  { name: 'Notion', icon: '📝', description: 'Sync with Notion pages' },
                  { name: 'Discord', icon: '🎮', description: 'Bot integration for Discord' },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">
                        {integration.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold">{integration.name}</h4>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
