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
} from 'lucide-react';
import { toast } from 'sonner';

const defaultPersonas: Persona[] = [
  {
    id: 'auto',
    name: 'Auto (Recommended)',
    slug: 'auto',
    category: 'Meta',
    description: 'Automatically selects the best persona based on context',
    icon: '🎯',
    color: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    systemPrompt: '',
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
    icon: '👨‍💻',
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
    icon: '⚙️',
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
    icon: '📊',
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
    icon: '🚀',
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
    icon: '🔒',
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

export function PersonasPage() {
  const { currentPersona, setCurrentPersona } = usePersonaStore();
  const [personas] = useState<Persona[]>(defaultPersonas);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  const filteredPersonas = personas.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectPersona = (persona: Persona) => {
    setCurrentPersona(persona);
    toast.success(`Switched to ${persona.name}`);
  };

  return (
    <div className="flex h-full">
      {/* Categories Sidebar */}
      <div className="w-56 border-r border-border bg-card">
        <div className="p-4">
          <h2 className="font-semibold">Categories</h2>
        </div>
        <nav className="space-y-1 px-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
            >
              <category.icon className="h-4 w-4" />
              {category.name}
            </button>
          ))}
        </nav>
        <div className="mt-4 border-t border-border p-4">
          <button className="flex w-full items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm hover:bg-secondary/80">
            <Plus className="h-4 w-4" />
            Create Persona
          </button>
        </div>
      </div>

      {/* Persona Grid */}
      <div className="flex-1 overflow-auto">
        {/* Search Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search personas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button className="flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm hover:bg-accent">
              <Upload className="h-4 w-4" />
              Import
            </button>
          </div>
        </div>

        {/* Persona Cards */}
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPersonas.map((persona) => (
            <div
              key={persona.id}
              onClick={() => setSelectedPersona(persona)}
              className={cn(
                'group relative cursor-pointer rounded-xl border bg-card p-4 transition-all hover:shadow-md',
                currentPersona?.id === persona.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {currentPersona?.id === persona.id && (
                <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" />
                </div>
              )}
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl text-2xl',
                    persona.color || getPersonaColor(personas.indexOf(persona))
                  )}
                >
                  {persona.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{persona.name}</h3>
                    {persona.isDefault && (
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{persona.category}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                {persona.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {persona.capabilities.slice(0, 3).map((cap) => (
                  <span
                    key={cap}
                    className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                  >
                    {cap}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectPersona(persona);
                  }}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    currentPersona?.id === persona.id
                      ? 'bg-primary/10 text-primary'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {currentPersona?.id === persona.id ? 'Active' : 'Select'}
                </button>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Persona Details Panel */}
      {selectedPersona && (
        <div className="w-80 border-l border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Persona Details</h3>
              <button
                onClick={() => setSelectedPersona(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          </div>
          <div className="overflow-auto p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-xl text-3xl',
                  selectedPersona.color
                )}
              >
                {selectedPersona.icon}
              </div>
              <div>
                <h4 className="font-semibold">{selectedPersona.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedPersona.category}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm">{selectedPersona.description}</p>

            <div className="mt-6 space-y-4">
              <div>
                <h5 className="mb-2 text-sm font-medium">Capabilities</h5>
                <div className="flex flex-wrap gap-1">
                  {selectedPersona.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="rounded-full bg-secondary px-2 py-1 text-xs"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="mb-2 text-sm font-medium">Response Style</h5>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Tone: {selectedPersona.responseStyle.tone}</div>
                  <div>Verbosity: {selectedPersona.responseStyle.verbosity}</div>
                </div>
              </div>

              <div>
                <h5 className="mb-2 text-sm font-medium">Model Settings</h5>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Temperature: {selectedPersona.temperature}</div>
                  <div>Max Tokens: {selectedPersona.maxTokens}</div>
                  <div>Top P: {selectedPersona.topP}</div>
                </div>
              </div>

              {selectedPersona.restrictions.length > 0 && (
                <div>
                  <h5 className="mb-2 text-sm font-medium">Restrictions</h5>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selectedPersona.restrictions.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Shield className="mt-0.5 h-3 w-3 text-amber-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => selectPersona(selectedPersona)}
                className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground"
              >
                Use This Persona
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-md border border-input hover:bg-accent">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
