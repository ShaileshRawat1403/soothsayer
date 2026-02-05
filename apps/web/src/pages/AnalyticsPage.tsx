import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Terminal,
  GitBranch,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Download,
  Filter,
} from 'lucide-react';

const stats = [
  {
    label: 'Total Commands',
    value: '2,847',
    change: '+12.5%',
    trend: 'up',
    icon: Terminal,
  },
  {
    label: 'Workflow Runs',
    value: '456',
    change: '+8.2%',
    trend: 'up',
    icon: GitBranch,
  },
  {
    label: 'Chat Conversations',
    value: '1,234',
    change: '+24.1%',
    trend: 'up',
    icon: MessageSquare,
  },
  {
    label: 'Active Users',
    value: '89',
    change: '-2.3%',
    trend: 'down',
    icon: Users,
  },
];

const recentAuditLogs = [
  {
    id: '1',
    action: 'command.execute',
    user: 'alice@company.com',
    resource: 'npm audit fix',
    status: 'success',
    timestamp: '2024-01-15T10:30:00Z',
    riskLevel: 'medium',
  },
  {
    id: '2',
    action: 'workflow.run',
    user: 'bob@company.com',
    resource: 'Release Checklist',
    status: 'success',
    timestamp: '2024-01-15T10:25:00Z',
    riskLevel: 'low',
  },
  {
    id: '3',
    action: 'persona.switch',
    user: 'alice@company.com',
    resource: 'Security Engineer',
    status: 'success',
    timestamp: '2024-01-15T10:20:00Z',
    riskLevel: 'low',
  },
  {
    id: '4',
    action: 'command.execute',
    user: 'charlie@company.com',
    resource: 'rm -rf node_modules',
    status: 'blocked',
    timestamp: '2024-01-15T10:15:00Z',
    riskLevel: 'high',
  },
  {
    id: '5',
    action: 'approval.request',
    user: 'bob@company.com',
    resource: 'Production Deploy',
    status: 'pending',
    timestamp: '2024-01-15T10:10:00Z',
    riskLevel: 'critical',
  },
];

const personaUsage = [
  { name: 'Staff SWE', usage: 35, color: 'bg-blue-500' },
  { name: 'Backend Dev', usage: 25, color: 'bg-emerald-500' },
  { name: 'DevOps', usage: 20, color: 'bg-orange-500' },
  { name: 'Product Manager', usage: 12, color: 'bg-purple-500' },
  { name: 'Security Engineer', usage: 8, color: 'bg-red-500' },
];

const toolUsage = [
  { name: 'Code Generator', calls: 1245, avgLatency: '1.2s' },
  { name: 'SQL Assistant', calls: 892, avgLatency: '0.8s' },
  { name: 'Log Analyzer', calls: 654, avgLatency: '2.1s' },
  { name: 'API Validator', calls: 432, avgLatency: '0.5s' },
  { name: 'Test Generator', calls: 321, avgLatency: '1.8s' },
];

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [auditFilter, setAuditFilter] = useState('all');

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Audit</h1>
          <p className="text-muted-foreground">
            Monitor usage, performance, and security across your workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="flex h-9 items-center gap-2 rounded-md border border-input px-4 text-sm hover:bg-accent">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  stat.trend === 'up'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/30'
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                )}
              >
                {stat.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {stat.change}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Persona Usage */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Persona Usage</h3>
          <div className="space-y-4">
            {personaUsage.map((persona) => (
              <div key={persona.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{persona.name}</span>
                  <span className="text-muted-foreground">{persona.usage}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn('h-full rounded-full', persona.color)}
                    style={{ width: `${persona.usage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tool Performance */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Tool Performance</h3>
          <div className="space-y-3">
            {toolUsage.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <div className="font-medium">{tool.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {tool.calls.toLocaleString()} calls
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{tool.avgLatency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="mt-6 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-lg font-semibold">Audit Logs</h3>
          <div className="flex items-center gap-2">
            <select
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Actions</option>
              <option value="command">Commands</option>
              <option value="workflow">Workflows</option>
              <option value="approval">Approvals</option>
            </select>
            <button className="flex h-8 items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-accent">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Resource</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Risk</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentAuditLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border hover:bg-accent/50"
                >
                  <td className="px-4 py-3 text-sm">
                    <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                      {log.action}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm">{log.user}</td>
                  <td className="px-4 py-3 text-sm font-medium">{log.resource}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                        log.status === 'success' &&
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        log.status === 'blocked' &&
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        log.status === 'pending' &&
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      )}
                    >
                      {log.status === 'success' && <CheckCircle className="h-3 w-3" />}
                      {log.status === 'blocked' && <AlertCircle className="h-3 w-3" />}
                      {log.status === 'pending' && <Clock className="h-3 w-3" />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        log.riskLevel === 'low' && 'bg-green-100 text-green-700',
                        log.riskLevel === 'medium' && 'bg-amber-100 text-amber-700',
                        log.riskLevel === 'high' && 'bg-orange-100 text-orange-700',
                        log.riskLevel === 'critical' && 'bg-red-100 text-red-700'
                      )}
                    >
                      {log.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatTimestamp(log.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border p-4">
          <span className="text-sm text-muted-foreground">
            Showing 5 of 1,234 entries
          </span>
          <div className="flex items-center gap-2">
            <button className="h-8 rounded-md border border-input px-3 text-sm hover:bg-accent">
              Previous
            </button>
            <button className="h-8 rounded-md border border-input px-3 text-sm hover:bg-accent">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
