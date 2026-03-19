import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Loader2, 
  Cpu, 
  User, 
  ShieldCheck,
  ChevronRight,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAIProviderStore } from '@/stores/ai-provider.store';
import { cn } from '@/lib/utils';
import type { Persona } from '@/stores/persona.store';

interface EditPersonaModalProps {
  persona: Persona;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Persona>) => Promise<void>;
}

export function EditPersonaModal({ persona, isOpen, onClose, onSave }: EditPersonaModalProps) {
  const { providers } = useAIProviderStore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    defaultProvider: persona.defaultProvider || '',
    defaultModel: persona.defaultModel || '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        defaultProvider: persona.defaultProvider || '',
        defaultModel: persona.defaultModel || '',
      });
    }
  }, [isOpen, persona]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(persona.id, {
        defaultProvider: formData.defaultProvider || undefined,
        defaultModel: formData.defaultModel || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save persona', error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedProvider = providers.find(p => p.id === formData.defaultProvider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl card-professional shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Execution Mapping</h2>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-0.5">
                Persona: {persona.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-xs font-medium text-amber-800/80 leading-relaxed">
              These hints override workspace defaults. If a provider is unavailable at runtime, DAX will attempt to fall back to the workspace or system primary authority.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block ml-1">
                Preferred Engine Hint
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setFormData({ ...formData, defaultProvider: p.id, defaultModel: '' })}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all',
                      formData.defaultProvider === p.id
                        ? 'border-primary bg-primary/5 shadow-apple'
                        : 'border-border hover:border-primary/30'
                    )}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{p.isLocal ? 'Local' : 'Cloud'}</div>
                    </div>
                    {formData.defaultProvider === p.id && (
                      <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setFormData({ ...formData, defaultProvider: '', defaultModel: '' })}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all',
                    formData.defaultProvider === ''
                      ? 'border-primary bg-primary/5 shadow-apple'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">Default Path</div>
                    <div className="text-[10px] text-muted-foreground truncate">Inherit workspace</div>
                  </div>
                  {formData.defaultProvider === '' && (
                    <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border/50">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground block ml-1">
                Preferred Model Hint
              </label>
              <div className="relative">
                <select
                  value={formData.defaultModel}
                  onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
                  className="w-full appearance-none rounded-2xl border border-border bg-background px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 shadow-apple transition-all"
                >
                  <option value="">Engine Default Model</option>
                  {selectedProvider?.models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/10 px-8 py-6">
          <button
            onClick={onClose}
            className="rounded-full px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={isSaving}
            onClick={handleSave}
            className="button-professional bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/10 flex items-center gap-2 px-8"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Mapping
          </button>
        </div>
      </div>
    </div>
  );
}
