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
  CheckCircle,
  Menu
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
          width: sidebarCollapsed ? 64 : 240,
          transition: { type: "spring", bounce: 0, duration: 0.4 }
        }}
        className="relative z-40 flex flex-col border-r border-border bg-card/30 backdrop-blur-3xl"
      >
        {/* Logo Area - Tightened */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-border/20">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed ? (
              <motion.div 
                key="full-logo"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => navigate('/dashboard')}
              >
                <Logo size="sm" className="transition-transform duration-500 group-hover:rotate-[15deg]" />
                <span className="font-black tracking-tighter text-base bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
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

        {/* Sidebar Collapse Toggle - Integrated */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-16 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-apple transition-transform hover:scale-110 active:scale-95"
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        {/* Workspace Selector - Minified */}
        <div className="px-3 pb-4 pt-4">
          <button className={cn(
            "group flex w-full items-center gap-3 rounded-xl border border-border/40 bg-muted/20 p-2 text-sm font-bold transition-all hover:bg-muted/40 hover:border-border active:scale-[0.98]",
            sidebarCollapsed ? "justify-center" : "px-2.5"
          )}>
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/10 flex-shrink-0 transition-transform group-hover:scale-105">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            {!sidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-1 items-center justify-between min-w-0"
              >
                <span className="truncate uppercase tracking-widest text-[9px] font-black">{currentWorkspace?.name || 'Workspace'}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            )}
          </button>
        </div>

        {/* Navigation - Dense */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 scrollbar-none">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-black uppercase tracking-widest transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10'
                    : 'text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground',
                  sidebarCollapsed && 'justify-center px-0'
                )
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-all duration-300 group-hover:scale-110", sidebarCollapsed && "h-5 w-5")} />
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
              {sidebarCollapsed && (
                <NavLink to={item.path}>
                  {({ isActive }) => isActive && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-primary-foreground" />
                  )}
                </NavLink>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User & Settings - Dense Bottom */}
        <div className="mt-auto p-3 border-t border-border/20 space-y-3">
          <div className={cn(
            "flex items-center gap-2.5 p-1.5 rounded-xl bg-muted/10 border border-transparent transition-all hover:bg-muted/20",
            sidebarCollapsed ? "flex-col bg-transparent p-0" : ""
          )}>
            <div className={cn(
              "flex items-center gap-2.5 min-w-0",
              sidebarCollapsed ? "w-full justify-center" : "flex-1"
            )}>
              <div className="relative group">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-white text-[10px] font-black shadow-lg shadow-primary/10 transition-transform group-hover:scale-105">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] font-black text-foreground uppercase tracking-tight leading-none">{user?.name}</div>
                  <div className="truncate text-[8px] font-bold text-muted-foreground/50 mt-0.5 uppercase tracking-widest leading-none">Online</div>
                </div>
              )}
            </div>
            
            <div className={cn("flex gap-0.5", sidebarCollapsed && "flex-col w-full items-center mt-2")}>
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-primary transition-all active:scale-90"
              >
                {resolvedTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={handleLogout}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-all active:scale-90"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Header - Tightened to 56px */}
        <header className="absolute top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-border/30 bg-background/40 px-6 backdrop-blur-3xl">
          <div className="flex flex-1 items-center gap-4">
            {/* Command Search - Tightened */}
            <div className="relative group w-full max-w-sm">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              </div>
              <input 
                type="text"
                placeholder="Search..."
                className="h-9 w-full rounded-xl border border-border/40 bg-muted/20 pl-9 pr-12 text-xs font-bold transition-all focus:bg-background focus:border-primary/30 focus:outline-none focus:ring-4 focus:ring-primary/5 placeholder:text-muted-foreground/30 shadow-inner"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-background border border-border/60 shadow-sm pointer-events-none">
                <Command className="h-2.5 w-2.5 text-muted-foreground/60" />
                <span className="text-[8px] font-black text-muted-foreground/60">K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Stats - Minified */}
            <div className="hidden items-center gap-6 md:flex">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 leading-none">Runs</span>
                <span className="text-[11px] font-black text-foreground mt-0.5">128</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 leading-none">Active</span>
                <span className="text-[11px] font-black text-foreground mt-0.5">24</span>
              </div>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-xl transition-all border border-transparent active:scale-95",
                  showNotifications ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:border-border/60"
                )}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className={cn(
                    "absolute -right-0.5 -top-0.5 h-4 w-4 flex items-center justify-center rounded-full text-[8px] font-black border-2 border-background shadow-sm animate-in zoom-in-50",
                    showNotifications ? "bg-white text-primary" : "bg-primary text-white"
                  )}>
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="absolute right-0 mt-3 w-80 rounded-3xl border border-border bg-background p-2 shadow-2xl z-50 origin-top-right"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 mb-2">
                      <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Signals</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[9px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity">
                          Resolve All
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto scrollbar-none space-y-1">
                      {notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={cn(
                            "flex flex-col gap-1 rounded-2xl p-4 text-left transition-all cursor-pointer relative",
                            !notif.read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{notif.title}</span>
                            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">{notif.time}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Main View - pt-14 to match header */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 relative scrollbar-none">
          <div className="min-h-full w-full mx-auto animate-in fade-in duration-700">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
