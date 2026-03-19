import { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ArrowUpRight, 
  Filter, 
  LayoutGrid, 
  List, 
  Clock, 
  ChevronDown, 
  Folder,
  Hash,
  Cpu,
  Bot,
  Terminal,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DaxPendingApprovalSummary } from '@/types/dax';

interface ApprovalInboxProps {
  approvals: DaxPendingApprovalSummary[];
  runLink: (approval: DaxPendingApprovalSummary) => string;
}

type SortField = 'risk' | 'age';
type GroupField = 'none' | 'repo' | 'runId';

const RISK_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export function ApprovalInbox({ approvals, runLink }: ApprovalInboxProps) {
  const [sortBy, setSortBy] = useState<SortField>('risk');
  const [groupBy, setGroupBy] = useState<GroupField>('none');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');

  const sources = useMemo(() => {
    const s = new Set(approvals.map(a => a.sourceSurface));
    return ['all', ...Array.from(s)];
  }, [approvals]);

  // For now, since provider might be missing in pending approvals summary, 
  // we'll assume a placeholder list or try to extract it.
  // In V2, we added targeting info, but provider info might need another backend pass.
  // Let's stick to sources for now or assume common ones.
  const providers = ['all', 'openai', 'google', 'anthropic'];

  const filteredApprovals = useMemo(() => {
    return approvals.filter(a => {
      const matchSource = filterSource === 'all' || a.sourceSurface === filterSource;
      // Note: filterProvider is a placeholder until we have provider info in summary
      return matchSource;
    });
  }, [approvals, filterSource]);

  const sortedApprovals = useMemo(() => {
    return [...filteredApprovals].sort((a, b) => {
      if (sortBy === 'risk') {
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
    if (groupBy === 'none') return { 'All Actionable': sortedApprovals };

    return sortedApprovals.reduce((acc, approval) => {
      const key = groupBy === 'repo' 
        ? (approval.targeting?.repoPath || 'Default (cwd)')
        : `Run: ${approval.runId.substring(0, 12)}...`;
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(approval);
      return acc;
    }, {} as Record<string, DaxPendingApprovalSummary[]>);
  }, [sortedApprovals, groupBy]);

  return (
    <div className="flex flex-col gap-8">
      {/* Controls Panel */}
      <div className="flex flex-col gap-6 bg-muted/20 p-6 rounded-[2rem] border border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Sort Path</span>
              <div className="flex bg-background border border-border rounded-xl p-1 shadow-sm">
                {(['risk', 'age'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={cn(
                      "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                      sortBy === s ? "bg-primary text-primary-foreground shadow-apple" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Group By</span>
              <div className="flex bg-background border border-border rounded-xl p-1 shadow-sm">
                {(['none', 'repo', 'runId'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroupBy(g)}
                    className={cn(
                      "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                      groupBy === g ? "bg-primary text-primary-foreground shadow-apple" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Source Filter</span>
              <div className="flex bg-background border border-border rounded-xl p-1 shadow-sm overflow-x-auto scrollbar-none max-w-[300px]">
                {sources.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSource(s)}
                    className={cn(
                      "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap",
                      filterSource === s ? "bg-primary text-primary-foreground shadow-apple" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Live Attention</div>
            <div className="text-2xl font-bold tracking-tight text-foreground">{filteredApprovals.length}</div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-12">
        {Object.entries(groupedApprovals).map(([groupName, items]) => (
          <div key={groupName} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {groupBy !== 'none' && (
              <div className="flex items-center gap-3 px-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">{groupName}</h3>
                <span className="rounded-full bg-primary/5 border border-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">{items.length}</span>
              </div>
            )}
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((approval) => (
                <Link
                  key={approval.approvalId}
                  to={`${runLink(approval)}&highlight=${approval.approvalId}`}
                  className="group block card-professional overflow-hidden hover:border-primary/30 hover:shadow-apple-lg transition-all duration-300"
                >
                  <div className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                            Run: {approval.runId.substring(0, 8)}
                          </span>
                          <span className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border",
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
                        <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors tracking-tight">
                          {approval.title}
                        </h4>
                      </div>
                      <div className={cn(
                        "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] border",
                        approval.risk === 'critical' || approval.risk === 'high' 
                          ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20'
                          : 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20'
                      )}>
                        {approval.risk}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-secondary p-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{approval.type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground line-clamp-2 leading-relaxed italic border-l-2 border-border pl-3">
                        {approval.reason}
                      </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
                        {formatDistanceToNow(new Date(approval.createdAt))} ago
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        Review <ArrowUpRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
