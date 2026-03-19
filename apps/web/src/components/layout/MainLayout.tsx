import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { usePersonaStore } from '@/stores/persona.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  LayoutDashboard,
  MessageSquare,
  Terminal,
  GitBranch,
  Users,
  BarChart3,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Search,
  Bell,
  Plus,
  Command,
  Monitor,
  Sparkles,
  Bot,
  ChevronDown,
  CheckCircle
} from 'lucide-react';
import { useTheme } from '@/components/common/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/common/Logo';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { path: '/terminal', icon: Terminal, label: 'Terminal' },
  { path: '/workflows', icon: GitBranch, label: 'Workflows' },
  { path: '/dax', icon: Activity, label: 'DAX Control' },
  { path: '/personas', icon: Users, label: 'Personas' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const mockNotifications = [
  { id: 1, title: 'Workflow Completed', message: 'The deployment pipeline finished successfully.', time: '5m ago', read: false, type: 'success' },
  { id: 2, title: 'Approval Required', message: 'A high-risk file write action is waiting for your authorization.', time: '12m ago', read: false, type: 'warning' },
  { id: 3, title: 'New Persona Added', message: 'Team admin added a new QA Automation Engineer persona.', time: '1h ago', read: true, type: 'info' },
];

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  
  const { user, logout } = useAuthStore();
  const { currentPersona } = usePersonaStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setShowNotifications(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-primary/30 font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarCollapsed ? 80 : 280,
          transition: { type: "spring", bounce: 0, duration: 0.4 }
        }}
        className="relative z-40 flex flex-col border-r border-border bg-card/30 backdrop-blur-2xl"
      >
        {/* Logo Area */}
        <div className="flex h-20 items-center justify-between px-5">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed ? (
              <motion.div 
                key="full-logo"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => navigate('/dashboard')}
              >
                <Logo size="md" className="transition-transform duration-500 group-hover:rotate-[15deg]" />
                <span className="font-bold tracking-tight text-xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Soothsayer
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mx-auto cursor-pointer"
                onClick={() => navigate('/dashboard')}
              >
                <Logo size="sm" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-apple transition-transform hover:scale-110 active:scale-95"
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        {/* Workspace Selector */}
        <div className="px-4 pb-6 pt-2">
          <button className={cn(
            "group flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-2.5 text-sm font-bold transition-all hover:bg-muted/40 hover:border-border active:scale-[0.98]",
            sidebarCollapsed ? "justify-center px-2.5" : "px-3"
          )}>
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/10 flex-shrink-0 transition-transform group-hover:scale-105">
              <Sparkles className="h-4 w-4" />
            </div>
            {!sidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-1 items-center justify-between min-w-0"
              >
                <span className="truncate uppercase tracking-widest text-[10px]">{currentWorkspace?.name || 'Workspace'}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-2 scrollbar-none">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-300',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  sidebarCollapsed && 'justify-center px-0'
                )
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={cn("h-4.5 w-4.5 flex-shrink-0 transition-all duration-300 group-hover:scale-110", sidebarCollapsed && "h-5 w-5")} />
              {!sidebarCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, x: -5 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="truncate"
                >
                  {item.label}
                </motion.span>
              )}
              {/* Active Indicator Dot */}
              <NavLink to={item.path}>
                {({ isActive }) => isActive && sidebarCollapsed && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-primary-foreground" />
                )}
              </NavLink>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto p-4 space-y-4">
          {/* Persona Indicator */}
          {!sidebarCollapsed && currentPersona && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/40 bg-muted/20 p-4 shadow-inner"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-background shadow-sm border border-border/50">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-black text-foreground uppercase tracking-tight">{currentPersona.name}</div>
                  <div className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{currentPersona.category}</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* User & Settings */}
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-[1.5rem] bg-muted/10 border border-transparent transition-all hover:bg-muted/20",
            sidebarCollapsed ? "flex-col border-none bg-transparent p-0" : "pr-3"
          )}>
            <div className={cn(
              "flex items-center gap-3 min-w-0",
              sidebarCollapsed ? "w-full justify-center" : "flex-1"
            )}>
              <div className="relative group">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-black shadow-lg shadow-primary/10 transition-transform group-hover:scale-105">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-black text-foreground uppercase tracking-tight">{user?.name}</div>
                  <div className="truncate text-[10px] font-bold text-muted-foreground/50">{user?.email}</div>
                </div>
              )}
            </div>
            
            <div className={cn("flex gap-1", sidebarCollapsed && "flex-col w-full items-center")}>
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-background hover:text-primary transition-all active:scale-90"
                title="Toggle Theme"
              >
                {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-all active:scale-90"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-30 flex h-20 items-center justify-between border-b border-border/30 bg-background/40 px-10 backdrop-blur-2xl">
          <div className="flex flex-1 items-center gap-6">
            {/* Context Breadcrumb or Status */}
            <div className="hidden items-center gap-3 lg:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/5 border border-primary/10 text-primary">
                <Activity className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none">System Status</span>
                <span className="text-xs font-bold text-emerald-600 mt-1">Operator Online</span>
              </div>
            </div>

            {/* Command Search */}
            <div className="relative group w-full max-w-md ml-4">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              </div>
              <input 
                type="text"
                placeholder="Search resources, traces, or documentation..."
                className="h-11 w-full rounded-2xl border border-border/40 bg-muted/20 pl-11 pr-16 text-sm font-medium transition-all focus:bg-background focus:border-primary/30 focus:outline-none focus:ring-4 focus:ring-primary/5 placeholder:text-muted-foreground/30 shadow-inner"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background border border-border/60 shadow-sm pointer-events-none">
                <Command className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-[9px] font-black text-muted-foreground/60">K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Quick Stats or Actions */}
            <div className="hidden items-center gap-8 md:flex">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Authorized Runs</span>
                <span className="text-xs font-black text-foreground">128</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Active Tasks</span>
                <span className="text-xs font-black text-foreground">24</span>
              </div>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all border border-transparent active:scale-95",
                  showNotifications ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:border-border/60 hover:text-foreground"
                )}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className={cn(
                    "absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center rounded-full text-[10px] font-black border-2 border-background shadow-sm animate-in zoom-in-50",
                    showNotifications ? "bg-white text-primary" : "bg-primary text-white"
                  )}>
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="absolute right-0 mt-4 w-96 rounded-[2.5rem] border border-border bg-background p-3 shadow-2xl z-50 origin-top-right shadow-primary/5"
                  >
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 mb-3 bg-muted/10 rounded-t-[2.2rem]">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/10">
                          <Bell className="h-4 w-4" />
                        </div>
                        <h3 className="font-black text-sm uppercase tracking-widest">Signals</h3>
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity">
                          Resolve All
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto scrollbar-none space-y-2 p-1">
                      {notifications.length > 0 ? (
                        notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            className={cn(
                              "group flex flex-col gap-2 rounded-3xl p-5 text-left transition-all duration-300 border border-transparent cursor-pointer relative overflow-hidden",
                              !notif.read ? "bg-muted/[0.03] border-primary/10 hover:bg-muted/[0.05]" : "hover:bg-muted/30"
                            )}
                            onClick={() => {
                              setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                            }}
                          >
                            {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "text-xs font-black uppercase tracking-widest",
                                !notif.read ? "text-primary" : "text-muted-foreground/60"
                              )}>
                                {notif.title}
                              </span>
                              <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">{notif.time}</span>
                            </div>
                            <p className={cn(
                              "text-sm leading-relaxed",
                              !notif.read ? "text-foreground font-bold" : "text-muted-foreground font-medium"
                            )}>
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Acknowledge</span>
                              <ChevronRight className="h-3 w-3 text-primary translate-x-[-4px] group-hover:translate-x-0 transition-transform" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center">
                          <div className="mx-auto h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                            <CheckCircle className="h-6 w-6 text-muted-foreground/20" />
                          </div>
                          <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">No Active Signals</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Main View */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-20 relative scrollbar-none">
          <div className="min-h-full w-full max-w-[1600px] mx-auto animate-in fade-in duration-1000 slide-in-from-bottom-2">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
