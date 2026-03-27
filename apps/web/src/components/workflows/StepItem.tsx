import { Trash2, Shield, Zap, Info, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowStep, WorkflowStepType, StepRisk, DaxApprovalMode, DaxRiskLevel } from '@/types/workflows';
import { motion, AnimatePresence } from 'framer-motion';

interface StepItemProps {
  step: WorkflowStep;
  index: number;
  onUpdate: (patch: Partial<WorkflowStep>) => void;
  onRemove: () => void;
  inferredRepoPath?: string;
}

export function StepItem({ step, index, onUpdate, onRemove, inferredRepoPath }: StepItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col gap-6 rounded-2xl border border-border/40 bg-card/10 p-8 hover:bg-card/20 hover:border-primary/10 transition-all duration-300 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-black shadow-inner shadow-primary/5">
            {index + 1}
          </div>
          <input
            type="text"
            placeholder="Action Title"
            value={step.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-9 w-64 rounded-xl border border-transparent bg-transparent px-3 text-sm font-bold focus:border-border focus:bg-muted/20 focus:outline-none transition-all placeholder:text-muted-foreground/40"
          />
        </div>
        <button
          onClick={onRemove}
          className="p-2 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Behavior Mode</label>
          <div className="relative">
            <select
              value={step.type}
              onChange={(e) => onUpdate({ type: e.target.value as WorkflowStepType })}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-xs font-black uppercase tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
            >
              <option value="task">General Task</option>
              <option value="dax_run">Governed Run (DAX)</option>
              <option value="read">Analysis/Read</option>
              <option value="write">Modification/Write</option>
              <option value="validation">Policy Validation</option>
              <option value="notification">Signal Outbound</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Risk Grade</label>
          <div className="flex gap-2">
            {(['read', 'write', 'execute'] as StepRisk[]).map((r) => (
              <button
                key={r}
                onClick={() => onUpdate({ risk: r })}
                className={cn(
                  'flex-1 h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all',
                  step.risk === r
                    ? r === 'execute'
                      ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-sm'
                      : r === 'write'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-sm'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-sm'
                    : 'bg-muted/10 text-muted-foreground/40 border-border/40 hover:bg-muted/20'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Instruction / Intent</label>
        <textarea
          placeholder={step.type === 'dax_run' ? 'Provide intent to the authority...' : 'Define specific task parameters...'}
          value={step.task || step.input || ''}
          onChange={(e) => onUpdate({ task: e.target.value, input: e.target.value })}
          className="h-24 w-full rounded-xl border border-border bg-muted/20 p-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 resize-none"
        />
      </div>

      {step.type === 'dax_run' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-6 pt-4 border-t border-border/20"
        >
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
            <Zap className="h-3 w-3" />
            DAX Governance Configuration
          </div>
          
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Identity Override</label>
              <input
                type="text"
                placeholder="Persona ID"
                value={step.personaPreset?.personaId || ''}
                onChange={(e) => onUpdate({
                  personaPreset: { ...step.personaPreset, personaId: e.target.value } as any
                })}
                className="h-10 w-full rounded-xl border border-border bg-muted/20 px-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Approval Mode</label>
              <select
                value={step.personaPreset?.approvalMode || 'strict'}
                onChange={(e) => onUpdate({
                  personaPreset: { ...step.personaPreset, approvalMode: e.target.value as DaxApprovalMode } as any
                })}
                className="h-10 w-full rounded-xl border border-border bg-muted/20 px-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              >
                <option value="strict">Strict</option>
                <option value="balanced">Balanced</option>
                <option value="relaxed">Relaxed</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">Threat Level</label>
              <select
                value={step.personaPreset?.riskLevel || 'medium'}
                onChange={(e) => onUpdate({
                  personaPreset: { ...step.personaPreset, riskLevel: e.target.value as DaxRiskLevel } as any
                })}
                className="h-10 w-full rounded-xl border border-border bg-muted/20 px-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          
          {inferredRepoPath && (
            <div className="flex items-start gap-3 rounded-xl bg-primary/[0.03] p-4 border border-primary/5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-tight text-primary">Targeting Context</p>
                <p className="text-[9px] font-medium text-muted-foreground/60 leading-none">
                  Execution will target: <code className="bg-primary/5 px-1 rounded font-mono text-primary/70 italic">{inferredRepoPath}</code>
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
