import { Link } from 'react-router-dom';
import { Save, Play, Pause, Trash2, ArrowUpRight, Plus, Settings2, Activity, Layers, GitBranch, ChevronDown, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Workflow, WorkflowEditorState, WorkflowRunReference, WorkflowStep, WorkflowStatus, WorkflowTrigger } from '@/types/workflows';
import { StepItem } from './StepItem';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkflowEditorProps {
  selectedWorkflow: Workflow | null;
  editor: WorkflowEditorState;
  onEditorChange: (patch: Partial<WorkflowEditorState>) => void;
  onSave: () => void;
  isSaving: boolean;
  onRun: () => void;
  onStatusChange: (status: WorkflowStatus) => void;
  latestRun: WorkflowRunReference | null;
  inferredRepoPath?: string;
  onBack?: () => void;
}

export function WorkflowEditor({
  selectedWorkflow,
  editor,
  onEditorChange,
  onSave,
  isSaving,
  onRun,
  onStatusChange,
  latestRun,
  inferredRepoPath,
  onBack,
}: WorkflowEditorProps) {
  if (!selectedWorkflow) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center p-20 text-center gap-6 bg-muted/[0.01]">
        <div className="h-20 w-20 rounded-3xl bg-muted/20 flex items-center justify-center">
          <GitBranch className="h-8 w-8 text-muted-foreground/20" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">No Pipeline Selected</h3>
          <p className="text-xs font-medium text-muted-foreground/40 max-w-xs leading-relaxed">
            Select an existing execution pipeline from the sidebar or create a new one to begin governing.
          </p>
        </div>
      </div>
    );
  }

  const addStep = () => {
    onEditorChange({
      steps: [
        ...editor.steps,
        {
          id: `step-${editor.steps.length + 1}`,
          name: `Step ${editor.steps.length + 1}`,
          type: 'task',
          risk: 'read',
        },
      ],
    });
  };

  const removeStep = (idx: number) => {
    const next = editor.steps.filter((_, i) => i !== idx);
    onEditorChange({
      steps: next.length ? next : [{ id: 'step-1', name: 'Step 1', type: 'task', risk: 'read' }],
    });
  };

  const updateStep = (idx: number, patch: Partial<WorkflowStep>) => {
    onEditorChange({
      steps: editor.steps.map((step, i) => (i === idx ? { ...step, ...patch } : step)),
    });
  };

  return (
    <div className={cn(
      "flex-1 flex flex-col overflow-hidden bg-background",
      !selectedWorkflow ? "hidden md:flex" : "flex"
    )}>
      {/* Editor Header */}
      <header className="h-auto md:h-16 border-b border-border bg-card/40 backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:px-8 shrink-0 z-20 gap-4">
        <div className="flex items-center gap-4 md:gap-6">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 rounded-lg bg-muted/20">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] leading-none mb-1.5">Authority Level V2</span>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={editor.name}
                onChange={(e) => onEditorChange({ name: e.target.value })}
                className="bg-transparent border-none p-0 text-sm font-black uppercase tracking-tight focus:ring-0 w-full md:w-64 text-foreground placeholder:text-muted-foreground/20"
                placeholder="Workflow Name"
              />
            </div>
          </div>
          
          <div className="hidden md:block h-8 w-px bg-border/40 mx-2" />
          
          <div className="hidden xs:flex items-center gap-2">
            {(['active', 'paused', 'draft'] as WorkflowStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                  editor.status === s 
                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                    : "bg-muted/10 text-muted-foreground/40 border-border/40 hover:bg-muted/20"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 md:flex-none group flex items-center justify-center gap-2.5 px-4 md:px-5 py-2 rounded-xl bg-card border border-border/60 text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all active-scale disabled:opacity-50"
          >
            <Save className={cn("h-3.5 w-3.5 transition-transform group-hover:scale-110", isSaving && "animate-spin")} />
            <span className="hidden xs:inline">{isSaving ? 'Syncing...' : 'Save Config'}</span>
            <span className="xs:hidden">{isSaving ? '...' : 'Save'}</span>
          </button>
          <button
            onClick={onRun}
            className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-4 md:px-5 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Dispatch
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto scrollbar-none">
        <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-8 md:space-y-12">
          {/* Last Run Reference */}
          <AnimatePresence>
            {latestRun && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Live Execution Linked</h4>
                    <p className="text-[11px] font-medium text-emerald-600/60 mt-0.5 truncate">Run ID: <span className="font-mono">{latestRun.daxRunId}</span></p>
                  </div>
                </div>
                <Link
                  to={`/runs/${latestRun.daxRunId}${latestRun.repoPath ? `?repoPath=${encodeURIComponent(latestRun.repoPath)}` : ''}`}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-emerald-500/20 hover:scale-105 transition-all"
                >
                  View Console
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Workflow Config */}
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <Settings2 className="h-4 w-4 text-muted-foreground/40" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Core Specification</h3>
            </div>
            
            <div className="grid gap-6 md:gap-10 md:grid-cols-2">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Trigger Signal</label>
                <div className="relative">
                  <select
                    value={editor.trigger}
                    onChange={(e) => onEditorChange({ trigger: e.target.value as WorkflowTrigger })}
                    className="h-12 w-full rounded-2xl border border-border bg-muted/10 px-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  >
                    <option value="manual">Manual Dispatch</option>
                    <option value="scheduled">Scheduled Interval</option>
                    <option value="webhook">Webhook Inbound</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Strategic Objective</label>
                <input
                  type="text"
                  placeholder="Describe the workflow's primary goal..."
                  value={editor.description}
                  onChange={(e) => onEditorChange({ description: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-border bg-muted/10 px-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/20"
                />
              </div>
            </div>
          </section>

          {/* Steps */}
          <section className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-muted-foreground/40" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Execution Steps</h3>
              </div>
              <button
                onClick={addStep}
                className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                Add Action Phase
              </button>
            </div>

            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {editor.steps.map((step, idx) => (
                  <StepItem
                    key={step.id || idx}
                    step={step}
                    index={idx}
                    onUpdate={(patch) => updateStep(idx, patch)}
                    onRemove={() => removeStep(idx)}
                    inferredRepoPath={inferredRepoPath}
                  />
                ))}
              </AnimatePresence>
            </div>
            
            <button
              onClick={addStep}
              className="w-full py-8 border-2 border-dashed border-border/40 rounded-3xl flex flex-col items-center gap-4 text-muted-foreground/30 hover:text-primary hover:border-primary/20 hover:bg-primary/[0.01] transition-all group"
            >
              <div className="h-12 w-12 rounded-2xl bg-muted/5 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                <Plus className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Append New Execution Phase</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
