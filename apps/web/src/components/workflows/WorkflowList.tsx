import { Search, Plus, CircleDashed, Workflow as WorkflowIcon, Play, Calendar, Webhook, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Workflow, WorkflowStatus, WorkflowTrigger } from '@/types/workflows';

interface WorkflowListProps {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onBootstrapTemplates: () => void;
  isLoading: boolean;
}

const getTriggerIcon = (trigger: WorkflowTrigger) => {
  switch (trigger) {
    case 'manual':
      return Play;
    case 'scheduled':
      return Calendar;
    case 'webhook':
      return Webhook;
    default:
      return GitBranch;
  }
};

export function WorkflowList({
  workflows,
  selectedWorkflowId,
  onSelect,
  onAdd,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onBootstrapTemplates,
  isLoading,
}: WorkflowListProps) {
  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={cn(
      "flex w-full md:w-80 flex-col border-r border-border bg-card z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]",
      selectedWorkflowId ? "hidden md:flex" : "flex"
    )}>
      <div className="p-6 border-b border-border bg-muted/20">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <WorkflowIcon className="h-4 w-4" />
              Pipelines
            </h2>
            <button
              onClick={onAdd}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:scale-105 transition-all shadow-md shadow-primary/20"
              title="New Workflow"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter workflows..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="h-8 flex-1 rounded-lg border border-border bg-background px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              >
                <option value="all">All States</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <button
                onClick={onBootstrapTemplates}
                className="h-8 px-3 rounded-lg bg-secondary text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors"
              >
                Templates
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2 scrollbar-none bg-muted/[0.02]">
        {isLoading && (
          <div className="p-8 text-center text-sm font-medium text-muted-foreground animate-pulse">
            Synchronizing...
          </div>
        )}
        {!isLoading && filteredWorkflows.length === 0 && (
          <div className="p-8 text-center flex flex-col items-center gap-3">
            <CircleDashed className="h-8 w-8 text-muted-foreground/40" />
            <span className="text-xs font-medium text-muted-foreground">No pipelines matched.</span>
          </div>
        )}
        {filteredWorkflows.map((workflow) => {
          const TriggerIcon = getTriggerIcon(workflow.trigger);
          const isSelected = selectedWorkflowId === workflow.id;
          
          return (
            <button
              key={workflow.id}
              onClick={() => onSelect(workflow.id)}
              className={cn(
                'w-full text-left p-4 rounded-2xl transition-all duration-200 border',
                isSelected
                  ? 'bg-primary/5 border-primary/20 shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-muted/40 hover:border-border/60'
              )}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border",
                    workflow.status === 'active' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                    workflow.status === 'draft' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                    "bg-muted text-muted-foreground border-border/40"
                  )}>
                    {workflow.status}
                  </span>
                  <TriggerIcon className="h-3 w-3 text-muted-foreground/40" />
                </div>
                <h3 className={cn(
                  "text-xs font-black uppercase tracking-tight truncate",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {workflow.name}
                </h3>
                <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                  <span>{workflow.steps.length} Phases</span>
                  <span>{workflow.runCount} Runs</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
