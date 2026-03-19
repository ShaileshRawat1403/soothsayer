import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { api, apiHelpers } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { toast } from 'sonner';
import {
  Plus,
  Play,
  Pause,
  MoreHorizontal,
  GitBranch,
  Calendar,
  Webhook,
  Search,
  ChevronRight,
  Save,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';

type WorkflowStatus = 'active' | 'paused' | 'draft' | 'archived';
type WorkflowTrigger = 'manual' | 'scheduled' | 'webhook';
type StepRisk = 'read' | 'write' | 'execute';
type WorkflowStepType = 'task' | 'read' | 'analysis' | 'write' | 'validation' | 'notification' | 'dax_run';
type DaxApprovalMode = 'strict' | 'balanced' | 'relaxed';
type DaxRiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  risk: StepRisk;
  task?: string;
  input?: string;
  personaPreset?: {
    personaId: string;
    approvalMode?: DaxApprovalMode;
    riskLevel?: DaxRiskLevel;
  };
}

interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  runCount: number;
  steps: WorkflowStep[];
}

interface WorkflowEditorState {
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
}

interface WorkflowRunReference {
  workflowId: string;
  workflowRunId: string;
  daxRunId: string;
  status?: string;
}

const defaultEditorState: WorkflowEditorState = {
  name: '',
  description: '',
  status: 'draft',
  trigger: 'manual',
  steps: [{ id: 'step-1', name: 'Step 1', type: 'task', risk: 'read' }],
};

const mapApiWorkflow = (w: Record<string, any>): Workflow => ({
  id: String(w.id),
  workspaceId: String(w.workspaceId),
  name: String(w.name || ''),
  description: String(w.description || ''),
  status: (w.status || 'draft') as WorkflowStatus,
  trigger: (w.trigger?.type || 'manual') as WorkflowTrigger,
  runCount: Number(w.runCount || w.totalRuns || 0),
  steps: Array.isArray(w.steps)
    ? w.steps.map((s: Record<string, any>, idx: number) => ({
        id: String(s.id || `step-${idx + 1}`),
        name: String(s.name || `Step ${idx + 1}`),
        type: String(s.type || 'task') as WorkflowStepType,
        risk: (s.risk || 'read') as StepRisk,
        ...(s.task ? { task: String(s.task) } : {}),
        ...(typeof s.input === 'string' ? { input: String(s.input) } : {}),
        ...(s.personaPreset && typeof s.personaPreset === 'object'
          ? {
              personaPreset: {
                personaId: String((s.personaPreset as Record<string, any>).personaId || ''),
                ...((s.personaPreset as Record<string, any>).approvalMode
                  ? {
                      approvalMode: String(
                        (s.personaPreset as Record<string, any>).approvalMode,
                      ) as DaxApprovalMode,
                    }
                  : {}),
                ...((s.personaPreset as Record<string, any>).riskLevel
                  ? {
                      riskLevel: String(
                        (s.personaPreset as Record<string, any>).riskLevel,
                      ) as DaxRiskLevel,
                    }
                  : {}),
              },
            }
          : {}),
      }))
    : [],
});

const toEditorState = (workflow: Workflow): WorkflowEditorState => ({
  name: workflow.name,
  description: workflow.description,
  status: workflow.status,
  trigger: workflow.trigger,
  steps: workflow.steps.length
    ? workflow.steps.map((s) => ({ ...s }))
    : [{ id: 'step-1', name: 'Step 1', type: 'task', risk: 'read' }],
});

export function WorkflowsPage() {
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editor, setEditor] = useState<WorkflowEditorState>(defaultEditorState);
  const [latestRunReference, setLatestRunReference] = useState<WorkflowRunReference | null>(null);

  const selectedWorkflow = useMemo(
    () => workflows.find((w) => w.id === selectedWorkflowId) || null,
    [workflows, selectedWorkflowId],
  );

  const filteredWorkflows = useMemo(
    () =>
      workflows.filter((w) => {
        const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [searchQuery, statusFilter, workflows],
  );

  useEffect(() => {
    if (selectedWorkflow) {
      setEditor(toEditorState(selectedWorkflow));
    }
  }, [selectedWorkflowId, selectedWorkflow?.id]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await apiHelpers.getWorkflows();
        const payload = response.data as { workflows?: Array<Record<string, any>> };
        const mapped = (payload?.workflows || []).map(mapApiWorkflow);
        if (!mounted) return;

        setWorkflows(mapped);
        if (!selectedWorkflowId && mapped.length > 0) {
          setSelectedWorkflowId(mapped[0].id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load workflows';
        toast.error(message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const ensureWorkspaceId = async (): Promise<string> => {
    if (currentWorkspace?.id) {
      return currentWorkspace.id;
    }
    const response = await apiHelpers.getWorkspaces();
    const memberships = (response.data || []) as any[];
    const first = memberships[0];
    const workspace = first?.workspace || first;
    if (!workspace?.id) {
      throw new Error('No workspace found. Create a workspace first.');
    }
    setCurrentWorkspace(workspace);
    return workspace.id as string;
  };

  const refreshWorkflows = async () => {
    const response = await apiHelpers.getWorkflows();
    const payload = response.data as { workflows?: Array<Record<string, any>> };
    const mapped = (payload?.workflows || []).map(mapApiWorkflow);
    setWorkflows(mapped);
    if (selectedWorkflowId) {
      const exists = mapped.some((w) => w.id === selectedWorkflowId);
      if (!exists) {
        setSelectedWorkflowId(mapped[0]?.id || null);
      }
    } else if (mapped.length > 0) {
      setSelectedWorkflowId(mapped[0].id);
    }
  };

  const createWorkflow = async () => {
    try {
      const workspaceId = await ensureWorkspaceId();
      const now = Date.now();
      const response = await apiHelpers.createWorkflow({
        workspaceId,
        name: `New Workflow ${now}`,
        description: 'Describe what this workflow does.',
        trigger: { type: 'manual' },
        steps: [{ id: 'step-1', name: 'Step 1', type: 'task', risk: 'read' }],
        status: 'draft',
      });
      const created = mapApiWorkflow(response.data as Record<string, any>);
      setWorkflows((prev) => [created, ...prev]);
      setSelectedWorkflowId(created.id);
      toast.success('Workflow created');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create workflow';
      toast.error(message);
    }
  };

  const saveEditor = async () => {
    if (!selectedWorkflow) {
      toast.error('Select a workflow first');
      return;
    }
    const name = editor.name.trim();
    if (!name) {
      toast.error('Workflow name is required');
      return;
    }

    setIsSaving(true);
    try {
      await apiHelpers.updateWorkflow(selectedWorkflow.id, {
        name,
        description: editor.description.trim(),
        status: editor.status,
        trigger: { type: editor.trigger },
        steps: editor.steps.map((step, idx) => ({
          id: step.id || `step-${idx + 1}`,
          name: step.name || `Step ${idx + 1}`,
          type: (step.type || 'task') as WorkflowStepType,
          risk: step.risk || 'read',
          ...(step.task ? { task: step.task } : {}),
          ...(step.input ? { input: step.input } : {}),
          ...(step.personaPreset?.personaId
            ? {
                personaPreset: {
                  personaId: step.personaPreset.personaId,
                  ...(step.personaPreset.approvalMode
                    ? { approvalMode: step.personaPreset.approvalMode }
                    : {}),
                  ...(step.personaPreset.riskLevel
                    ? { riskLevel: step.personaPreset.riskLevel }
                    : {}),
                },
              }
            : {}),
        })),
      });
      await refreshWorkflows();
      toast.success('Workflow saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save workflow';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateWorkflowStatus = async (workflow: Workflow, status: WorkflowStatus) => {
    await api.patch(`/workflows/${workflow.id}/status`, { status });
    await refreshWorkflows();
    setEditor((prev) => ({ ...prev, status }));
    toast.success(`Workflow ${status}`);
  };

  const runWorkflowNow = async (workflow: Workflow) => {
    const response = await api.post(`/workflows/${workflow.id}/run`, { inputs: {} });
    const run = response.data as Record<string, any>;
    const latestDaxRunId =
      typeof run?.outputs?.latestDaxRunId === 'string'
        ? run.outputs.latestDaxRunId
        : Array.isArray(run?.outputs?.daxRuns) &&
            typeof run.outputs.daxRuns[run.outputs.daxRuns.length - 1]?.runId === 'string'
          ? run.outputs.daxRuns[run.outputs.daxRuns.length - 1].runId
          : null;

    setLatestRunReference(
      latestDaxRunId
        ? {
            workflowId: workflow.id,
            workflowRunId: String(run.id),
            daxRunId: latestDaxRunId,
            status: typeof run.status === 'string' ? run.status : undefined,
          }
        : null,
    );
    await refreshWorkflows();
    toast.success(latestDaxRunId ? 'Workflow run completed via DAX' : 'Workflow run completed');
  };

  const bootstrapTemplates = async () => {
    try {
      const workspaceId = await ensureWorkspaceId();
      const response = await apiHelpers.bootstrapWorkflowTemplates(workspaceId);
      const payload = response.data as { created?: number };
      await refreshWorkflows();
      toast.success(
        payload?.created && payload.created > 0
          ? `Created ${payload.created} workflow templates`
          : 'Templates already exist in this workspace',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to bootstrap templates';
      toast.error(message);
    }
  };

  const addStep = () => {
    setEditor((prev) => ({
      ...prev,
          steps: [
        ...prev.steps,
        {
          id: `step-${prev.steps.length + 1}`,
          name: `Step ${prev.steps.length + 1}`,
          type: 'task',
          risk: 'read',
        },
      ],
    }));
  };

  const removeStep = (idx: number) => {
    setEditor((prev) => {
      const next = prev.steps.filter((_, i) => i !== idx);
      return {
        ...prev,
        steps: next.length ? next : [{ id: 'step-1', name: 'Step 1', type: 'task', risk: 'read' }],
      };
    });
  };

  const updateStep = (idx: number, patch: Partial<WorkflowStep>) => {
    setEditor((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === idx ? { ...step, ...patch } : step)),
    }));
  };

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

  return (
    <div className="flex h-full">
      <div className="flex w-96 flex-col border-r border-border">
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Workflows</h2>
            <div className="flex gap-2">
              <button
                onClick={createWorkflow}
                className="flex h-8 items-center gap-1.5 rounded-md border border-input px-3 text-sm hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                New
              </button>
              <button
                onClick={bootstrapTemplates}
                className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Templates
              </button>
            </div>
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
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading workflows...</div>}
          {!isLoading && filteredWorkflows.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              No workflows found. Click <span className="font-medium">New</span> to create one.
            </div>
          )}
          {filteredWorkflows.map((workflow) => {
            const TriggerIcon = getTriggerIcon(workflow.trigger);
            return (
              <button
                key={workflow.id}
                onClick={() => setSelectedWorkflowId(workflow.id)}
                className={cn(
                  'w-full border-b border-border p-4 text-left transition-colors hover:bg-accent',
                  selectedWorkflowId === workflow.id && 'bg-accent',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{workflow.name}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          workflow.status === 'active' &&
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                          workflow.status === 'paused' &&
                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                          workflow.status === 'draft' &&
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                        )}
                      >
                        {workflow.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{workflow.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TriggerIcon className="h-3 w-3" />
                        {workflow.trigger}
                      </span>
                      <span>{workflow.steps.length} steps</span>
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

      <div className="flex-1">
        {selectedWorkflow ? (
          <div className="h-full overflow-auto">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h3 className="text-xl font-semibold">{selectedWorkflow.name}</h3>
                <p className="text-sm text-muted-foreground">Workflow Step Editor</p>
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
                <button
                  onClick={saveEditor}
                  disabled={isSaving}
                  className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-md border border-input hover:bg-accent">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {latestRunReference?.workflowId === selectedWorkflow.id ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        Latest workflow execution delegated to DAX
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Run ID:
                        <span className="ml-2 font-mono text-xs text-foreground">
                          {latestRunReference.daxRunId}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/runs/${latestRunReference.daxRunId}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      Open live run
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                  <input
                    value={editor.name}
                    onChange={(e) => setEditor((prev) => ({ ...prev, name: e.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Status</label>
                  <select
                    value={editor.status}
                    onChange={(e) =>
                      setEditor((prev) => ({ ...prev, status: e.target.value as WorkflowStatus }))
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                  <input
                    value={editor.description}
                    onChange={(e) => setEditor((prev) => ({ ...prev, description: e.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Trigger</label>
                  <select
                    value={editor.trigger}
                    onChange={(e) =>
                      setEditor((prev) => ({ ...prev, trigger: e.target.value as WorkflowTrigger }))
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="manual">manual</option>
                    <option value="scheduled">scheduled</option>
                    <option value="webhook">webhook</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-medium">Steps</h4>
                  <button
                    onClick={addStep}
                    className="flex h-8 items-center gap-1 rounded-md border border-input px-3 text-sm hover:bg-accent"
                  >
                    <Plus className="h-3 w-3" />
                    Add Step
                  </button>
                </div>

                <div className="space-y-2">
                  {editor.steps.map((step, idx) => (
                    <div key={`${step.id}-${idx}`} className="grid grid-cols-12 gap-2 rounded-md border border-border p-2">
                      <input
                        value={step.name}
                        onChange={(e) => updateStep(idx, { name: e.target.value })}
                        placeholder="Step name"
                        className="col-span-4 h-8 rounded border border-input bg-background px-2 text-sm"
                      />
                      <select
                        value={step.type}
                        onChange={(e) =>
                          updateStep(idx, {
                            type: e.target.value as WorkflowStepType,
                            ...(e.target.value === 'dax_run'
                              ? {
                                  risk: 'execute',
                                  task: '',
                                }
                              : {}),
                          })
                        }
                        className="col-span-3 h-8 rounded border border-input bg-background px-2 text-sm"
                      >
                        <option value="task">task</option>
                        <option value="read">read</option>
                        <option value="analysis">analysis</option>
                        <option value="write">write</option>
                        <option value="validation">validation</option>
                        <option value="notification">notification</option>
                        <option value="dax_run">dax_run</option>
                      </select>
                      <select
                        value={step.risk}
                        onChange={(e) => updateStep(idx, { risk: e.target.value as StepRisk })}
                        className="col-span-2 h-8 rounded border border-input bg-background px-2 text-sm"
                      >
                        <option value="read">read</option>
                        <option value="write">write</option>
                        <option value="execute">execute</option>
                      </select>
                      <input
                        value={step.type === 'dax_run' ? step.input || '' : step.task || ''}
                        onChange={(e) =>
                          updateStep(
                            idx,
                            step.type === 'dax_run'
                              ? { input: e.target.value }
                              : { task: e.target.value },
                          )
                        }
                        placeholder={step.type === 'dax_run' ? 'Instruction' : 'Task (optional)'}
                        className="col-span-2 h-8 rounded border border-input bg-background px-2 text-sm"
                      />
                      <button
                        onClick={() => removeStep(idx)}
                        className="col-span-1 flex h-8 items-center justify-center rounded border border-input hover:bg-accent"
                        title="Remove step"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      {step.type === 'dax_run' ? (
                        <>
                          <input
                            value={step.personaPreset?.personaId || ''}
                            onChange={(e) =>
                              updateStep(idx, {
                                personaPreset: {
                                  personaId: e.target.value,
                                  approvalMode: step.personaPreset?.approvalMode,
                                  riskLevel: step.personaPreset?.riskLevel,
                                },
                              })
                            }
                            placeholder="Persona ID"
                            className="col-span-4 h-8 rounded border border-input bg-background px-2 text-sm"
                          />
                          <select
                            value={step.personaPreset?.approvalMode || 'balanced'}
                            onChange={(e) =>
                              updateStep(idx, {
                                personaPreset: {
                                  personaId: step.personaPreset?.personaId || '',
                                  approvalMode: e.target.value as DaxApprovalMode,
                                  riskLevel: step.personaPreset?.riskLevel,
                                },
                              })
                            }
                            className="col-span-3 h-8 rounded border border-input bg-background px-2 text-sm"
                          >
                            <option value="strict">strict approval</option>
                            <option value="balanced">balanced approval</option>
                            <option value="relaxed">relaxed approval</option>
                          </select>
                          <select
                            value={step.personaPreset?.riskLevel || 'medium'}
                            onChange={(e) =>
                              updateStep(idx, {
                                personaPreset: {
                                  personaId: step.personaPreset?.personaId || '',
                                  approvalMode: step.personaPreset?.approvalMode,
                                  riskLevel: e.target.value as DaxRiskLevel,
                                },
                              })
                            }
                            className="col-span-4 h-8 rounded border border-input bg-background px-2 text-sm"
                          >
                            <option value="low">low risk</option>
                            <option value="medium">medium risk</option>
                            <option value="high">high risk</option>
                            <option value="critical">critical risk</option>
                          </select>
                          <div className="col-span-1" />
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <GitBranch className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="text-lg font-medium">Create or Select a Workflow</h3>
            <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
              Use <span className="font-medium">New</span> for a blank workflow or
              <span className="font-medium"> Templates</span> for starter flows, then edit steps and save.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
