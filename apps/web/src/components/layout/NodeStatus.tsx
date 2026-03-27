import { useState, useEffect } from 'react';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Activity, ShieldCheck, AlertCircle, Server, Database, Zap, ChevronDown, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HealthService {
  name: string;
  status: 'up' | 'down';
  latencyMs?: number;
  message?: string;
  version?: string;
}

interface GlobalHealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  services: HealthService[];
}

export function NodeStatus() {
  const [health, setHealth] = useState<GlobalHealthResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = async () => {
    setIsRefreshing(true);
    try {
      const response = await apiHelpers.getGlobalHealth();
      setHealth(response.data as GlobalHealthResponse);
    } catch (error) {
      console.error('Failed to sync node status');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const getServiceIcon = (name: string) => {
    if (name.includes('database')) return Database;
    if (name.includes('dax')) return Zap;
    if (name.includes('redis')) return Server;
    return Activity;
  };

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all active:scale-95",
          isHealthy 
            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10" 
            : "bg-rose-500/5 border-rose-500/20 text-rose-600 hover:bg-rose-500/10"
        )}
      >
        <div className="relative">
          <Activity className={cn("h-3.5 w-3.5", isHealthy && "animate-pulse")} />
          {isHealthy && (
            <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
          )}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
          Node {isHealthy ? 'Operational' : 'Impaired'}
        </span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 bottom-full mb-3 w-72 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={cn("h-4 w-4", isHealthy ? "text-emerald-500" : "text-rose-500")} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Workstation Health</span>
                </div>
                <button onClick={fetchHealth} disabled={isRefreshing}>
                  <RefreshCw className={cn("h-3 w-3 text-muted-foreground/40 hover:text-primary transition-colors", isRefreshing && "animate-spin")} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {health?.services.map((service) => {
                  const Icon = getServiceIcon(service.name);
                  const up = service.status === 'up';
                  return (
                    <div key={service.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center transition-colors border",
                          up ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600" : "bg-rose-500/5 border-rose-500/10 text-rose-600"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-tight text-foreground">{service.name}</span>
                          <span className="text-[9px] font-medium text-muted-foreground/60 leading-none">
                            {up ? `${service.latencyMs || 0}ms response` : service.message || 'Connection offline'}
                          </span>
                        </div>
                      </div>
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        up ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)] animate-pulse"
                      )} />
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-muted/10 border-t border-border flex items-center justify-between">
                <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">Core v{health?.version || '1.0.0'}</span>
                <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">Sync: {health ? new Date(health.timestamp).toLocaleTimeString() : 'Never'}</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
