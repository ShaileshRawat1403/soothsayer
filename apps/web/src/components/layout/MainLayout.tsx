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
  Monitor
} from 'lucide-react';
import { useTheme } from '@/components/common/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';

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

// Mock notifications for UI demonstration
const mockNotifications = [
  { id: 1, title: 'Workflow Completed', message: 'The deployment pipeline finished successfully.', time: '5m ago', read: false },
  { id: 2, title: 'Approval Required', message: 'A high-risk file write action is waiting for your authorization.', time: '12m ago', read: false },
  { id: 3, title: 'New Persona Added', message: 'Team admin added a new QA Automation Engineer persona.', time: '1h ago', read: true },
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

  // Close notifications on navigation
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
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-primary/30">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarCollapsed ? 72 : 280,
          transition: { type: "spring", bounce: 0, duration: 0.4 }
        }}
        className="relative z-40 flex flex-col border-r border-border bg-card/50 backdrop-blur-xl"
      >
        {/* Logo Area */}
        <div className="flex h-16 items-center justify-between px-4">
          <AnimatePresence mode="popLayout">
            {!sidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                className="flex items-center gap-3 overflow-hidden whitespace-nowrap"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <span className="text-sm font-bold tracking-tighter">S</span>
                </div>
                <span className="font-bold tracking-tight text-lg">Soothsayer</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Workspace Selector */}
        <div className="px-3 pb-4">
          <button className={cn(
            "flex w-full items-center justify-between rounded-xl border border-transparent bg-secondary/50 p-2 text-sm font-medium transition-all hover:bg-secondary hover:border-border",
            sidebarCollapsed ? "justify-center px-0" : "px-3"
          )}>
            {!sidebarCollapsed ? (
              <>
                <div className="flex items-center gap-2 truncate">
                  <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                    W
                  </div>
                  <span className="truncate">{currentWorkspace?.name || 'Workspace'}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </>
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                W
              </div>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-none">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  sidebarCollapsed && 'justify-center px-0'
                )
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110", sidebarCollapsed && "h-5 w-5")} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto p-3">
          {/* Persona Indicator */}
          {!sidebarCollapsed && currentPersona && (
            <div className="mb-4 rounded-2xl border border-border/50 bg-secondary/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-background shadow-sm border border-border/50">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-foreground">{currentPersona.name}</div>
                  <div className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{currentPersona.category}</div>
                </div>
              </div>
            </div>
          )}

          {/* User & Settings */}
          <div className={cn("flex items-center gap-2", sidebarCollapsed ? "flex-col" : "justify-between")}>
            {!sidebarCollapsed && user && (
              <div className="flex flex-1 items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-bold text-primary-foreground shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">{user.name}</div>
                  <div className="truncate text-[10px] font-medium text-muted-foreground">{user.email}</div>
                </div>
              </div>
            )}
            
            <div className={cn("flex gap-1", sidebarCollapsed && "flex-col w-full")}>
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className={cn("flex h-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors", sidebarCollapsed ? "w-full" : "w-9")}
                title="Toggle Theme"
              >
                {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={handleLogout}
                className={cn("flex h-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-colors", sidebarCollapsed ? "w-full" : "w-9")}
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
        <header className="absolute top-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-b border-border/40 bg-background/60 px-6 backdrop-blur-xl">
          <div className="flex flex-1 items-center gap-4">
            {/* Command Search */}
            <button className="group flex h-9 w-full max-w-sm items-center gap-2 rounded-full border border-border/50 bg-secondary/30 px-4 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary/80 hover:border-border">
              <Search className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              <span>Search or jump to...</span>
              <kbd className="ml-auto hidden rounded-md bg-background px-2 py-0.5 text-[10px] font-bold uppercase border border-border/50 sm:inline-block shadow-sm">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 pr-4 border-r border-border/50 md:flex">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Systems Operational</span>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full transition-all",
                  showNotifications ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                )}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-80 rounded-[1.5rem] border border-border bg-card p-2 shadow-apple-lg z-50 origin-top-right"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 mb-2">
                      <h3 className="font-bold text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto scrollbar-none space-y-1">
                      {notifications.length > 0 ? (
                        notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            className={cn(
                              "flex flex-col gap-1 rounded-xl p-3 text-left transition-colors hover:bg-secondary/50 cursor-pointer",
                              !notif.read && "bg-primary/[0.03]"
                            )}
                            onClick={() => {
                              setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn("text-xs font-bold", !notif.read ? "text-foreground" : "text-muted-foreground")}>
                                {notif.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground/80">{notif.time}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {notif.message}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No new notifications
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-16 relative">
          <div className="h-full w-full max-w-7xl mx-auto animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
