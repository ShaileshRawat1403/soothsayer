import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { Bot, Activity, MessageSquare, Users, Settings, RefreshCw, Send } from 'lucide-react';

interface PicobotData {
  health: { status: string; uptime: string };
  channels: Array<{
    id: string;
    name: string;
    enabled: boolean;
    status: string;
    sessions: number;
    messagesToday: number;
  }>;
  stats: {
    totalSessions: number;
    activeSessions: number;
    messagesToday: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    channelType: string;
    timestamp: string;
  }>;
}

export function PicobotPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<PicobotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get('/picobot/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load Picobot data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSendMessage = async () => {
    if (!message.trim() || !data?.channels[0]) return;
    setSending(true);
    try {
      await api.post('/picobot/send',
        { channelId: 'telegram', message, userId: '1359822556' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('');
      await fetchData();
    } catch (err) {
      console.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Picobot</h1>
            <p className="text-sm text-muted-foreground">
              Multi-channel AI agent control center
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Bot className="h-5 w-5" />}
          label="Status"
          value={data?.health.status || 'Unknown'}
          sublabel={data?.health.uptime || ''}
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Active Sessions"
          value={data?.stats.activeSessions || 0}
          sublabel={`${data?.stats.totalSessions || 0} total`}
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Messages Today"
          value={data?.stats.messagesToday || 0}
          sublabel="across all channels"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Channels"
          value={data?.channels.filter(c => c.enabled).length || 0}
          sublabel={`${data?.channels.length || 0} configured`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Settings className="h-4 w-4" />
            Channel Status
          </h2>
          <div className="space-y-3">
            {data?.channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      channel.enabled && channel.status === 'connected'
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    )}
                  />
                  <div>
                    <p className="font-medium">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {channel.enabled ? channel.status : 'disabled'}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{channel.messagesToday}</p>
                  <p className="text-xs text-muted-foreground">messages</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Send className="h-4 w-4" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message to send via Telegram..."
              className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={4}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || sending}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {sending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Activity className="h-4 w-4" />
          Recent Activity
        </h2>
        {data?.recentActivity.length === 0 ? (
          <p className="text-center text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {data?.recentActivity.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-md border border-border p-3"
              >
                <div
                  className={cn(
                    'mt-0.5 rounded px-1.5 py-0.5 text-xs font-medium',
                    activity.type === 'message_received'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  )}
                >
                  {activity.type === 'message_received' ? 'IN' : 'OUT'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.channelType} • {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
      </div>
    </div>
  );
}
