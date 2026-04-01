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
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useTheme } from '@/components/common/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/common/Logo';
import { NodeStatus } from './NodeStatus';
import { NotificationPopover } from './NotificationPopover';
import { useNotificationStore } from '@/stores/notification.store';
import { socketEvents } from '@/lib/socket';
import { toast } from 'sonner';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/terminal', icon: Terminal, label: 'Terminal' },
  { path: '/workflows', icon: GitBranch, label: 'Workflows' },
  { path: '/dax', icon: Activity, label: 'Control' },
  { path: '/personas', icon: Users, label: 'Personas' },
  { path: '/analytics', icon: BarChart3, label: 'Audit' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { user, logout } = useAuthStore();
  const { currentPersona } = usePersonaStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { fetchNotifications, unreadCount, addNotification } = useNotificationStore();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchNotifications();
    }
  }, [currentWorkspace?.id, fetchNotifications]);

  useEffect(() => {
    // Real-time notification listener
    const unsubscribe = socketEvents.onNotification((notification) => {
      addNotification(notification);
      toast.info(notification.title, {
        description: notification.message,
        action: notification.actionUrl ? {
          label: 'View',
          onClick: () => navigate(notification.actionUrl)
        } : undefined
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, [addNotification, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-primary/30 font-sans transition-colors duration-500">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="fixed bottom-4 right-4 z-50 md:hidden flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-all"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={closeMobileMenu}
            />
            <motion.nav
              ref={mobileMenuRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border/30 md:hidden flex flex-col"
            >
              <div className="flex h-14 items-center justify-between px-4 border-b border-border/20">
                <div
                  className="flex items-center gap-2.5 cursor-pointer"
                  onClick={() => {
                    navigate('/dashboard');
                    closeMobileMenu();
                  }}
                >
                  <Logo size="sm" />
                  <span className="font-black tracking-tighter text-sm uppercase">Soothsayer</span>
                </div>
                <button
                  onClick={closeMobileMenu}
                  className="p-2 hover:bg-muted/40 rounded-lg"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-3 transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40'
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="p-3 border-t border-border/20">
                <button
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 transition-all"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Hidden on mobile */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className="hidden md:flex relative z-40 flex-col border-r border-border/30 bg-card/20 backdrop-blur-3xl"
      >
        {/* Branding - High Fidelity */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-border/20">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed ? (
              <motion.div
                key="full"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => navigate('/dashboard')}
              >
                <Logo
                  size="sm"
                  className="transition-transform group-hover:rotate-12 duration-500"
                />
                <span className="font-black tracking-tighter text-sm uppercase bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                  Soothsayer
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="icon"
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

        {/* Sidebar Toggle - Integrated */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-16 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border/40 bg-background shadow-nuance hover:scale-110 active:scale-95 transition-all"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {/* Workspace Hub - Minimalist */}
        <div className="px-3 py-4">
          <button className="group flex w-full items-center gap-3 rounded-xl border border-border/40 bg-muted/10 p-2 transition-all hover:bg-muted/20 active-scale">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/10 flex-shrink-0 transition-transform group-hover:scale-105">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            {!sidebarCollapsed && (
              <span className="flex-1 text-left truncate uppercase tracking-[0.2em] text-[9px] font-black text-muted-foreground/60">
                {currentWorkspace?.name || 'Standard Context'}
              </span>
            )}
          </button>
        </div>

        {/* Navigation - High Density with Fluid Animations */}
        <nav className="flex-1 space-y-0.5 px-3 overflow-y-auto scrollbar-none">
          {navItems.map((item, index) => {
            const isActive =
              location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
              >
                <NavLink
                  to={item.path}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10'
                      : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40',
                    sidebarCollapsed && 'justify-center'
                  )}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <motion.div
                        className="absolute -bottom-1 left-1/2 h-0.5 bg-primary rounded-full"
                        initial={{ width: 0, x: '-50%' }}
                        whileHover={{ width: '60%' }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </motion.div>
                  {!sidebarCollapsed && (
                    <span className="text-[10px] font-black uppercase tracking-widest truncate">
                      {item.label}
                    </span>
                  )}
                  {/* Active indicator dot */}
                  {sidebarCollapsed && (
                    <motion.div
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary"
                      initial={{ scale: 0 }}
                      animate={{ scale: isActive ? 1 : 0 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    />
                  )}
                </NavLink>
              </motion.div>
            );
          })}
        </nav>

        {/* Operator Hub - Clean Bottom */}
        <div className="mt-auto p-3 border-t border-border/20 space-y-2">
          <div
            className={cn(
              'flex items-center gap-2.5 p-1.5 rounded-xl transition-all',
              sidebarCollapsed ? 'flex-col' : 'hover:bg-muted/10'
            )}
          >
            <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-primary/10 flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'O'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="truncate text-[10px] font-black uppercase tracking-tight leading-none">
                  {user?.name}
                </div>
                <div className="truncate text-[8px] font-black text-emerald-600/60 mt-1 uppercase tracking-widest leading-none">
                  Identity Linked
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="flex-1 flex h-8 items-center justify-center rounded-lg bg-muted/10 text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all"
              title="Toggle Theme"
            >
              <motion.div
                initial={false}
                animate={{ rotate: resolvedTheme === 'dark' ? 0 : 180 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
              </motion.div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="flex-1 flex h-8 items-center justify-center rounded-lg bg-rose-500/5 text-rose-500/40 hover:text-rose-600 hover:bg-rose-500/10 transition-all"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>
      </motion.aside>

      {/* Main Workstation */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header - Fixed 56px Pass - Hidden on mobile */}
        <header className="hidden md:flex h-14 border-b border-border/30 bg-background/40 backdrop-blur-3xl px-8 items-center justify-between z-30 transition-all duration-500">
          <div className="flex-1 max-w-sm relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-300" />
            <input
              type="text"
              placeholder="Search operational traces..."
              className="w-full h-9 rounded-xl bg-muted/10 border border-border/40 pl-9 pr-4 text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all placeholder:text-muted-foreground/20"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 pr-6 border-r border-border/20">
              <NodeStatus />
            </div>

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  'h-9 w-9 flex items-center justify-center rounded-xl transition-all active-scale relative',
                  showNotifications
                    ? 'bg-primary text-white shadow-xl shadow-primary/20'
                    : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/40'
                )}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <NotificationPopover onClose={() => setShowNotifications(false)} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Viewport - Responsive Container */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto scrollbar-none relative pt-0 bg-muted/[0.01]"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
