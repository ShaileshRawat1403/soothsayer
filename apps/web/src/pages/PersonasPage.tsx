import { useState } from 'react';
import { usePersonaStore, Persona } from '@/stores/persona.store';
import { cn, getPersonaColor } from '@/lib/utils';
import {
  Search,
  Filter,
  Plus,
  Check,
  Star,
  Settings,
  Copy,
  Download,
  Upload,
  ChevronRight,
  Sparkles,
  Code,
  Briefcase,
  Shield,
  BarChart,
  Zap,
  Cpu,
  User,
  Settings2,
  Lock,
  Workflow,
  Terminal,
  FileCode,
  Layout,
  Scale,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { EditPersonaModal } from '@/components/dax/EditPersonaModal';

const defaultPersonas: Persona[] = [
  {
    id: 'auto',
    name: 'Soothsayer (Recommended)',
    slug: 'auto',
    category: 'Meta',
    description: 'Grounded assistant optimized to demo and guide the Soothsayer web app end-to-end.',
    icon: 'Target',
    color: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    systemPrompt: `You are Soothsayer, the Grounded One.`,
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    capabilities: ['Context Analysis', 'Dynamic Switching', 'Multi-domain'],
    preferredTools: [],
    restrictions: [],
    responseStyle: { tone: 'friendly', verbosity: 'balanced', formatting: ['markdown'] },
    isDefault: true,
    isCustom: false,
    version: 1,
  },
  {
    id: 'staff-swe',
    name: 'Staff Software Engineer',
    slug: 'staff-swe',
    category: 'Engineering',
    description: 'Senior technical expert with deep system design knowledge',
    icon: 'Code',
    color: 'bg-blue-500',
    systemPrompt: 'You are a Staff Software Engineer...',
    temperature: 0.3,
    maxTokens: 8192,
    topP: 0.9,
    capabilities: ['System Design', 'Code Review', 'Architecture', 'Mentoring'],
    preferredTools: ['code_generator', 'refactor_assistant', 'performance_profiler'],
    restrictions: ['No direct production changes without review'],
    responseStyle: { tone: 'technical', verbosity: 'detailed', formatting: ['markdown', 'code'] },
    isDefault: false,
    isCustom: false,
    version: 1,
  },
  {
    id: 'backend-dev',
    name: 'Backend Developer',
    slug: 'backend-dev',
    category: 'Engineering',
    description: 'API design, database optimization, and server-side logic',
    icon: 'Cpu',
    color: 'bg-emerald-500',
    systemPrompt: 'You are a Backend Developer...',
    temperature: 0.4,
    maxTokens: 4096,
    topP: 0.9,
    capabilities: ['API Design', 'Database', 'Performance', 'Security'],
    preferredTools: ['api_validator', 'sql_assistant', 'log_analyzer'],
    restrictions: [],
    responseStyle: { tone: 'technical', verbosity: 'balanced', formatting: ['markdown', 'code'] },
    isDefault: false,
    isCustom: false,
    version: 1,
  },
  {
    id: 'product-manager',
    name: 'Product Manager',
    slug: 'product-manager',
    category: 'Business',
    description: 'Product strategy, roadmapping, and stakeholder communication',
    icon: 'Briefcase',
    color: 'bg-purple-500',
    systemPrompt: 'You are a Product Manager...',
    temperature: 0.6,
    maxTokens: 4096,
    topP: 0.9,
    capabilities: ['Strategy', 'Roadmapping', 'User Research', 'Prioritization'],
    preferredTools: ['prd_generator', 'roadmap_planner', 'requirements_synthesizer'],
    restrictions: [],
    responseStyle: { tone: 'friendly', verbosity: 'balanced', formatting: ['markdown', 'lists'] },
    isDefault: false,
    isCustom: false,
    version: 1,
  },
  {
    id: 'devops-engineer',
    name: 'DevOps Engineer',
    slug: 'devops-engineer',
    category: 'Engineering',
    description: 'CI/CD, infrastructure, and deployment automation',
    icon: 'Workflow',
    color: 'bg-orange-500',
    systemPrompt: 'You are a DevOps Engineer...',
    temperature: 0.3,
    maxTokens: 4096,
    topP: 0.9,
    capabilities: ['CI/CD', 'Infrastructure', 'Monitoring', 'Automation'],
    preferredTools: ['safe_git_helper', 'log_analyzer', 'scheduler'],
    restrictions: ['Require approval for production deployments'],
    responseStyle: { tone: 'technical', verbosity: 'concise', formatting: ['markdown', 'code'] },
    isDefault: false,
    isCustom: false,
    version: 1,
  },
  {
    id: 'security-engineer',
    name: 'Security Engineer',
    slug: 'security-engineer',
    category: 'Engineering',
    description: 'Security assessments, vulnerability analysis, and compliance',
    icon: 'Lock',
    color: 'bg-red-500',
    systemPrompt: 'You are a Security Engineer...',
    temperature: 0.2,
    maxTokens: 4096,
    topP: 0.9,
    capabilities: ['Security Audit', 'Vulnerability Analysis', 'Compliance', 'Hardening'],
    preferredTools: ['policy_checker', 'pii_redaction', 'security_checklist'],
    restrictions: ['Never expose credentials', 'Redact sensitive data'],
    responseStyle: { tone: 'formal', verbosity: 'detailed', formatting: ['markdown', 'lists'] },
    isDefault: false,
    isCustom: false,
    version: 1,
  },
];

const categories = [
  { id: 'all', name: 'All Personas', icon: Sparkles },
  { id: 'Engineering', name: 'Engineering', icon: Code },
  { id: 'Business', name: 'Business', icon: Briefcase },
  { id: 'Security', name: 'Security', icon: Shield },
  { id: 'Data', name: 'Data & Analytics', icon: BarChart },
  { id: 'Meta', name: 'Meta', icon: Zap },
];

const PersonaIcon = ({ icon, className }: { icon: string; className?: string }) => {
  switch (icon) {
    case 'Target': return <Layout className={className} />;
    case 'Code': return <Code className={className} />;
    case 'Cpu': return <Cpu className={className} />;
    case 'Briefcase': return <Briefcase className={className} />;
    case 'Workflow': return <Workflow className={className} />;
    case 'Lock': return <Lock className={className} />;
    default: return <User className={className} />;
  }
};

export function PersonasPage() {
  const { currentPersona, setCurrentPersona, updatePersona } = usePersonaStore();
  const [personas, setPersonasState] = useState<Persona[]>(defaultPersonas);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  const filteredPersonas = personas.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectPersona = (persona: Persona) => {
    setCurrentPersona(persona);
    toast.success(`Switched to ${persona.name}`);
  };

  const handleSavePersona = async (id: string, data: Partial<Persona>) => {
    setPersonasState(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    updatePersona(id, data);
    toast.success('Persona mapping updated');
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border bg-card">
        <div className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Categories</h2>
        </div>
        <nav className="space-y-1 px-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground shadow-apple'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <category.icon className="h-4 w-4" />
              {category.name}
            </button>
          ))}
        </nav>
        <div className="mt-6 border-t border-border p-6">
          <button className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-muted transition-all">
            <Plus className="h-3.5 w-3.5" />
            Create Persona
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/[0.02]">
        <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md px-8 py-6">
          <div className="flex items-center gap-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter personas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-muted/30 pl-12 pr-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/40"
              />
            </div>
            <button className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-background px-6 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-muted transition-all">
              <Upload className="h-4 w-4" />
              Import
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPersonas.map((persona) => (
            <div
              key={persona.id}
              onClick={() => setSelectedPersona(persona)}
              className={cn(
                'group relative cursor-pointer card-professional p-6 hover:border-primary/30 hover:shadow-apple-lg',
                currentPersona?.id === persona.id
                  ? 'border-primary ring-4 ring-primary/5'
                  : 'border-border'
              )}
            >
              {currentPersona?.id === persona.id && (
                <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Check className="h-4 w-4" />
                </div>
              )}
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-white/10 shadow-sm text-white',
                    persona.color || getPersonaColor(personas.indexOf(persona))
                  )}
                >
                  <PersonaIcon icon={persona.icon} className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground truncate">{persona.name}</h3>
                    {persona.isDefault && (
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{persona.category}</p>
                    {persona.defaultProvider && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/5 border border-primary/10 text-[8px] font-black text-primary uppercase tracking-widest">
                        <Cpu className="h-2 w-2" />
                        Mapped
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs font-medium text-muted-foreground line-clamp-2 leading-relaxed">
                {persona.description}
              </p>
              
              <div className="mt-6 flex flex-wrap gap-1.5">
                {persona.capabilities.slice(0, 3).map((cap) => (
                  <span
                    key={cap}
                    className="rounded-full bg-secondary border border-border/50 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectPersona(persona);
                  }}
                  className={cn(
                    'rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                    currentPersona?.id === persona.id
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10'
                      : 'bg-secondary text-muted-foreground hover:bg-primary hover:text-primary-foreground'
                  )}
                >
                  {currentPersona?.id === persona.id ? 'Active' : 'Authorize'}
                </button>
                <div className="flex items-center gap-1.5 opacity-0 transition-all transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0">
                  <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground transition-colors">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPersona(persona);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPersona && (
        <div className="w-96 border-l border-border bg-card animate-in slide-in-from-right duration-300">
          <div className="border-b border-border bg-muted/30 px-8 py-6 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Trace Profile</h3>
            <button
              onClick={() => setSelectedPersona(null)}
              className="rounded-full p-2 hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-auto p-8 h-[calc(100vh-140px)] scrollbar-none">
            <div className="flex flex-col items-center text-center mb-8">
              <div
                className={cn(
                  'flex h-24 w-24 items-center justify-center rounded-[2rem] text-4xl text-white shadow-xl shadow-border/20 mb-6',
                  selectedPersona.color
                )}
              >
                <PersonaIcon icon={selectedPersona.icon} className="h-12 w-12" />
              </div>
              <h4 className="text-2xl font-bold tracking-tight text-foreground">{selectedPersona.name}</h4>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                {selectedPersona.category}
              </p>
            </div>
            
            <p className="text-sm font-medium text-muted-foreground leading-relaxed text-center mb-10">
              {selectedPersona.description}
            </p>

            <div className="space-y-10">
              <div className="space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
                  <Cpu className="h-3 w-3" />
                  Technical Competencies
                </h5>
                <div className="flex flex-wrap gap-2">
                  {selectedPersona.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="rounded-xl bg-secondary border border-border/50 px-3 py-1.5 text-[11px] font-bold text-foreground uppercase tracking-wider"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-muted/30 border border-border/50 p-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Decision Style</span>
                  <span className="text-xs font-bold text-foreground capitalize">{'Balanced'}</span>
                </div>
                <div className="rounded-2xl bg-muted/30 border border-border/50 p-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Risk Tolerance</span>
                  <span className="text-xs font-bold text-foreground capitalize">{'Medium'}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
                  <Scale className="h-3 w-3" />
                  Inference Constraints
                </h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-background border border-border/50">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Temperature</span>
                    <span className="text-xs font-black text-foreground">{selectedPersona.temperature}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-background border border-border/50">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Window</span>
                    <span className="text-xs font-black text-foreground">{selectedPersona.maxTokens}</span>
                  </div>
                </div>
              </div>

              {selectedPersona.restrictions.length > 0 && (
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
                    <Shield className="h-3 w-3" />
                    Operational Guards
                  </h5>
                  <ul className="space-y-3">
                    {selectedPersona.restrictions.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/[0.02] border border-rose-500/10">
                        <Lock className="mt-0.5 h-3.5 w-3.5 text-rose-500" />
                        <span className="text-xs font-medium text-rose-900/80 dark:text-rose-400/80">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-12 flex gap-3">
              <button
                onClick={() => selectPersona(selectedPersona)}
                className="flex-1 rounded-full bg-primary py-3 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-95"
              >
                Authorize Path
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background hover:bg-muted transition-all">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPersona && (
        <EditPersonaModal
          persona={editingPersona}
          isOpen={true}
          onClose={() => setEditingPersona(null)}
          onSave={handleSavePersona}
        />
      )}
    </div>
  );
}
