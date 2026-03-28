import { useState, useEffect } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Terminal,
  GitBranch,
  MessageSquare,
  Users,
};

export function AnalyticsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  const fetchMetrics = async () => {
    if (!currentWorkspace?.id) return;
    setIsLoading(true);
    try {
      const response = await apiHelpers.getAnalytics();
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
      toast.error('Failed to synchronize operator metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [currentWorkspace?.id]);

  const stats = [
    {
      label: 'Active Executions',
      value: metrics?.runCounts?.total || 0,
      icon: 'Terminal',
      trend: 'up',
      change: '+12%',
    },
    {
      label: 'Success Rate',
      value: `${Math.round(metrics?.runCounts?.successRate || 0)}%`,
      icon: 'GitBranch',
      trend: 'up',
      change: '+5%',
    },
    {
      label: 'Pending Approvals',
      value: metrics?.approvalMetrics?.pending || 0,
      icon: 'MessageSquare',
      trend: 'down',
      change: '-2',
    },
    {
      label: 'Avg Approval Time',
      value: `${metrics?.approvalMetrics?.avgApprovalDelayMinutes || 0}m`,
      icon: 'Users',
      trend: 'down',
      change: '-15%',
    },
  ];

  return (
    <div className="p-10 space-y-10 animate-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 text-label mb-1">
            <BarChart3 className="h-3 w-3" />
            Audit & Intelligence
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Operator Metrics</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchMetrics}
            disabled={isLoading}
            className="h-10 w-10 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted transition-all"
          >
            <RefreshCw className={cn("h-4 w-4 text-muted-content", isLoading && "animate-spin")} />
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="24h">Real-time (24h)</option>
            <option value="7d">Historical (7d)</option>
            <option value="30d">Aggregate (30d)</option>
          </select>
          <button className="flex h-10 items-center gap-2.5 rounded-xl bg-primary px-6 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all">
            <Download className="h-3.5 w-3.5" />
            Export Audit Trail
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const IconComponent = iconMap[stat.icon];
          return (
            <div key={stat.label} className="rounded-2xl border border-border/40 bg-card/30 p-6 hover-glow transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 text-primary">
                  {IconComponent && <IconComponent className="h-5 w-5" />}
                </div>
                <div className={cn(
                  'flex items-center gap-1 text-[10px] font-black uppercase tracking-widest',
                  stat.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
                )}>
                  {stat.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stat.change}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black tracking-tight">{stat.value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-2 pb-20">
        {/* Provider Distribution */}
        <div className="rounded-3xl border border-border/40 bg-card/20 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Inference Infrastructure</h3>
            <span className="text-[9px] font-bold text-emerald-600 uppercase bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">Active Load</span>
          </div>
          <div className="space-y-6">
            {Object.entries(metrics?.providerMetrics?.usage || {}).map(([name, count]: [string, any]) => {
              const total = metrics?.runCounts?.total || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={name} className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tight">
                    <span>{name}</span>
                    <span className="text-muted-foreground/60">{count} Calls ({percentage}%)</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted/20">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              );
            })}
            {!metrics?.providerMetrics?.usage && (
              <div className="py-10 text-center text-label-sm text-muted-foreground/40 italic">No historical traces found</div>
            )}
          </div>
        </div>

        {/* Blocked Reasons / Policy Violations */}
        <div className="rounded-3xl border border-border/40 bg-card/20 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Governance Violations</h3>
            <AlertCircle className="h-4 w-4 text-rose-500/40" />
          </div>
          <div className="space-y-4">
            {Object.entries(metrics?.blockedMetrics || {}).map(([reason, count]: [string, any]) => (
              <div
                key={reason}
                className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/5 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                  <span className="text-[11px] font-black uppercase tracking-tight">{reason}</span>
                </div>
                <span className="text-xs font-mono font-bold text-rose-600">{count}</span>
              </div>
            ))}
            {Object.keys(metrics?.blockedMetrics || {}).length === 0 && (
              <div className="py-10 text-center text-label-sm text-emerald-600/40 italic">System integrity nominal • 0 violations</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
