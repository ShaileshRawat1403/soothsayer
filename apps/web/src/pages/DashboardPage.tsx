import { useAuthStore } from '@/stores/auth.store';
import { usePersonaStore } from '@/stores/persona.store';
import {
  MessageSquare,
  Terminal,
  GitBranch,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Activity,
  Zap,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
  Search,
  Command as CommandIcon,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const quickActions = [
  { icon: MessageSquare, label: 'Initiate Chat', path: '/chat', color: 'bg-blue-500 shadow-blue-500/20' },
  { icon: Terminal, label: 'Direct Execution', path: '/terminal', color: 'bg-emerald-500 shadow-emerald-500/20' },
  { icon: GitBranch, label: 'New Workflow', path: '/workflows', color: 'bg-purple-500 shadow-purple-500/20' },
  { icon: Users, label: 'Select Persona', path: '/personas', color: 'bg-orange-500 shadow-orange-500/20' },
];

const recentActivities = [
  { type: 'chat', title: 'Context alignment initiated', time: '2 min ago', status: 'completed' },
  { type: 'command', title: 'Security policy applied', time: '15 min ago', status: 'completed' },
  { type: 'workflow', title: 'Staging deployment trace', time: '1 hour ago', status: 'running' },
  { type: 'chat', title: 'API architecture defined', time: '3 hours ago', status: 'completed' },
  { type: 'command', title: 'Data synchronization', time: '5 hours ago', status: 'failed' },
];

const stats = [
  { label: 'Authorized Runs', value: '128', change: '+12%', icon: Terminal },
  { label: 'Active Workflows', value: '24', change: '+8%', icon: GitBranch },
  { label: 'Open Intents', value: '56', change: '+24%', icon: MessageSquare },
  { label: 'Execution Success', value: '94%', change: '+2%', icon: TrendingUp },
];

export function DashboardPage() {
  const { user } = useAuthStore();
  const { currentPersona } = usePersonaStore();

  return (
    <div className="page-container flex flex-col gap-12 pb-20">
      {/* Welcome Section */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-3"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 border border-primary/10 px-4 py-1.5 w-fit text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            <Activity className="h-3 w-3" />
            System Nominal
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-foreground">
            Welcome back, {user?.name?.split(' ')[0] || 'Operator'}
          </h1>
          <p className="text-lg font-medium text-muted-foreground max-w-2xl leading-relaxed">
            Your governed AI workspace is synchronized. Review active traces or initiate a new autonomous instruction.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hidden xl:flex items-center gap-10"
        >
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Queue Depth</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tighter">04</span>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Active</span>
            </div>
          </div>
          <div className="h-12 w-px bg-border/60" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Threat Level</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tighter text-blue-600">Low</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Quick Actions */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={action.path}
              to={action.path}
              className="group card-professional p-8 flex flex-col items-start gap-6 hover:border-primary/40 hover:shadow-apple-lg hover:-translate-y-1 transition-all duration-500 bg-background"
            >
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-[1.5rem] text-white shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3',
                  action.color
                )}
              >
                <action.icon className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-primary transition-colors">Launch</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-foreground">{action.label}</span>
                  <ChevronRight className="h-4 w-4 text-primary opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* Main Grid */}
      <div className="grid gap-10 xl:grid-cols-3">
        {/* Statistics and Insights */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="card-professional p-10 flex flex-col justify-between gap-8 bg-muted/[0.03] border-border/60"
            >
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-sm border border-primary/5">
                  <stat.icon className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest shadow-sm">
                  {stat.change}
                </span>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">{stat.label}</div>
                <div className="text-5xl font-black tracking-tighter text-foreground">{stat.value}</div>
              </div>
            </div>
          ))}
        </motion.section>

        {/* Current Active Persona */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col"
        >
          <div className="card-professional p-10 flex flex-col h-full bg-primary text-white shadow-2xl shadow-primary/20 border-none relative overflow-hidden group">
            {/* Background Decoration */}
            <div className="absolute -right-10 -bottom-10 h-64 w-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-700" />
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-10 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Active Authority</span>
                <Link to="/personas" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {currentPersona ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="h-20 w-20 rounded-[2rem] bg-white text-primary flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                      <Zap className="h-10 w-10 fill-current" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black tracking-tighter leading-none">{currentPersona.name}</h3>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{currentPersona.category}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8">
                    <p className="text-sm font-medium text-white/80 leading-relaxed italic">
                      "{currentPersona.description}"
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2">
                    {currentPersona.capabilities.slice(0, 4).map((cap) => (
                      <span
                        key={cap}
                        className="rounded-lg bg-white/10 border border-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="h-16 w-16 text-white/20 mb-6" />
                  <h3 className="text-xl font-bold tracking-tight">Select Profile</h3>
                  <p className="text-sm text-white/60 mt-2 max-w-[200px]">Define the behavioral persona for active runs.</p>
                  <Link to="/personas" className="mt-8 button-professional bg-white text-primary font-black uppercase tracking-widest text-[10px] px-10">
                    Profiles
                  </Link>
                </div>
              )}
            </div>
          </div>
        </motion.section>
      </div>

      {/* Activity Timeline */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-professional p-10 bg-background"
      >
        <div className="mb-10 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Operational Traces</h2>
            <h3 className="text-2xl font-black tracking-tighter">Recent Session History</h3>
          </div>
          <Link
            to="/analytics"
            className="button-professional border border-border px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Audit Trail
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentActivities.map((activity, index) => (
            <div
              key={index}
              className="group flex flex-col gap-6 p-6 rounded-[2rem] border border-border/60 hover:border-primary/20 hover:bg-muted/[0.02] transition-all duration-500"
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm border transition-all duration-500 group-hover:scale-110',
                    activity.status === 'completed' && 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
                    activity.status === 'running' && 'bg-blue-500/5 text-blue-600 border-blue-500/10',
                    activity.status === 'failed' && 'bg-rose-500/5 text-rose-600 border-rose-500/10'
                  )}
                >
                  {activity.status === 'completed' && <CheckCircle className="h-6 w-6" />}
                  {activity.status === 'running' && <Clock className="h-6 w-6 animate-pulse" />}
                  {activity.status === 'failed' && <AlertTriangle className="h-6 w-6" />}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{activity.time}</span>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-[0.2em] mt-1",
                    activity.status === 'completed' ? "text-emerald-600" :
                    activity.status === 'running' ? "text-blue-600" : "text-rose-600"
                  )}>{activity.status}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary/40">{activity.type}</div>
                <p className="text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors">{activity.title}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
