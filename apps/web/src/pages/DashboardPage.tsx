import { useAuthStore } from '@/stores/auth.store';
import { usePersonaStore } from '@/stores/persona.store';
import {
  MessageSquare,
  Terminal,
  GitBranch,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const quickActions = [
  { icon: MessageSquare, label: 'New Chat', path: '/chat', color: 'bg-blue-500' },
  { icon: Terminal, label: 'Run Command', path: '/terminal', color: 'bg-emerald-500' },
  { icon: GitBranch, label: 'Create Workflow', path: '/workflows', color: 'bg-purple-500' },
  { icon: Users, label: 'Switch Persona', path: '/personas', color: 'bg-amber-500' },
];

const recentActivities = [
  { type: 'chat', title: 'Code review conversation', time: '2 min ago', status: 'completed' },
  { type: 'command', title: 'npm audit fix', time: '15 min ago', status: 'completed' },
  { type: 'workflow', title: 'Deploy to staging', time: '1 hour ago', status: 'running' },
  { type: 'chat', title: 'API design discussion', time: '3 hours ago', status: 'completed' },
  { type: 'command', title: 'Database migration', time: '5 hours ago', status: 'failed' },
];

const stats = [
  { label: 'Commands Run', value: '128', change: '+12%', icon: Terminal },
  { label: 'Workflows', value: '24', change: '+8%', icon: GitBranch },
  { label: 'Conversations', value: '56', change: '+24%', icon: MessageSquare },
  { label: 'Success Rate', value: '94%', change: '+2%', icon: TrendingUp },
];

export function DashboardPage() {
  const { user } = useAuthStore();
  const { currentPersona } = usePersonaStore();

  return (
    <div className="p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}!
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here's what's happening in your workspace today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary hover:shadow-md"
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-110',
                  action.color
                )}
              >
                <action.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <stat.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-green-500">{stat.change}</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Persona */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Persona</h2>
            <Link
              to="/personas"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Change <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {currentPersona ? (
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                {currentPersona.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{currentPersona.name}</h3>
                <p className="text-sm text-muted-foreground">{currentPersona.category}</p>
                <p className="mt-2 text-sm">{currentPersona.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {currentPersona.capabilities.slice(0, 3).map((cap) => (
                    <span
                      key={cap}
                      className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No persona selected</p>
              <Link
                to="/personas"
                className="mt-2 text-sm text-primary hover:underline"
              >
                Select a persona
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link
              to="/analytics"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    activity.status === 'completed' && 'bg-green-100 text-green-600 dark:bg-green-900/30',
                    activity.status === 'running' && 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
                    activity.status === 'failed' && 'bg-red-100 text-red-600 dark:bg-red-900/30'
                  )}
                >
                  {activity.status === 'completed' && <CheckCircle className="h-4 w-4" />}
                  {activity.status === 'running' && <Clock className="h-4 w-4 animate-pulse" />}
                  {activity.status === 'failed' && <AlertCircle className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
