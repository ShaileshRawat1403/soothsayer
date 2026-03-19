import { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ArrowUpRight, 
  Clock, 
  Folder,
  Hash,
  Cpu,
  Bot,
  Terminal,
  Zap,
  Filter,
  AlertCircle,
  Timer,
  Activity,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DaxPendingApprovalSummary } from '@/types/dax';

interface ApprovalInboxProps {
  approvals: DaxPendingApprovalSummary[];
  runLink: (approval: DaxPendingApprovalSummary) => string;
}

type SortField = 'priority' | 'risk' | 'age';
type GroupField = 'none' | 'repo' | 'risk';

const RISK_WEIGHT = {
  critical: 100,
  high: 50,
  medium: 20,
  low: 0
};

export function ApprovalInbox({ approvals, runLink }: ApprovalInboxProps) {
  const [sortBy, setSortBy] = useState<SortField>('priority');
  const [groupBy, setGroupBy] = useState<GroupField>('none');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  const sources = useMemo(() => {
    const s = new Set(approvals.map(a => a.sourceSurface));
    return ['all', ...Array.from(s)];
  }, [approvals]);

  const filteredApprovals = useMemo(() => {
    return approvals.filter(a => {
      const matchSource = filterSource === 'all' || a.sourceSurface === filterSource;
      const matchRisk = filterRisk === 'all' || a.risk === filterRisk;
      return matchSource && matchRisk;
    });
  }, [approvals, filterSource, filterRisk]);

  const sortedApprovals = useMemo(() => {
    return [...filteredApprovals].sort((a, b) => {
      if (sortBy === 'priority') {
        const scoreA = calculatePriority(a);
        const scoreB = calculatePriority(b);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'risk') {
        const weightA = RISK_WEIGHT[a.risk] || 0;
        const weightB = RISK_WEIGHT[b.risk] || 0;
        if (weightA !== weightB) return weightB - weightA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });
  }, [filteredApprovals, sortBy]);

  const groupedApprovals = useMemo(() => {
    if (groupBy === 'none') return { 'Priority Triage': sortedApprovals };

    return sortedApprovals.reduce((acc, approval) => {
      let key = 'Other';
      if (groupBy === 'repo') {
        key = approval.targeting?.repoPath || 'Default (cwd)';
      } else if (groupBy === 'risk') {
        key = `${approval.risk.toUpperCase()} RISK`;
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(approval);
      return acc;
    }, {} as Record<string, DaxPendingApprovalSummary[]>);
  }, [sortedApprovals, groupBy]);

  return (
    <div className="flex flex-col gap-10">
      {/* Triage Controls */}
      <section className="card-professional p-8 bg-muted/[0.03] border-border/60">
        <div className="flex flex-wrap items-end justify-between gap-10">
          <div className="flex flex-wrap items-center gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 flex items-center gap-2">
                <Activity className="h-3 w-3" />
                Triage Order
              </label>
              <div className="flex bg-background border border-border rounded-2xl p-1 shadow-sm">
                {(['priority', 'risk', 'age'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={cn(
                      "px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                      sortBy === s ? "bg-primary text-primary-foreground shadow-apple" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 flex items-center gap-2">
                <Filter className="h-3 w-3" />
                Origin Surface
              </label>
              <div className="flex bg-background border border-border rounded-2xl p-1 shadow-sm overflow-x-auto scrollbar-none max-w-[280px]">
                {sources.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSource(s)}
                    className={cn(
                      "px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all whitespace-nowrap",
                      filterSource === s ? "bg-primary text-primary-foreground shadow-apple" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 flex items-center gap-2">
                <ShieldCheck className="h-3 w-3" />
                Risk Grade
              </label>
              <div className="flex bg-background border border-border rounded-2xl p-1 shadow-sm">
                {['all', 'critical', 'high', 'medium', 'low'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRisk(r)}
                    className={cn(
                      "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                      filterRisk === r ? "bg-primary text-primary-foreground shadow-apple" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r === 'all' ? 'Any' : r.charAt(0)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end pb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Queue Depth</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tighter text-foreground">{filteredApprovals.length}</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Items</span>
            </div>
          </div>
        </div>
      </section>

      {/* Grouped Approval List */}
      <div className="space-y-16">
        {Object.entries(groupedApprovals).map(([groupName, items]) => (
          <div key={groupName} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-4 px-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent lg:hidden" />
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,0,0,0.2)]" />
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/80">{groupName}</h3>
                <span className="rounded-full bg-primary/5 border border-primary/10 px-3 py-0.5 text-[10px] font-black text-primary shadow-sm">{items.length}</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-border via-border to-transparent" />
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {items.map((approval) => (
                <ApprovalCard 
                  key={approval.approvalId} 
                  approval={approval} 
                  runLink={runLink} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalCard({ approval, runLink }: { approval: DaxPendingApprovalSummary; runLink: (a: DaxPendingApprovalSummary) => string }) {
  const ageInMinutes = differenceInMinutes(new Date(), new Date(approval.createdAt));
  
  const agingStatus = useMemo(() => {
    if (ageInMinutes > 15) return 'critical';
    if (ageInMinutes > 5) return 'warning';
    return 'normal';
  }, [ageInMinutes]);

  const agingClasses = {
    normal: 'bg-muted/50 text-muted-foreground border-border/50',
    warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20 animate-pulse',
    critical: 'bg-rose-500/10 text-rose-700 border-rose-500/20 animate-pulse duration-700'
  }[agingStatus];

  return (
    <Link
      to={`${runLink(approval)}&highlight=${approval.approvalId}`}
      className="group block card-professional overflow-hidden hover:border-primary/40 hover:shadow-apple-lg transition-all duration-500 hover:-translate-y-1 bg-background"
    >
      <div className="p-8 flex flex-col h-full relative">
        {/* Background Hint for Stale Items */}
        {agingStatus !== 'normal' && (
          <div className={cn(
            "absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.05]",
            agingStatus === 'warning' ? "bg-amber-500" : "bg-rose-500"
          )} />
        )}

        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex flex-col min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                {approval.runId.substring(0, 12)}
              </span>
              <span className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                approval.sourceSurface === 'chat' ? "bg-blue-500/5 text-blue-600 border-blue-500/10" :
                approval.sourceSurface === 'workflow' ? "bg-purple-500/5 text-purple-600 border-purple-500/10" :
                "bg-orange-500/5 text-orange-600 border-orange-500/10"
              )}>
                {approval.sourceSurface === 'chat' ? <Bot className="h-2 w-2" /> : 
                 approval.sourceSurface === 'workflow' ? <Zap className="h-2 w-2" /> : 
                 <Terminal className="h-2 w-2" />}
                {approval.sourceSurface}
              </span>
            </div>
            <h4 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors tracking-tight">
              {approval.title}
            </h4>
          </div>
          
          <div className={cn(
            "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm",
            approval.risk === 'critical' || approval.risk === 'high' 
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-orange-500 text-white border-orange-500'
          )}>
            {approval.risk}
          </div>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-secondary p-2 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{approval.type.replace('_', ' ')}</span>
          </div>
          
          <div className="bg-muted/30 rounded-2xl p-4 border border-border/40 group-hover:bg-background group-hover:border-primary/10 transition-all">
            <p className="text-xs font-medium text-muted-foreground line-clamp-2 leading-relaxed italic">
              " {approval.reason} "
            </p>
          </div>

          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-1">
              <Folder className="h-3 w-3" />
              <span className="truncate">{approval.targeting?.repoPath || 'Instance CWD'}</span>
            </div>
            
            <div className="flex items-center gap-2 px-1">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/80">Blocking Execution</span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/50 flex items-center justify-between">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-colors",
            agingClasses
          )}>
            <Timer className="h-3.5 w-3.5" />
            {formatDistanceToNow(new Date(approval.createdAt))} Pending
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
            Authorize <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function calculatePriority(a: DaxPendingApprovalSummary): number {
  let score = RISK_WEIGHT[a.risk] || 0;
  const ageInMinutes = differenceInMinutes(new Date(), new Date(a.createdAt));
  
  // Aging bonus
  if (ageInMinutes > 15) score += 30;
  else if (ageInMinutes > 5) score += 10;
  
  return score;
}
