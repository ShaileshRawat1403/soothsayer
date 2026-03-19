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
  FileCode
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { formatDate } from '@/lib/utils';
import type { DaxStreamEvent } from '@/types/dax';

interface RunTimelineProps {
  events: DaxStreamEvent[];
  activeApprovalId?: string | null;
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

export function RunTimeline({ events, activeApprovalId }: RunTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Group events by logical steps
  const groups = useMemo(() => {
    const result: (TimelineStepGroup | DaxStreamEvent)[] = [];
    let currentStep: TimelineStepGroup | null = null;

    events.forEach(event => {
      // Logic to start/end groups based on step events
      if (event.type === 'step.proposed' || event.type === 'step.started') {
        const stepId = (event.payload.stepId as string);
        
        // If it's a new step, start a group
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
          currentStep = null; // Close the group
        } else {
          result.push(event);
        }
      } else if (currentStep) {
        // Associate general events with the current active step
        currentStep.events.push(event);
      } else {
        // Standalone run-level events
        result.push(event);
      }
    });

    return result;
  }, [events]);

  return (
    <section className="rounded-[2.5rem] border border-border bg-card shadow-apple-lg overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-8 py-6 bg-muted/20">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Execution Timeline</h2>
          <p className="text-sm font-medium text-muted-foreground">
            Structured audit of the AI execution path.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-background border border-border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            {events.length} Signal{events.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="px-8 py-8 overflow-auto flex-1 scroll-smooth">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-3xl bg-muted/50 p-6 mb-6">
              <Clock className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Waiting for Authority</h3>
            <p className="text-xs text-muted-foreground max-w-[200px] mt-1 font-medium">
              Synchronizing execution context...
            </p>
          </div>
        ) : (
          <div className="relative space-y-0 pb-10">
            {/* Vertical timeline line */}
            <div className="absolute left-[19px] top-4 bottom-10 w-[2px] bg-gradient-to-b from-border via-border to-transparent" />
            
            {groups.map((item, index) => {
              const isGroup = 'stepId' in item;
              if (isGroup) {
                return (
                  <StepGroupItem 
                    key={item.stepId} 
                    group={item} 
                    activeApprovalId={activeApprovalId}
                    isLast={index === groups.length - 1} 
                  />
                );
              } else {
                return (
                  <StandaloneEventItem 
                    key={item.eventId} 
                    event={item} 
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

function StepGroupItem({ group, activeApprovalId, isLast }: { group: TimelineStepGroup; activeApprovalId?: string | null; isLast: boolean }) {
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

  return (
    <div className={`relative pl-12 pb-10 ${isLast ? 'pb-0' : ''}`}>
      {/* Group Icon */}
      <div className={`absolute left-0 top-1.5 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-card border-2 border-border shadow-sm transition-all duration-500 ${
        group.status === 'running' ? 'border-primary ring-4 ring-primary/10 scale-110' : ''
      } ${hasActiveApproval ? 'border-orange-500 ring-4 ring-orange-500/10' : ''}`}>
        <Terminal className={`h-5 w-5 ${statusColor}`} />
      </div>

      <div className={`card-professional overflow-hidden border-border/60 ${hasActiveApproval ? 'border-orange-500/30 bg-orange-500/[0.01]' : ''}`}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 bg-muted/10 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Step</span>
                <span className={`text-xs font-bold uppercase tracking-widest ${statusColor}`}>
                  {group.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-foreground mt-0.5">{group.title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {group.durationMs && (
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {group.durationMs}ms
              </span>
            )}
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {isExpanded && (
          <div className="p-6 space-y-6 divide-y divide-border/30">
            {group.events.map((event) => (
              <EventDetailItem 
                key={event.eventId} 
                event={event} 
                isActive={Boolean(activeApprovalId && 
                  event.type === 'approval.requested' && 
                  (event.payload.approval as any)?.approvalId === activeApprovalId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StandaloneEventItem({ event, isLast }: { event: DaxStreamEvent; isLast: boolean }) {
  const info = mapEventToTimeline(event);
  if (!info) return null;

  return (
    <div className={`relative pl-12 pb-10 ${isLast ? 'pb-0' : ''}`}>
      <div className={`absolute left-0 top-1.5 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-card border-2 border-border shadow-sm ${info.color}`}>
        {info.icon}
      </div>
      <div className="flex flex-col pt-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-bold text-foreground">{info.label}</h4>
            {info.badge && (
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${info.badgeColor || 'bg-muted text-muted-foreground'}`}>
                {info.badge}
              </span>
            )}
          </div>
          <time className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {formatDate(event.timestamp)}
          </time>
        </div>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground leading-relaxed">
          {info.description}
        </p>
      </div>
    </div>
  );
}

function EventDetailItem({ event, isActive }: { event: DaxStreamEvent; isActive: boolean }) {
  const [isRawExpanded, setIsRawExpanded] = useState(false);
  const info = mapEventToTimeline(event);
  if (!info) return null;

  // Artifact insight specific handling
  const artifactInsight = event.type === 'artifact.created' && (event.payload.type === 'file' || event.payload.type === 'patch') ? {
    path: (event.payload.path as string),
    title: (event.payload.title as string)
  } : null;

  return (
    <div className={`pt-6 first:pt-0 group ${isActive ? 'animate-pulse' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`mt-1 flex h-6 w-6 items-center justify-center rounded-lg bg-muted/50 ${info.color}`}>
          {info.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-primary' : 'text-foreground'}`}>
                {info.label}
              </span>
              {isActive && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </div>
            <time className="text-[9px] font-bold text-muted-foreground uppercase">
              {formatDate(event.timestamp)}
            </time>
          </div>
          
          <p className={`mt-1 text-sm ${isActive ? 'text-foreground font-bold' : 'text-muted-foreground font-medium'}`}>
            {info.description}
          </p>

          {info.detail && (
            <div className={`mt-3 text-[12px] font-mono rounded-xl px-4 py-3 border transition-all ${
              isActive ? 'bg-background border-primary/30 text-foreground shadow-sm' : 'bg-muted/30 border-border/50 text-muted-foreground'
            }`}>
              {info.detail}
            </div>
          )}

          {/* Artifact Insight */}
          {artifactInsight && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-indigo-500/10 bg-indigo-500/[0.02] px-4 py-3">
              <FileCode className="h-4 w-4 text-indigo-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600/70">Resource Generated</span>
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 truncate max-w-md">
                  {artifactInsight.path || artifactInsight.title}
                </span>
              </div>
            </div>
          )}

          <button 
            onClick={() => setIsRawExpanded(!isRawExpanded)}
            className="mt-4 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            {isRawExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Signal Data
          </button>

          {isRawExpanded && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-muted/20">
              <pre className="overflow-auto p-5 text-[10px] font-mono leading-relaxed text-muted-foreground">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          )}
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
        label: 'Handoff',
        description: 'Authority has established control of the runtime.',
        icon: <ArrowRightCircle className="h-4 w-4" />,
        color: 'text-emerald-500',
        badge: 'Active',
        badgeColor: 'bg-emerald-500/10 text-emerald-600'
      };

    case 'run.state_changed': {
      const reason = payload.reason as string;
      if (reason === 'execution_active') return null;
      if (reason === 'approval_pending') {
        return {
          label: 'Interruption',
          description: 'Execution paused for manual authorization.',
          icon: <ShieldAlert className="h-4 w-4" />,
          color: 'text-orange-500',
          detail: 'Human-in-the-loop policy triggered'
        };
      }
      return {
        label: 'Status',
        description: `Runtime transitioned to ${payload.currentStatus}.`,
        icon: <Info className="h-4 w-4" />,
        color: 'text-slate-500',
        detail: reason
      };
    }

    case 'step.proposed':
      return {
        label: 'Planning',
        description: 'Proposed a sequence of actions.',
        icon: <Terminal className="h-4 w-4" />,
        color: 'text-primary',
        detail: (payload.title as string)
      };

    case 'step.started':
      return {
        label: 'Execution',
        description: `Starting: ${payload.title}`,
        icon: <Clock className="h-4 w-4" />,
        color: 'text-sky-500'
      };

    case 'step.completed':
      return {
        label: 'Validation',
        description: `Success: ${payload.title}`,
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-emerald-500'
      };

    case 'step.failed':
      return {
        label: 'Exception',
        description: `Failure: ${payload.title}`,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-rose-500',
        badge: 'Step Error'
      };

    case 'approval.requested': {
      const approval = (payload.approval || {}) as any;
      return {
        label: 'Policy Boundary',
        description: `Approval required: ${approval.type?.replace('_', ' ')}`,
        icon: <Shield className="h-4 w-4" />,
        color: 'text-orange-500',
        badge: approval.risk,
        badgeColor: approval.risk === 'high' ? 'bg-rose-500/10 text-rose-600' : 'bg-orange-500/10 text-orange-600',
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
        description: `Action ${isApproved ? 'resumed' : 'halted'} by ${payload.source || 'operator'}.`,
        icon: isApproved ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />,
        color: isApproved ? 'text-emerald-500' : 'text-rose-500',
        badge: isApproved ? 'Authorized' : 'Denied',
        badgeColor: isApproved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
      };
    }

    case 'artifact.created':
      return {
        label: 'Output',
        description: (payload.title as string) || 'New resource generated.',
        icon: <FileText className="h-4 w-4" />,
        color: 'text-indigo-500',
        detail: (payload.type as string)
      };

    case 'run.completed':
      return {
        label: 'Completion',
        description: 'Target state achieved successfully.',
        icon: <CheckCircle2 className="h-4 w-4 fill-current" />,
        color: 'text-emerald-500',
        badge: 'Success',
        badgeColor: 'bg-emerald-500/10 text-emerald-600'
      };

    case 'run.failed': {
      const error = (payload.error || {}) as any;
      return {
        label: 'Termination',
        description: error.message || 'Execution halted due to an error.',
        icon: <AlertTriangle className="h-4 w-4 fill-current" />,
        color: 'text-rose-500',
        badge: 'Critical Failure',
        badgeColor: 'bg-rose-500/10 text-rose-600'
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
