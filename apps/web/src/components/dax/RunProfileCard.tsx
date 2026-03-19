import { 
  User, 
  Cpu, 
  Settings2, 
  ShieldCheck, 
  Target, 
  Box,
  Fingerprint
} from 'lucide-react';
import type { DaxRunSnapshot, DaxStreamEvent } from '@/types/dax';

interface RunProfileCardProps {
  snapshot: DaxRunSnapshot;
  events: DaxStreamEvent[];
}

export function RunProfileCard({ snapshot, events }: RunProfileCardProps) {
  // Try to find persona and provider info from the run.created event
  const createdEvent = events.find(e => e.type === 'run.created');
  const personaPreset = (createdEvent?.payload?.personaPreset || {}) as any;
  
  const profileItems = [
    {
      label: 'Persona',
      value: personaPreset.personaId || 'Standard Architect',
      icon: <User className="h-3.5 w-3.5" />,
      description: 'The AI behavioral profile'
    },
    {
      label: 'Engine',
      value: personaPreset.providerHint || 'System Default',
      icon: <Cpu className="h-3.5 w-3.5" />,
      description: 'Model provider path'
    },
    {
      label: 'Model',
      value: personaPreset.modelHint || 'GPT-4.1 (Standard)',
      icon: <Fingerprint className="h-3.5 w-3.5" />,
      description: 'Specific inference model'
    },
    {
      label: 'Approval',
      value: personaPreset.approvalMode || 'Balanced',
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      description: 'Human-in-the-loop policy'
    },
    {
      label: 'Risk',
      value: personaPreset.riskLevel || 'Medium',
      icon: <Settings2 className="h-3.5 w-3.5" />,
      description: 'Execution safety posture'
    },
    {
      label: 'Target',
      value: snapshot.sourceSystem || 'Soothsayer',
      icon: <Target className="h-3.5 w-3.5" />,
      description: 'Originating system'
    }
  ];

  return (
    <section className="card-professional overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Box className="h-4 w-4" />
          Execution Profile
        </h2>
      </div>
      
      <div className="divide-y divide-border/50">
        {profileItems.map((item) => (
          <div key={item.label} className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/20">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-secondary p-2 text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground">
                {item.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {item.value}
                </span>
              </div>
            </div>
            <div className="hidden text-right lg:block">
              <span className="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                {item.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
