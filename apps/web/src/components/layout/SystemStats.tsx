import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Database, Zap, HardDrive, Activity } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SystemMetrics {
  cpu: { load: number; cores: number[] };
  memory: { total: number; used: number; percentage: number };
  storage: { total: number; used: number; percentage: number };
  gpu?: { name: string; utilization: number; temperature: number } | null;
}

export function SystemStats() {
  const [stats, setStats] = useState<SystemMetrics | null>(null);

  const fetchStats = async () => {
    try {
      const response = await apiHelpers.getSystemStats();
      setStats(response.data);
    } catch (error) {
      // Silently fail for background stats
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-muted/5 border border-border/40 rounded-2xl backdrop-blur-sm shadow-sm">
      <StatItem
        icon={Cpu}
        label="CPU"
        value={`${stats.cpu.load}%`}
        percentage={stats.cpu.load}
        color="bg-blue-500"
      />
      <div className="h-8 w-px bg-border/40" />
      <StatItem
        icon={Zap}
        label="RAM"
        value={`${stats.memory.percentage}%`}
        percentage={stats.memory.percentage}
        color="bg-emerald-500"
      />
      <div className="h-8 w-px bg-border/40" />
      <StatItem
        icon={HardDrive}
        label="ROM"
        value={`${stats.storage.percentage}%`}
        percentage={stats.storage.percentage}
        color="bg-amber-500"
      />
      {stats.gpu && (
        <>
          <div className="h-8 w-px bg-border/40" />
          <StatItem
            icon={Activity}
            label="GPU"
            value={`${stats.gpu.utilization}%`}
            percentage={stats.gpu.utilization}
            color="bg-purple-500"
          />
        </>
      )}
    </div>
  );
}

function StatItem({ 
  icon: Icon, 
  label, 
  value, 
  percentage, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  percentage: number; 
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[70px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-muted-content/60" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-content/40">{label}</span>
        </div>
        <span className="text-[10px] font-black tabular-nums">{value}</span>
      </div>
      <div className="h-1 w-full bg-muted/20 rounded-full overflow-hidden relative">
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
        {/* Subtle Pulse for high usage */}
        {percentage > 80 && (
          <motion.div
            className={cn("absolute inset-0 opacity-40 shadow-[0_0_8px_rgba(255,255,255,0.3)]", color)}
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </div>
    </div>
  );
}
