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

const RISK_WEIGHT = {
  critical: 100,
  high: 50,
  medium: 20,
  low: 0
};

export function ApprovalInbox({ approvals, runLink }: ApprovalInboxProps) {
  const [sortBy, setSortBy] = useState<SortField>('priority');
  const [filterSource, setFilterSource] = useState<string>('all');

  const filteredApprovals = useMemo(() => {
    return approvals.filter(a => filterSource === 'all' || a.sourceSurface === filterSource);
  }, [approvals, filterSource]);

  const sortedApprovals = useMemo(() => {
    return [...filteredApprovals].sort((a, b) => {
      if (sortBy === 'priority') {
        const scoreA = calculatePriority(a);
        const scoreB = calculatePriority(b);
        return scoreB - scoreA;
      }
      if (sortBy === 'risk') return RISK_WEIGHT[b.risk] - RISK_WEIGHT[a.risk];
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [filteredApprovals, sortBy]);

  return (
    <div className="flex flex-col gap-10">
      {/* Triage Dashboard */}
      <section className="p-8 rounded-2xl border border-border/40 bg-card/10 flex flex-wrap items-center justify-between gap-10 hover-glow">
        <div className="flex flex-wrap items-center gap-10">
          <div className="space-y-3">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Triage Protocol</span>
            <div className="flex gap-1 p-1 bg-muted/20 rounded-xl border border-border/40">
              {(['priority', 'risk', 'age'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={cn(
                    "px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    sortBy === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground/40 hover:text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1">Queue Depth</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black tracking-tighter">{filteredApprovals.length}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Intents</span>
          </div>
        </div>
      </section>

      {/* Vertical Stack - Focused */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedApprovals.map((approval) => (
          <ApprovalCard key={approval.approvalId} approval={approval} runLink={runLink} />
        ))}
      </div>
    </div>
  );
}

function ApprovalCard({ approval, runLink }: { approval: DaxPendingApprovalSummary; runLink: (a: any) => string }) {
  const age = differenceInMinutes(new Date(), new Date(approval.createdAt));
  
  return (
    <Link
      to={`${runLink(approval)}&highlight=${approval.approvalId}`}
      className="group block p-7 rounded-2xl border border-border/40 bg-card/20 hover-lift hover-glow transition-all duration-500"
    >
      <div className="flex flex-col h-full gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest">{approval.runId.substring(0, 12)}</span>
              <span className="h-1 w-1 rounded-full bg-border/40" />
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">{approval.sourceSurface}</span>
            </div>
            <h4 className="text-[15px] font-black tracking-tight text-foreground group-hover:text-primary transition-colors uppercase leading-none">{approval.title}</h4>
          </div>
          <div className={cn(
            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
            approval.risk === 'critical' || approval.risk === 'high' ? "bg-rose-500/5 text-rose-600 border-rose-500/10" : "bg-orange-500/5 text-orange-600 border-orange-500/10"
          )}>
            {approval.risk}
          </div>
        </div>

        <div className="rounded-xl bg-muted/10 p-5 border border-border/20 group-hover:bg-background/40 transition-all">
          <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed italic line-clamp-2">" {approval.reason} "</p>
        </div>

        <div className="mt-auto pt-6 border-t border-border/20 flex items-center justify-between">
          <div className={cn(
            "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors",
            age > 15 ? "text-rose-500" : age > 5 ? "text-orange-500" : "text-muted-foreground/40"
          )}>
            <Timer className="h-3 w-3" />
            {formatDistanceToNow(new Date(approval.createdAt))}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
            Review <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function calculatePriority(a: DaxPendingApprovalSummary): number {
  let score = RISK_WEIGHT[a.risk] || 0;
  const age = differenceInMinutes(new Date(), new Date(a.createdAt));
  if (age > 15) score += 30;
  else if (age > 5) score += 10;
  return score;
}
