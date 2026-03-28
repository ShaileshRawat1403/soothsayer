import { useAuthStore } from '@/stores/auth.store';
import { usePersonaStore } from '@/stores/persona.store';
import {
  MessageSquare,
  Terminal,
  GitBranch,
  Users,
  CheckCircle,
  Activity,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const quickActions = [
  { icon: MessageSquare, label: 'Chat', path: '/chat', color: 'text-blue-500 bg-blue-500/5' },
  {
    icon: Terminal,
    label: 'Terminal',
    path: '/terminal',
    color: 'text-emerald-500 bg-emerald-500/5',
  },
  {
    icon: GitBranch,
    label: 'Workflows',
    path: '/workflows',
    color: 'text-purple-500 bg-purple-500/5',
  },
  { icon: Users, label: 'Personas', path: '/personas', color: 'text-orange-500 bg-orange-500/5' },
];

const stats = [
  { label: 'Authorized Runs', value: '128', icon: Terminal },
  { label: 'Active Tasks', value: '24', icon: Activity },
  { label: 'Success Rate', value: '94%', icon: CheckCircle },
];

export function DashboardPage() {
  const { user } = useAuthStore();
  const { currentPersona } = usePersonaStore();

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 md:gap-12 p-6 md:p-12 animate-in-up">
      {/* Header */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-label">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.2)]" />
          Node Operational
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">
          Welcome, {user?.name?.split(' ')[0] || 'Operator'}
        </h1>
        <p className="text-sm md:text-base font-medium text-secondary-content max-w-xl leading-relaxed">
          Inference handshake established. Accessing decentralized execution context.
        </p>
      </section>

      {/* Primary Grid */}
      <div className="grid gap-6 md:gap-10 lg:grid-cols-3">
        {/* Quick Access */}
        <section className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="group flex items-center justify-between p-5 md:p-7 rounded-2xl border border-border/40 bg-card/20 hover-lift hover-glow"
            >
              <div className="flex items-center gap-4 md:gap-5">
                <div
                  className={cn(
                    'flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-[1.25rem] transition-all duration-500 group-hover:scale-110',
                    action.color
                  )}
                >
                  <action.icon className="h-5 w-5 md:h-5.5 md:w-5.5" />
                </div>
                <span className="text-[11px] md:text-[13px] font-black uppercase tracking-widest text-secondary-content group-hover:text-foreground transition-colors duration-300">
                  {action.label}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-subtle-content group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
            </Link>
          ))}
        </section>

        {/* Status Profile */}
        <section className="flex flex-col">
          <div className="flex-1 rounded-[2rem] border border-primary/5 bg-primary/[0.01] p-8 md:p-10 flex flex-col justify-between relative overflow-hidden group hover-glow">
            <div className="relative z-10">
              <span className="text-label-sm block mb-6 md:mb-8 opacity-60">Authority Node</span>
              <div className="flex items-center gap-4 md:gap-5">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/10 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                  <Zap className="h-6 w-6 md:h-7 md:w-7 fill-current" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black tracking-tight leading-none uppercase">
                    {currentPersona?.name || 'Standard'}
                  </h3>
                  <p className="text-label-sm mt-2">{currentPersona?.category || 'General'}</p>
                </div>
              </div>
            </div>
            <Link to="/personas" className="relative z-10 mt-8 md:mt-12 btn-primary text-center py-3">
              Switch Identity
            </Link>
          </div>
        </section>
      </div>

      {/* Metrics Row */}
      <section className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 md:p-8 rounded-2xl border border-border/40 bg-card/10 flex items-center justify-between hover-glow group transition-all"
          >
            <div className="space-y-1">
              <span className="text-label">{stat.label}</span>
              <div className="text-2xl md:text-3xl font-black text-foreground">{stat.value}</div>
            </div>
            <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-muted-content group-hover:text-primary transition-colors duration-500" />
          </div>
        ))}
      </section>

      {/* Trace Buffer */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-label">Execution Buffer</h2>
          <Link to="/analytics" className="text-interactive text-primary">
            Full Audit
          </Link>
        </div>
        <div className="grid gap-3">
          {[
            {
              t: 'Security policy audit established',
              s: 'completed',
              m: 'Direct Execution',
              time: '2m ago',
            },
            {
              t: 'Repository context alignment',
              s: 'running',
              m: 'Workflow Trace',
              time: '15m ago',
            },
            { t: 'Inference node handshake', s: 'completed', m: 'System Signal', time: '1h ago' },
          ].map((trace, i) => (
            <div
              key={i}
              className="group flex items-center justify-between p-5 rounded-2xl border border-border/40 bg-card/5 hover:bg-card/20 hover:border-primary/10 transition-all duration-300"
            >
              <div className="flex items-center gap-6">
                <div
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    trace.s === 'completed' ? 'bg-emerald-500/40' : 'bg-blue-500/40 animate-pulse'
                  )}
                />
                <div>
                  <span className="text-[13px] font-bold text-foreground group-hover:text-primary transition-colors duration-300 uppercase tracking-tight">
                    {trace.t}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-meta">{trace.m}</span>
                    <span className="h-1 w-1 rounded-full bg-border/40" />
                    <span className="text-meta">{trace.time}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-content group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
