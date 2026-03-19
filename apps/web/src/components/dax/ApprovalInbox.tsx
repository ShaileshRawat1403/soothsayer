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
  Hash
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
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

  const sortedApprovals = useMemo(() => {
    return [...approvals].sort((a, b) => {
      if (sortBy === 'risk') {
        const weightA = RISK_WEIGHT[a.risk] || 0;
        const weightB = RISK_WEIGHT[b.risk] || 0;
        if (weightA !== weightB) return weightB - weightA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });
  }, [approvals, sortBy]);

  const groupedApprovals = useMemo(() => {
    if (groupBy === 'none') return { 'All Pending': sortedApprovals };

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
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sort by</span>
            <div className="flex bg-background border border-border rounded-lg p-0.5">
              <button
                onClick={() => setSortBy('risk')}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  sortBy === 'risk' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Risk
              </button>
              <button
                onClick={() => setSortBy('age')}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  sortBy === 'age' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Age
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Group by</span>
            <div className="flex bg-background border border-border rounded-lg p-0.5">
              {(['none', 'repo', 'runId'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                    groupBy === g ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {approvals.length} Actionable Items
        </div>
      </div>

      {/* List */}
      <div className="space-y-10">
        {Object.entries(groupedApprovals).map(([groupName, items]) => (
          <div key={groupName} className="space-y-4">
            {groupBy !== 'none' && (
              <div className="flex items-center gap-2 px-2">
                {groupBy === 'repo' ? <Folder className="h-3.5 w-3.5 text-primary/60" /> : <Hash className="h-3.5 w-3.5 text-primary/60" />}
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">{groupName}</h3>
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{items.length}</span>
              </div>
            )}
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((approval) => (
                <Link
                  key={approval.approvalId}
                  to={`${runLink(approval)}&highlight=${approval.approvalId}`}
                  className="group block card-professional overflow-hidden hover:border-primary/30 hover:shadow-apple-lg transition-all"
                >
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono text-[10px] text-muted-foreground mb-1">
                          {approval.runId.substring(0, 12)}
                        </span>
                        <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {approval.title}
                        </h4>
                      </div>
                      <div className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border ${
                        approval.risk === 'critical' || approval.risk === 'high' 
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                          : 'bg-orange-500/10 border-orange-500/20 text-orange-600'
                      }`}>
                        {approval.risk}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <ShieldAlert className="h-3 w-3" />
                        <span className="font-medium uppercase tracking-wider">{approval.type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {approval.reason}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(approval.createdAt))} ago
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Resolve <ArrowUpRight className="h-3 w-3" />
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
