import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/components/common/ThemeProvider';
import { cn } from '@/lib/utils';
import {
  User,
  Bell,
  Shield,
  Palette,
  Key,
  Globe,
  Database,
  Webhook,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

const tabs = [
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
  const [activeTab, setActiveTab] = useState('profile');
  const [showApiKey, setShowApiKey] = useState(false);

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

  const mockApiKey = 'sk-soothsayer-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 border-r border-border bg-card">
        <div className="p-4">
          <h2 className="font-semibold">Settings</h2>
        </div>
        <nav className="space-y-1 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'profile' && (
          <div className="max-w-2xl">
            <h3 className="mb-6 text-xl font-semibold">Profile Settings</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <button className="rounded-md bg-secondary px-4 py-2 text-sm hover:bg-secondary/80">
                    Change Avatar
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, GIF or PNG. Max size 2MB.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, name: e.target.value })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Timezone
                  </label>
                  <select
                    value={profileForm.timezone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, timezone: e.target.value })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Language
                  </label>
                  <select
                    value={profileForm.language}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, language: e.target.value })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="max-w-2xl">
            <h3 className="mb-6 text-xl font-semibold">Notification Preferences</h3>
            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
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
                    onClick={() =>
                      setNotifications({ ...notifications, [key]: !value })
                    }
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      value ? 'bg-primary' : 'bg-secondary'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                        value && 'translate-x-5'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="max-w-2xl">
            <h3 className="mb-6 text-xl font-semibold">Appearance</h3>
            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-medium">Theme</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        'rounded-lg border-2 p-4 text-center transition-colors',
                        theme === t
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="mb-2 text-2xl">
                        {t === 'light' && '☀️'}
                        {t === 'dark' && '🌙'}
                        {t === 'system' && '💻'}
                      </div>
                      <div className="text-sm font-medium capitalize">{t}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="max-w-2xl">
            <h3 className="mb-6 text-xl font-semibold">API Keys</h3>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Personal API Key</div>
                    <div className="text-sm text-muted-foreground">
                      Use this key to access the Soothsayer API
                    </div>
                  </div>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="mt-3">
                  <code className="block rounded-md bg-secondary p-3 font-mono text-sm">
                    {showApiKey ? mockApiKey : '••••••••••••••••••••••••••••••••'}
                  </code>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80">
                    Copy
                  </button>
                  <button className="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80">
                    Regenerate
                  </button>
                </div>
              </div>
              <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                <Key className="h-4 w-4" />
                Create New API Key
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="max-w-2xl">
            <h3 className="mb-6 text-xl font-semibold">Security</h3>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <div className="font-medium">Change Password</div>
                <div className="mt-3 space-y-3">
                  <input
                    type="password"
                    placeholder="Current password"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
                <button className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Update Password
                </button>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Two-Factor Authentication</div>
                    <div className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </div>
                  </div>
                  <button className="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80">
                    Enable
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="max-w-2xl">
            <h3 className="mb-6 text-xl font-semibold">Integrations</h3>
            <div className="space-y-4">
              {['GitHub', 'Slack', 'Jira', 'Linear'].map((integration) => (
                <div
                  key={integration}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{integration}</div>
                      <div className="text-sm text-muted-foreground">
                        Not connected
                      </div>
                    </div>
                  </div>
                  <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                    Connect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
