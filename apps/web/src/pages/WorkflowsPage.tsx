import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { api, apiHelpers } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
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
  Workflow as WorkflowIcon,
  CircleDashed,
  Settings2,
  Activity,
  Layers
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
  repoPath?: string;
  targetMode?: 'explicit_repo_path' | 'default_cwd';
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
  const { currentWorkspace, currentProject, setCurrentWorkspace } = useWorkspaceStore();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editor, setEditor] = useState<WorkflowEditorState>(defaultEditorState);
  const [latestRunReference, setLatestRunReference] = useState<WorkflowRunReference | null>(null);

  const workspaceSettings =
    currentWorkspace?.settings && typeof currentWorkspace.settings === 'object'
      ? (currentWorkspace.settings as Record<string, unknown>)
      : null;

  const inferredWorkflowRepoPath =
    typeof workspaceSettings?.repoPath === 'string'
      ? workspaceSettings.repoPath
      : typeof workspaceSettings?.defaultRepoPath === 'string'
        ? workspaceSettings.defaultRepoPath
        : typeof workspaceSettings?.targetRepoPath === 'string'
          ? workspaceSettings.targetRepoPath
          : undefined;

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
    const response = await api.post(`/workflows/${workflow.id}/run`, {
      inputs: {},
      ...(currentProject?.id ? { projectId: currentProject.id } : {}),
      ...(inferredWorkflowRepoPath ? { repoPath: inferredWorkflowRepoPath } : {}),
    });
    const run = response.data as Record<string, any>;
    const latestDaxRunId =
      typeof run?.outputs?.latestDaxRunId === 'string'
        ? run.outputs.latestDaxRunId
        : Array.isArray(run?.outputs?.daxRuns) &&
            typeof run.outputs.daxRuns[run.outputs.daxRuns.length - 1]?.runId === 'string'
          ? run.outputs.daxRuns[run.outputs.daxRuns.length - 1].runId
          : null;

    const latestDaxRun =
      Array.isArray(run?.outputs?.daxRuns) && run.outputs.daxRuns.length > 0
        ? run.outputs.daxRuns[run.outputs.daxRuns.length - 1]
        : null;

    const targetMode =
      latestDaxRun?.targeting?.mode === 'explicit_repo_path'
        ? 'explicit_repo_path'
        : 'default_cwd';
    const repoPath =
      typeof latestDaxRun?.targeting?.repoPath === 'string'
        ? latestDaxRun.targeting.repoPath
        : inferredWorkflowRepoPath;

    setLatestRunReference(
      latestDaxRunId
        ? {
            workflowId: workflow.id,
            workflowRunId: String(run.id),
            daxRunId: latestDaxRunId,
            status: typeof run.status === 'string' ? run.status : undefined,
            ...(repoPath ? { repoPath } : {}),
            targetMode,
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
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar: Workflow List */}
      <div className="flex w-80 flex-col border-r border-border bg-card z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
        <div className="p-6 border-b border-border bg-muted/20">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <WorkflowIcon className="h-4 w-4" />
                Pipelines
              </h2>
              <button
                onClick={createWorkflow}
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 flex-1 rounded-lg border border-border bg-background px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                >
                  <option value="all">All States</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
                <button
                  onClick={bootstrapTemplates}
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
                onClick={() => setSelectedWorkflowId(workflow.id)}
                className={cn(
                  'w-full text-left p-4 rounded-2xl transition-all duration-200 border',
                  isSelected
                    ? 'bg-background border-primary/20 shadow-apple ring-1 ring-primary/10'
                    : 'bg-transparent border-transparent hover:bg-muted/50 hover:border-border/50'
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn(
                      "font-bold text-sm truncate",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {workflow.name}
                    </span>
                    <span
                      className={cn(
                        'flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border',
                        workflow.status === 'active' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                        workflow.status === 'paused' && 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                        workflow.status === 'draft' && 'bg-muted text-muted-foreground border-border',
                        workflow.status === 'archived' && 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      )}
                    >
                      {workflow.status}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground line-clamp-2 leading-relaxed">
                    {workflow.description || 'No description provided.'}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <span className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 rounded-md text-muted-foreground">
                      <TriggerIcon className="h-3 w-3" />
                      {workflow.trigger}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {workflow.steps.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {workflow.runCount}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col bg-muted/[0.02]">
        {selectedWorkflow ? (
          <div className="flex flex-col h-full">
            {/* Editor Header */}
            <div className="flex items-center justify-between border-b border-border bg-background px-8 py-5 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">{selectedWorkflow.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">Pipeline Definition</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-secondary/50 p-1.5 rounded-full border border-border/50">
                {selectedWorkflow.status === 'active' ? (
                  <button
                    onClick={() => updateWorkflowStatus(selectedWorkflow, 'paused')}
                    className="flex h-9 items-center gap-2 rounded-full px-5 text-xs font-bold uppercase tracking-wider text-amber-600 hover:bg-amber-500/10 transition-colors"
                  >
                    <Pause className="h-3.5 w-3.5 fill-current" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={() => updateWorkflowStatus(selectedWorkflow, 'active')}
                    className="flex h-9 items-center gap-2 rounded-full px-5 text-xs font-bold uppercase tracking-wider text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Activate
                  </button>
                )}
                <div className="w-px h-6 bg-border mx-1" />
                <button
                  onClick={() => runWorkflowNow(selectedWorkflow)}
                  className="flex h-9 items-center gap-2 rounded-full px-5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  Execute
                </button>
                <button
                  onClick={saveEditor}
                  disabled={isSaving}
                  className="flex h-9 items-center gap-2 rounded-full bg-primary px-6 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? 'Saving' : 'Commit'}
                </button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto p-8 scrollbar-thin">
              <div className="max-w-4xl mx-auto space-y-8 pb-20">
                
                <AnimatePresence>
                  {latestRunReference?.workflowId === selectedWorkflow.id && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card-professional border-primary/20 bg-primary/[0.02] p-6 shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Governed Execution Dispatched</h4>
                          <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <span>ID: <span className="text-primary">{latestRunReference.daxRunId.substring(0, 12)}</span></span>
                            <span>Target: {latestRunReference.repoPath || 'Instance CWD'}</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        to={`/runs/${latestRunReference.daxRunId}${
                          latestRunReference.repoPath || latestRunReference.targetMode
                            ? `?${new URLSearchParams({
                                targetMode: latestRunReference.targetMode || 'default_cwd',
                                ...(latestRunReference.repoPath
                                  ? { repoPath: latestRunReference.repoPath }
                                  : {}),
                              }).toString()}`
                            : ''
                        }`}
                        className="button-professional bg-primary text-primary-foreground shadow-md shadow-primary/20 flex items-center gap-2"
                      >
                        Monitor Trace
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="card-professional p-8 space-y-6 bg-background">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border/50 pb-4">Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pipeline Name</label>
                      <input
                        value={editor.name}
                        onChange={(e) => setEditor((prev) => ({ ...prev, name: e.target.value }))}
                        className="h-12 w-full rounded-2xl border border-border bg-muted/20 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Lifecycle State</label>
                      <select
                        value={editor.status}
                        onChange={(e) => setEditor((prev) => ({ ...prev, status: e.target.value as WorkflowStatus }))}
                        className="h-12 w-full rounded-2xl border border-border bg-muted/20 px-4 text-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</label>
                      <input
                        value={editor.description}
                        onChange={(e) => setEditor((prev) => ({ ...prev, description: e.target.value }))}
                        className="h-12 w-full rounded-2xl border border-border bg-muted/20 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Trigger Event</label>
                      <select
                        value={editor.trigger}
                        onChange={(e) => setEditor((prev) => ({ ...prev, trigger: e.target.value as WorkflowTrigger }))}
                        className="h-12 w-full rounded-2xl border border-border bg-muted/20 px-4 text-sm font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                      >
                        <option value="manual">Manual Execution</option>
                        <option value="scheduled">Time Scheduled</option>
                        <option value="webhook">External Webhook</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Execution Sequence</h3>
                    <button
                      onClick={addStep}
                      className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted transition-all active:scale-95 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Append Step
                    </button>
                  </div>

                  <div className="space-y-4">
                    {editor.steps.map((step, idx) => (
                      <motion.div 
                        key={`${step.id}-${idx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card-professional bg-background p-6 border-border/60 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[10px] font-black text-muted-foreground">
                              {idx + 1}
                            </div>
                            <input
                              value={step.name}
                              onChange={(e) => updateStep(idx, { name: e.target.value })}
                              placeholder="Action Title"
                              className="h-9 w-64 rounded-xl border border-transparent bg-transparent px-3 text-sm font-bold focus:border-border focus:bg-muted/20 focus:outline-none transition-all placeholder:text-muted-foreground/40"
                            />
                          </div>
                          <button
                            onClick={() => removeStep(idx)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                            title="Remove Step"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-12 gap-4 pl-11">
                          <div className="col-span-4 space-y-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Operation Type</span>
                            <select
                              value={step.type}
                              onChange={(e) =>
                                updateStep(idx, {
                                  type: e.target.value as WorkflowStepType,
                                  ...(e.target.value === 'dax_run'
                                    ? { risk: 'execute', task: '' }
                                    : {}),
                                })
                              }
                              className="h-10 w-full rounded-xl border border-border bg-muted/20 px-3 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                            >
                              <option value="task">Basic Task</option>
                              <option value="read">Read Data</option>
                              <option value="analysis">Deep Analysis</option>
                              <option value="write">Write Output</option>
                              <option value="validation">Validation Rule</option>
                              <option value="notification">Send Alert</option>
                              <option value="dax_run">DAX Authority Run</option>
                            </select>
                          </div>
                          
                          <div className="col-span-3 space-y-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Risk Context</span>
                            <select
                              value={step.risk}
                              onChange={(e) => updateStep(idx, { risk: e.target.value as StepRisk })}
                              className="h-10 w-full rounded-xl border border-border bg-muted/20 px-3 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                            >
                              <option value="read">Safe (Read)</option>
                              <option value="write">Moderate (Write)</option>
                              <option value="execute">Elevated (Execute)</option>
                            </select>
                          </div>

                          <div className="col-span-5 space-y-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payload / Instruction</span>
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
                              placeholder={step.type === 'dax_run' ? 'Provide intent to the authority...' : 'Define specific task parameters...'}
                              className="h-10 w-full rounded-xl border border-border bg-muted/20 px-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                            />
                          </div>

                          {step.type === 'dax_run' && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="col-span-12 mt-2 pt-4 border-t border-border/50 grid grid-cols-12 gap-4"
                            >
                              <div className="col-span-12 mb-1">
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                                  <Settings2 className="h-3 w-3" />
                                  Authority Configuration
                                </span>
                              </div>
                              <div className="col-span-4">
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
                                  placeholder="Override Persona ID (Optional)"
                                  className="h-10 w-full rounded-xl border border-border bg-background px-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                              </div>
                              <div className="col-span-4">
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
                                  className="h-10 w-full rounded-xl border border-border bg-background px-4 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                >
                                  <option value="strict">Strict Policy</option>
                                  <option value="balanced">Balanced Policy</option>
                                  <option value="relaxed">Relaxed Policy</option>
                                </select>
                              </div>
                              <div className="col-span-4">
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
                                  className="h-10 w-full rounded-xl border border-border bg-background px-4 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                >
                                  <option value="low">Low Risk Tolerance</option>
                                  <option value="medium">Medium Risk Tolerance</option>
                                  <option value="high">High Risk Tolerance</option>
                                  <option value="critical">Critical Risk Tolerance</option>
                                </select>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center p-8">
            <div className="rounded-[2.5rem] bg-secondary p-8 mb-6 shadow-apple">
              <GitBranch className="h-16 w-16 text-muted-foreground/40" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">Select a Pipeline</h3>
            <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
              Choose an existing workflow from the sidebar or define a new automated sequence to govern your workspace operations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
