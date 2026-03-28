import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Workflow, 
  ShieldCheck, 
  Zap, 
  X, 
  Check,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { useNotificationStore, Notification } from '@/stores/notification.store';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface NotificationPopoverProps {
  onClose: () => void;
}

export function NotificationPopover({ onClose }: NotificationPopoverProps) {
  const { notifications, markAsRead, markAllAsRead, isLoading } = useNotificationStore();
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case 'approval_request': return ShieldCheck;
      case 'approval_resolved': return CheckCircle;
      case 'workflow_complete': return Zap;
      case 'workflow_failed': return AlertCircle;
      case 'mention': return MessageSquare;
      default: return Bell;
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      await markAsRead(n.id);
    }
    if (n.actionUrl) {
      navigate(n.actionUrl);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute right-0 top-full mt-3 w-[380px] max-h-[500px] rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Signal Inbox</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => markAllAsRead()}
              className="text-[9px] font-black uppercase tracking-widest text-muted-content/60 hover:text-primary transition-colors"
            >
              Clear All
            </button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-all">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none">
          {isLoading && notifications.length === 0 ? (
            <div className="p-10 text-center text-label-sm animate-pulse italic">Synchronizing signals...</div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted/10 flex items-center justify-center">
                <Check className="h-6 w-6 text-muted-content/20" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-content/40 text-center leading-relaxed">
                No active signals.<br/>System integrity nominal.
              </span>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {notifications.map((n) => {
                const Icon = getIcon(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "p-5 flex gap-4 cursor-pointer hover:bg-muted/30 transition-all group relative",
                      !n.read && "bg-primary/[0.01]"
                    )}
                  >
                    {!n.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
                    )}
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border border-border/40",
                      !n.read ? "bg-primary/5 text-primary" : "bg-muted/10 text-muted-content/40"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-tight text-foreground truncate">
                          {n.title}
                        </span>
                        <span className="text-[8px] font-bold text-muted-content/40 uppercase">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-muted-content/60 leading-relaxed line-clamp-2 italic">
                        {n.message}
                      </p>
                    </div>
                    <div className="flex items-center group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100">
                      <ChevronRight className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 bg-muted/10 border-t border-border text-center">
          <button 
            onClick={() => { navigate('/settings'); onClose(); }}
            className="text-[8px] font-black uppercase tracking-widest text-muted-content/40 hover:text-primary transition-colors"
          >
            Configure Notification Policy
          </button>
        </div>
      </motion.div>
    </>
  );
}
