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
  Zap
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
    <div className="page-container flex flex-col gap-10">
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 w-fit text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Activity className="h-3 w-3" />
          Operator View
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Welcome back, {user?.name?.split(' ')[0] || 'Operator'}
        </h1>
        <p className="text-base font-medium text-muted-foreground">
          Workspace systems are nominal. No critical interventions required.
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Core Operations</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {quickActions.map((action, index) => (
            <Link
              key={action.path}
              to={action.path}
              className="group card-professional p-6 flex flex-col items-center gap-4 hover:border-primary/30 hover:scale-[1.02]"
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-[1rem] text-white shadow-xl transition-transform duration-300 group-hover:-translate-y-1',
                  action.color
                )}
              >
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card-professional p-6 flex flex-col gap-4 bg-muted/[0.02]"
          >
            <div className="flex items-center justify-between">
              <stat.icon className="h-5 w-5 text-primary/40" />
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                {stat.change}
              </span>
            </div>
            <div>
              <div className="text-3xl font-black tracking-tight text-foreground">{stat.value}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Current Persona */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-professional p-8 flex flex-col"
        >
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Policy Profile</h2>
            <Link
              to="/personas"
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
            >
              Modify <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {currentPersona ? (
            <div className="flex items-start gap-6 flex-1">
              <div className={cn(
                "flex h-16 w-16 items-center justify-center rounded-[1.25rem] text-3xl text-white shadow-xl shadow-border/20 flex-shrink-0",
                currentPersona.color || "bg-primary"
              )}>
                <Zap className="h-8 w-8" />
              </div>
              <div className="flex flex-col h-full">
                <h3 className="text-xl font-bold tracking-tight">{currentPersona.name}</h3>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">{currentPersona.category}</p>
                <p className="mt-3 text-sm font-medium text-muted-foreground leading-relaxed">
                  {currentPersona.description}
                </p>
                <div className="mt-auto pt-6 flex flex-wrap gap-2">
                  {currentPersona.capabilities.slice(0, 3).map((cap) => (
                    <span
                      key={cap}
                      className="rounded-lg bg-secondary border border-border/50 px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-muted/20 rounded-[1.5rem] border border-dashed border-border/60">
              <Users className="mb-4 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">No Profile Selected</p>
              <p className="text-xs font-medium text-muted-foreground mt-1 max-w-[200px]">Execution will use system defaults.</p>
              <Link
                to="/personas"
                className="mt-6 rounded-full bg-primary px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/10"
              >
                Select Profile
              </Link>
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-professional p-8"
        >
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Recent Traces</h2>
            <Link
              to="/analytics"
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
            >
              Full Log <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="group flex items-center gap-4 rounded-2xl border border-transparent hover:border-border hover:bg-muted/30 p-3 transition-all"
              >
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm border transition-colors',
                    activity.status === 'completed' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white',
                    activity.status === 'running' && 'bg-blue-500/10 text-blue-600 border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white',
                    activity.status === 'failed' && 'bg-rose-500/10 text-rose-600 border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white'
                  )}
                >
                  {activity.status === 'completed' && <CheckCircle className="h-5 w-5" />}
                  {activity.status === 'running' && <Clock className="h-5 w-5 animate-pulse" />}
                  {activity.status === 'failed' && <AlertCircle className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{activity.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{activity.type}</span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="text-[10px] font-medium text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
