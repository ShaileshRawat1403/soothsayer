import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { api, apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import {
  Plus,
  Play,
  Pause,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertCircle,
  GitBranch,
  Calendar,
  Webhook,
  Filter,
  Search,
  ChevronRight,
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft';
  trigger: 'manual' | 'scheduled' | 'webhook';
  lastRun?: {
    status: 'success' | 'failed' | 'running';
    timestamp: string;
    duration: string;
  };
  runCount: number;
  steps: number;
}

const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'Bug Triage Automation',
    description: 'Automatically categorize and assign incoming bug reports',
    status: 'active',
    trigger: 'webhook',
    lastRun: { status: 'success', timestamp: '2 hours ago', duration: '45s' },
    runCount: 156,
    steps: 5,
  },
  {
    id: '2',
    name: 'Release Checklist',
    description: 'Automated pre-release verification workflow',
    status: 'active',
    trigger: 'manual',
    lastRun: { status: 'success', timestamp: '1 day ago', duration: '3m 20s' },
    runCount: 24,
    steps: 8,
  },
  {
    id: '3',
    name: 'Daily Standup Summary',
    description: 'Generate daily standup summaries from team updates',
    status: 'active',
    trigger: 'scheduled',
    lastRun: { status: 'running', timestamp: 'Running now', duration: '-' },
    runCount: 89,
    steps: 4,
  },
  {
    id: '4',
    name: 'Incident Response',
    description: 'Automated incident triage and notification workflow',
    status: 'paused',
    trigger: 'webhook',
    lastRun: { status: 'failed', timestamp: '3 days ago', duration: '12s' },
    runCount: 12,
    steps: 6,
  },
  {
    id: '5',
    name: 'Code Review Assistant',
    description: 'Automated code review suggestions and checks',
    status: 'draft',
    trigger: 'webhook',
    runCount: 0,
    steps: 3,
  },
];

const workflowTemplates = [
  { name: 'Bug Triage', description: 'Categorize and assign bugs automatically' },
  { name: 'Incident Summary', description: 'Generate incident post-mortems' },
  { name: 'Release Checklist', description: 'Pre-release verification steps' },
  { name: 'Data Report', description: 'Scheduled data analysis reports' },
  { name: 'Content Review', description: 'Content approval workflow' },
];

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await apiHelpers.getWorkflows();
        const payload = response.data as unknown as {
          workflows?: Array<Record<string, any>>;
        };
        const mapped =
          payload?.workflows?.map((w) => {
            const triggerType = (w.trigger?.type || 'manual') as Workflow['trigger'];
            return {
              id: String(w.id),
              name: String(w.name),
              description: String(w.description || ''),
              status: (w.status || 'draft') as Workflow['status'],
              trigger: triggerType,
              runCount: Number(w.runCount || w.totalRuns || 0),
              steps: Array.isArray(w.steps) ? w.steps.length : 0,
              lastRun: undefined,
            } as Workflow;
          }) || [];

        if (mounted && mapped.length > 0) {
          setWorkflows(mapped);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load workflows, showing demo data';
        toast.warning(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredWorkflows = useMemo(
    () =>
      workflows.filter((w) => {
        const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [searchQuery, statusFilter, workflows],
  );

  const getTriggerIcon = (trigger: string) => {
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

  const refreshWorkflows = async () => {
    const response = await apiHelpers.getWorkflows();
    const payload = response.data as unknown as { workflows?: Array<Record<string, any>> };
    const mapped =
      payload?.workflows?.map((w) => ({
        id: String(w.id),
        name: String(w.name),
        description: String(w.description || ''),
        status: (w.status || 'draft') as Workflow['status'],
        trigger: (w.trigger?.type || 'manual') as Workflow['trigger'],
        runCount: Number(w.runCount || w.totalRuns || 0),
        steps: Array.isArray(w.steps) ? w.steps.length : 0,
      })) || [];
    if (mapped.length > 0) {
      setWorkflows(mapped as Workflow[]);
      if (selectedWorkflow) {
        const next = mapped.find((w) => w.id === selectedWorkflow.id);
        if (next) setSelectedWorkflow(next as Workflow);
      }
    }
  };

  const updateWorkflowStatus = async (workflow: Workflow, status: Workflow['status']) => {
    await api.patch(`/workflows/${workflow.id}/status`, { status });
    await refreshWorkflows();
    toast.success(`Workflow ${status}`);
  };

  const runWorkflowNow = async (workflow: Workflow) => {
    await api.post(`/workflows/${workflow.id}/run`, { inputs: {} });
    await refreshWorkflows();
    toast.success('Workflow run completed');
  };

  return (
    <div className="flex h-full">
      {/* Workflow List */}
      <div className="flex w-96 flex-col border-r border-border">
        {/* Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Workflows</h2>
            <button className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground">
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Workflow List */}
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="p-4 text-sm text-muted-foreground">Loading workflows...</div>
          )}
          {filteredWorkflows.map((workflow) => {
            const TriggerIcon = getTriggerIcon(workflow.trigger);
            return (
              <button
                key={workflow.id}
                onClick={() => setSelectedWorkflow(workflow)}
                className={cn(
                  'w-full border-b border-border p-4 text-left transition-colors hover:bg-accent',
                  selectedWorkflow?.id === workflow.id && 'bg-accent'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{workflow.name}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          workflow.status === 'active' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                          workflow.status === 'paused' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                          workflow.status === 'draft' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        )}
                      >
                        {workflow.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                      {workflow.description}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TriggerIcon className="h-3 w-3" />
                        {workflow.trigger}
                      </span>
                      <span>{workflow.steps} steps</span>
                      <span>{workflow.runCount} runs</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workflow Details / Editor */}
      <div className="flex-1">
        {selectedWorkflow ? (
          <div className="h-full">
            {/* Workflow Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h3 className="text-xl font-semibold">{selectedWorkflow.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedWorkflow.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedWorkflow.status === 'active' ? (
                  <button
                    onClick={() => updateWorkflowStatus(selectedWorkflow, 'paused')}
                    className="flex h-9 items-center gap-2 rounded-md border border-input px-4 text-sm hover:bg-accent"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={() => updateWorkflowStatus(selectedWorkflow, 'active')}
                    className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm text-primary-foreground"
                  >
                    <Play className="h-4 w-4" />
                    Activate
                  </button>
                )}
                <button
                  onClick={() => runWorkflowNow(selectedWorkflow)}
                  className="flex h-9 items-center gap-2 rounded-md border border-input px-4 text-sm hover:bg-accent"
                >
                  <Play className="h-4 w-4" />
                  Run Now
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-md border border-input hover:bg-accent">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Workflow Canvas Placeholder */}
            <div className="flex h-[calc(100%-140px)] items-center justify-center bg-secondary/30">
              <div className="text-center">
                <GitBranch className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                <h4 className="text-lg font-medium">Visual Workflow Editor</h4>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  The full implementation includes a drag-and-drop workflow builder
                  with nodes for triggers, actions, conditions, and integrations.
                </p>
              </div>
            </div>

            {/* Last Run Status */}
            {selectedWorkflow.lastRun && (
              <div className="flex items-center justify-between border-t border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  {selectedWorkflow.lastRun.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {selectedWorkflow.lastRun.status === 'failed' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {selectedWorkflow.lastRun.status === 'running' && (
                    <Clock className="h-5 w-5 animate-pulse text-blue-500" />
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      Last run: {selectedWorkflow.lastRun.status}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedWorkflow.lastRun.timestamp} • Duration: {selectedWorkflow.lastRun.duration}
                    </div>
                  </div>
                </div>
                <button className="text-sm text-primary hover:underline">
                  View run history
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <GitBranch className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="text-lg font-medium">Select a workflow</h3>
            <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
              Choose a workflow from the list to view details and edit, or create a new one from a template.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {workflowTemplates.slice(0, 4).map((template) => (
                <button
                  key={template.name}
                  className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
