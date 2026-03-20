import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  Shield, 
  Play, 
  FileText, 
  Terminal, 
  ChevronDown, 
  ChevronRight,
  Info,
  ShieldAlert,
  ArrowRightCircle,
  FileCode,
  Download,
  Link as LinkIcon,
  Eye,
  FileSearch,
  CheckCircle,
  Activity,
  Timer
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { DaxStreamEvent } from '@/types/dax';
import { motion, AnimatePresence } from 'framer-motion';

interface RunTimelineProps {
  events: DaxStreamEvent[];
  activeApprovalId?: string | null;
  highlightedEventId?: string | null;
}

interface TimelineStepGroup {
  stepId: string;
  title: string;
  status: 'proposed' | 'running' | 'completed' | 'failed';
  events: DaxStreamEvent[];
  startTime?: string;
  endTime?: string;
  durationMs?: number;
}

export function RunTimeline({ events, activeApprovalId, highlightedEventId }: RunTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Group events by logical steps
  const groups = useMemo(() => {
    const result: (TimelineStepGroup | DaxStreamEvent)[] = [];
    let currentStep: TimelineStepGroup | null = null;

    events.forEach(event => {
      if (event.type === 'step.proposed' || event.type === 'step.started') {
        const stepId = (event.payload.stepId as string);
        if (!currentStep || currentStep.stepId !== stepId) {
          currentStep = {
            stepId,
            title: (event.payload.title as string) || 'Execution Step',
            status: event.type === 'step.proposed' ? 'proposed' : 'running',
            events: [event],
            startTime: event.timestamp
          };
          result.push(currentStep);
        } else {
          currentStep.events.push(event);
          if (event.type === 'step.started') currentStep.status = 'running';
        }
      } else if (event.type === 'step.completed' || event.type === 'step.failed') {
        const stepId = (event.payload.stepId as string);
        if (currentStep && currentStep.stepId === stepId) {
          currentStep.events.push(event);
          currentStep.status = event.type === 'step.completed' ? 'completed' : 'failed';
          currentStep.endTime = event.timestamp;
          currentStep.durationMs = (event.payload.durationMs as number);
          currentStep = null;
        } else {
          result.push(event);
        }
      } else if (currentStep) {
        currentStep.events.push(event);
      } else {
        result.push(event);
      }
    });

    return result;
  }, [events]);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (containerRef.current && !highlightedEventId) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events.length, highlightedEventId]);

  const exportAuditTrail = () => {
    const data = JSON.stringify(events, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dax-audit-trail-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-[2.5rem] border border-border bg-card shadow-apple-lg overflow-hidden flex flex-col h-full bg-background/50 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-8 py-6 bg-muted/20">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Execution Audit</h2>
            <p className="text-sm font-medium text-muted-foreground">
              Traceability and reasoning for all AI operations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportAuditTrail}
            className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-muted transition-all active:scale-95 shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Audit Trail
          </button>
          <div className="h-8 w-px bg-border mx-1" />
          <div className="rounded-full bg-background border border-border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground shadow-sm">
            {events.length} Signals
          </div>
        </div>
      </div>

      <div ref={containerRef} className="px-8 py-8 overflow-auto flex-1 scroll-smooth scrollbar-thin">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-700">
            <div className="rounded-[2rem] bg-muted/50 p-8 mb-6 shadow-inner ring-1 ring-border/50">
              <Clock className="h-12 w-12 text-muted-foreground/20 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-[0.2em]">Synchronizing Context</h3>
            <p className="text-[11px] font-medium text-muted-foreground max-w-[240px] mt-2 leading-relaxed">
              Establishing a secure connection with the execution authority...
            </p>
          </div>
        ) : (
          <div className="relative space-y-0 pb-10">
            {/* Vertical timeline line */}
            <div className="absolute left-[19px] top-4 bottom-10 w-[2px] bg-gradient-to-b from-border via-border/50 to-transparent" />
            
            {groups.map((item, index) => {
              const isGroup = 'stepId' in item;
              if (isGroup) {
                return (
                  <StepGroupItem 
                    key={item.stepId} 
                    group={item} 
                    activeApprovalId={activeApprovalId}
                    highlightedEventId={highlightedEventId}
                    isLast={index === groups.length - 1} 
                  />
                );
              } else {
                return (
                  <StandaloneEventItem 
                    key={item.eventId} 
                    event={item} 
                    isHighlighted={highlightedEventId === item.eventId}
                    isLast={index === groups.length - 1} 
                  />
                );
              }
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function StepGroupItem({ group, activeApprovalId, highlightedEventId, isLast }: { 
  group: TimelineStepGroup; 
  activeApprovalId?: string | null; 
  highlightedEventId?: string | null;
  isLast: boolean 
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const statusColor = {
    proposed: 'text-muted-foreground',
    running: 'text-primary',
    completed: 'text-emerald-500',
    failed: 'text-rose-500'
  }[group.status];

  const hasActiveApproval = group.events.some(e => 
    e.type === 'approval.requested' && (e.payload.approval as any)?.approvalId === activeApprovalId
  );

  const hasHighlightedEvent = group.events.some(e => e.eventId === highlightedEventId);

  useEffect(() => {
    if (hasHighlightedEvent) setIsExpanded(true);
  }, [hasHighlightedEvent]);

  return (
    <div className={`relative pl-12 pb-12 ${isLast ? 'pb-0' : ''}`}>
      <div className={cn(
        "absolute left-0 top-1.5 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-background border-2 border-border shadow-sm transition-all duration-700",
        group.status === 'running' && "border-primary ring-8 ring-primary/5 scale-110 shadow-lg shadow-primary/10",
        hasActiveApproval && "border-orange-500 ring-8 ring-orange-500/10 scale-110"
      )}>
        {group.status === 'completed' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> :
         group.status === 'failed' ? <AlertTriangle className="h-5 w-5 text-rose-500" /> :
         <Terminal className={cn("h-5 w-5", statusColor)} />}
      </div>

      <div className={cn(
        "card-professional overflow-hidden border-border/60 transition-all duration-500",
        hasActiveApproval ? "border-orange-500/30 shadow-lg shadow-orange-500/5 bg-orange-500/[0.01]" : 
        hasHighlightedEvent ? "border-primary/40 shadow-lg shadow-primary/5 ring-1 ring-primary/10" : "bg-background/40"
      )}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-8 py-5 hover:bg-muted/20 transition-all active:bg-muted/30"
        >
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Stage Trace</span>
              <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border", 
                group.status === 'completed' ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10" :
                group.status === 'failed' ? "bg-rose-500/5 text-rose-600 border-rose-500/10" :
                "bg-primary/5 text-primary border-primary/10"
              )}>
                {group.status}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground mt-1 group-hover:text-primary transition-colors">{group.title}</h3>
          </div>
          <div className="flex items-center gap-6">
            {group.durationMs && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
                <Timer className="h-3 w-3" />
                {group.durationMs}ms
              </div>
            )}
            <div className="rounded-full bg-secondary p-1">
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <div className="px-8 pb-8 space-y-8 divide-y divide-border/20">
              {group.events.map((event) => (
                <EventDetailItem 
                  key={event.eventId} 
                  event={event} 
                  isActive={Boolean(activeApprovalId && 
                    event.type === 'approval.requested' && 
                    (event.payload.approval as any)?.approvalId === activeApprovalId)}
                  isHighlighted={highlightedEventId === event.eventId}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StandaloneEventItem({ event, isHighlighted, isLast }: { event: DaxStreamEvent; isHighlighted: boolean; isLast: boolean }) {
  const info = mapEventToTimeline(event);
  if (!info) return null;

  return (
    <div className={cn(
      "relative pl-12 pb-12 transition-all duration-500",
      isLast ? "pb-0" : "",
      isHighlighted && "scale-[1.02]"
    )}>
      <div className={cn(
        "absolute left-0 top-1.5 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-background border-2 border-border shadow-sm",
        info.color,
        isHighlighted && "border-primary ring-8 ring-primary/5"
      )}>
        {info.icon}
      </div>
      <div className={cn(
        "flex flex-col pt-1 p-6 rounded-3xl border border-transparent transition-all",
        isHighlighted && "bg-primary/[0.02] border-primary/20 shadow-sm"
      )}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h4 className={cn("text-sm font-bold uppercase tracking-tight", isHighlighted ? "text-primary" : "text-foreground")}>{info.label}</h4>
            {info.badge && (
              <span className={cn("rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] border", info.badgeColor || 'bg-muted text-muted-foreground border-border/50')}>
                {info.badge}
              </span>
            )}
          </div>
          <time className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
            {formatDate(event.timestamp)}
          </time>
        </div>
        <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">
          {info.description}
        </p>
      </div>
    </div>
  );
}

function EventDetailItem({ event, isActive, isHighlighted }: { event: DaxStreamEvent; isActive: boolean; isHighlighted: boolean }) {
  const [isRawExpanded, setIsRawExpanded] = useState(false);
  const info = mapEventToTimeline(event);
  if (!info) return null;

  const artifactContent = event.type === 'artifact.created' ? ((event.payload as any).preview?.text || (event.payload as any).content || '') as string : '';
  const isCausalLink = event.type === 'approval.resolved';

  return (
    <div className={cn(
      "pt-8 first:pt-0 group transition-all duration-500",
      isActive && "animate-pulse",
      isHighlighted && "bg-primary/[0.02] -mx-4 px-4 rounded-2xl py-6"
    )}>
      <div className="flex items-start gap-6">
        <div className={cn(
          "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
          isActive ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-secondary text-muted-foreground/60 group-hover:bg-primary/5 group-hover:text-primary"
        )}>
          {info.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isActive ? "text-orange-600" : isHighlighted ? "text-primary" : "text-muted-foreground")}>
                {info.label}
              </span>
              {isCausalLink && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                  <ArrowRightCircle className="h-2.5 w-2.5" />
                  Authorization Chain
                </div>
              )}
            </div>
            <time className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest">
              {formatDate(event.timestamp)}
            </time>
          </div>
          
          <p className={cn(
            "mt-1.5 text-sm tracking-tight",
            isActive ? "text-foreground font-black" : "text-foreground font-bold"
          )}>
            {info.description}
          </p>

          {info.detail && (
            <div className={cn(
              "mt-4 text-[13px] font-mono rounded-2xl px-5 py-4 border transition-all leading-relaxed",
              isActive ? "bg-background border-orange-500/30 text-foreground shadow-lg ring-1 ring-orange-500/10" : "bg-muted/30 border-border/40 text-muted-foreground shadow-inner"
            )}>
              {info.detail}
            </div>
          )}

          {/* Snippet Preview for Artifacts */}
          {artifactContent && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.01] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCode className="h-4 w-4 text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600/70">Resource Snippet</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-indigo-500/5 px-2 py-1 border border-indigo-500/10">
                  <span className="text-[9px] font-bold text-indigo-600/80 uppercase">{event.payload.type as string}</span>
                </div>
              </div>
              <div className="relative group/snippet overflow-hidden rounded-xl border border-indigo-500/5 bg-[#0D0D0F]">
                <pre className="p-4 text-[11px] font-mono leading-relaxed text-indigo-300/80 max-h-40 overflow-hidden select-none">
                  {artifactContent.split('\n').slice(0, 10).join('\n')}
                  {artifactContent.split('\n').length > 10 ? '\n...' : ''}
                </pre>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0D0D0F]/80" />
                <button className="absolute bottom-3 right-3 rounded-lg bg-indigo-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg opacity-0 group-hover/snippet:opacity-100 transition-opacity">
                  Full Inspector
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <button 
              onClick={() => setIsRawExpanded(!isRawExpanded)}
              className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 hover:text-primary transition-colors active:scale-95"
            >
              <ChevronRight className={cn("h-3 w-3 transition-transform", isRawExpanded && "rotate-90 text-primary")} />
              Technical Signal
            </button>
            <div className="h-px flex-1 bg-border/20" />
          </div>

          <AnimatePresence>
            {isRawExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden rounded-[1.5rem] border border-border bg-muted/20"
              >
                <pre className="overflow-auto p-6 text-[10px] font-mono leading-relaxed text-muted-foreground/80 scrollbar-none">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function mapEventToTimeline(event: DaxStreamEvent) {
  const { type, payload } = event;

  switch (type) {
    case 'run.created':
      return {
        label: 'Initialize',
        description: (payload.title as string) || 'Execution container initialized.',
        icon: <Play className="h-4 w-4" />,
        color: 'text-primary',
        badge: 'Session'
      };
    
    case 'run.started':
      return {
        label: 'Establish',
        description: 'Authority has established control of the runtime environment.',
        icon: <ArrowRightCircle className="h-4 w-4" />,
        color: 'text-emerald-500',
        badge: 'Active Path',
        badgeColor: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10'
      };

    case 'run.state_changed': {
      const reason = payload.reason as string;
      if (reason === 'execution_active') return null;
      if (reason === 'approval_pending') {
        return {
          label: 'Suspension',
          description: 'Execution paused. Awaiting mandatory operator authorization.',
          icon: <ShieldAlert className="h-4 w-4" />,
          color: 'text-orange-500',
          badge: 'Gate Triggered',
          badgeColor: 'bg-orange-500/5 text-orange-600 border-orange-500/10'
        };
      }
      return {
        label: 'Context',
        description: `Runtime state transitioned to ${payload.currentStatus}.`,
        icon: <Info className="h-4 w-4" />,
        color: 'text-slate-500',
        detail: reason
      };
    }

    case 'step.proposed':
      return {
        label: 'Planning',
        description: 'Constructed an optimal execution sequence for the intent.',
        icon: <FileSearch className="h-4 w-4" />,
        color: 'text-primary',
        detail: (payload.title as string)
      };

    case 'step.started':
      return {
        label: 'Commit',
        description: `Executing action: ${payload.title}`,
        icon: <Terminal className="h-4 w-4" />,
        color: 'text-sky-500'
      };

    case 'step.completed':
      return {
        label: 'Validation',
        description: `Success achieved for action: ${payload.title}`,
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'text-emerald-500'
      };

    case 'step.failed':
      return {
        label: 'Exception',
        description: `Execution failure encountered: ${payload.title}`,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-rose-500',
        badge: 'Critical Fault',
        badgeColor: 'bg-rose-500/5 text-rose-600 border-rose-500/10'
      };

    case 'approval.requested': {
      const approval = (payload.approval || {}) as any;
      return {
        label: 'Governance Gate',
        description: `Authorization required: ${approval.type?.replace('_', ' ')}`,
        icon: <Shield className="h-4 w-4" />,
        color: 'text-orange-500',
        badge: approval.risk,
        badgeColor: approval.risk === 'high' ? 'bg-rose-500 text-white shadow-sm' : 'bg-orange-500 text-white shadow-sm',
        detail: `${approval.title}: ${approval.reason}`
      };
    }

    case 'approval.resolved': {
      const status = payload.status as string;
      const decision = payload.decision as string;
      const finalDecision = decision || status;
      const isApproved = finalDecision === 'approved' || finalDecision === 'approve';
      
      return {
        label: 'Authorization',
        description: `Action ${isApproved ? 'authorized' : 'denied'} by ${payload.source || 'operator'}.`,
        icon: isApproved ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />,
        color: isApproved ? 'text-emerald-500' : 'text-rose-500',
        badge: isApproved ? 'Authorized' : 'Rejected',
        badgeColor: isApproved ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
      };
    }

    case 'artifact.created':
      return {
        label: 'Artifact',
        description: (payload.title as string) || 'New resource generated by authority.',
        icon: <FileText className="h-4 w-4" />,
        color: 'text-indigo-500',
        badge: 'Resource',
        badgeColor: 'bg-indigo-500/5 text-indigo-600 border-indigo-500/10'
      };

    case 'run.completed':
      return {
        label: 'Conclusion',
        description: 'Target state achieved. Execution container released.',
        icon: <CheckCircle className="h-4 w-4 fill-current" />,
        color: 'text-emerald-500',
        badge: 'Nominal',
        badgeColor: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10'
      };

    case 'run.failed': {
      const error = (payload.error || {}) as any;
      return {
        label: 'Termination',
        description: error.message || 'Execution halted due to a terminal error.',
        icon: <AlertTriangle className="h-4 w-4 fill-current" />,
        color: 'text-rose-500',
        badge: 'Fault',
        badgeColor: 'bg-rose-500/5 text-rose-600 border-rose-500/10'
      };
    }

    default:
      return {
        label: type,
        description: 'System signal captured.',
        icon: <Circle className="h-4 w-4" />,
        color: 'text-muted-foreground'
      };
  }
}

function XCircle({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
