import { useEffect, useMemo, useState } from 'react';
import { api, apiHelpers } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { toast } from 'sonner';
import { Workflow, WorkflowStatus, WorkflowEditorState, WorkflowRunReference } from '@/types/workflows';
import { WorkflowList } from '@/components/workflows/WorkflowList';
import { WorkflowEditor } from '@/components/workflows/WorkflowEditor';

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
  trigger: (w.trigger?.type || 'manual') as any,
  runCount: Number(w.runCount || w.totalRuns || 0),
  steps: Array.isArray(w.steps) ? w.steps : [],
});

const toEditorState = (workflow: Workflow): WorkflowEditorState => ({
  name: workflow.name,
  description: workflow.description,
  status: workflow.status,
  trigger: workflow.trigger,
  steps: workflow.steps.length ? [...workflow.steps] : [...defaultEditorState.steps],
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

  const workspaceSettings = currentWorkspace?.settings as any;
  const inferredWorkflowRepoPath = workspaceSettings?.repoPath || workspaceSettings?.defaultRepoPath || workspaceSettings?.targetRepoPath;

  const selectedWorkflow = useMemo(
    () => workflows.find((w) => w.id === selectedWorkflowId) || null,
    [workflows, selectedWorkflowId],
  );

  useEffect(() => {
    if (selectedWorkflow) {
      setEditor(toEditorState(selectedWorkflow));
    }
  }, [selectedWorkflowId, selectedWorkflow?.id]);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await apiHelpers.getWorkflows();
      const payload = response.data as { workflows?: Array<Record<string, any>> };
      const mapped = (payload?.workflows || []).map(mapApiWorkflow);
      setWorkflows(mapped);
      if (!selectedWorkflowId && mapped.length > 0) {
        setSelectedWorkflowId(mapped[0].id);
      }
    } catch (error) {
      toast.error('Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const createWorkflow = async () => {
    try {
      const workspaceId = currentWorkspace?.id || (await apiHelpers.getWorkspaces()).data[0]?.id;
      const response = await apiHelpers.createWorkflow({
        workspaceId,
        name: `New Workflow ${Date.now()}`,
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
      toast.error('Failed to create workflow');
    }
  };

  const saveEditor = async () => {
    if (!selectedWorkflow) return;
    setIsSaving(true);
    try {
      await apiHelpers.updateWorkflow(selectedWorkflow.id, {
        ...editor,
        trigger: { type: editor.trigger },
      });
      await loadWorkflows();
      toast.success('Workflow saved');
    } catch (error) {
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const runWorkflowNow = async () => {
    if (!selectedWorkflow) return;
    try {
      const response = await api.post(`/workflows/${selectedWorkflow.id}/run`, {
        inputs: {},
        ...(currentProject?.id ? { projectId: currentProject.id } : {}),
        ...(inferredWorkflowRepoPath ? { repoPath: inferredWorkflowRepoPath } : {}),
      });
      const run = response.data as any;
      const latestDaxRun = run?.outputs?.daxRuns?.[run.outputs.daxRuns.length - 1];
      
      setLatestRunReference(latestDaxRun ? {
        workflowId: selectedWorkflow.id,
        workflowRunId: String(run.id),
        daxRunId: latestDaxRun.runId,
        repoPath: latestDaxRun.targeting?.repoPath || inferredWorkflowRepoPath,
        targetMode: latestDaxRun.targeting?.mode,
      } : null);
      
      await loadWorkflows();
      toast.success('Workflow pipeline dispatched');
    } catch (error) {
      toast.error('Failed to run workflow');
    }
  };

  const updateStatus = async (status: WorkflowStatus) => {
    if (!selectedWorkflow) return;
    try {
      await api.patch(`/workflows/${selectedWorkflow.id}/status`, { status });
      setEditor(prev => ({ ...prev, status }));
      await loadWorkflows();
      toast.success(`Workflow ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const bootstrapTemplates = async () => {
    try {
      const workspaceId = currentWorkspace?.id || (await apiHelpers.getWorkspaces()).data[0]?.id;
      await apiHelpers.bootstrapWorkflowTemplates(workspaceId);
      await loadWorkflows();
      toast.success('Workflow templates synchronized');
    } catch (error) {
      toast.error('Failed to bootstrap templates');
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      <WorkflowList
        workflows={workflows}
        selectedWorkflowId={selectedWorkflowId}
        onSelect={setSelectedWorkflowId}
        onAdd={createWorkflow}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onBootstrapTemplates={bootstrapTemplates}
        isLoading={isLoading}
      />
      <WorkflowEditor
        selectedWorkflow={selectedWorkflow}
        editor={editor}
        onEditorChange={(patch) => setEditor(prev => ({ ...prev, ...patch }))}
        onSave={saveEditor}
        isSaving={isSaving}
        onRun={runWorkflowNow}
        onStatusChange={updateStatus}
        latestRun={latestRunReference}
        inferredRepoPath={inferredWorkflowRepoPath}
      />
    </div>
  );
}
