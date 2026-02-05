import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Search,
  Bell,
  Plus,
} from 'lucide-react';
import { useTheme } from '@/components/common/ThemeProvider';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { path: '/terminal', icon: Terminal, label: 'Terminal' },
  { path: '/workflows', icon: GitBranch, label: 'Workflows' },
  { path: '/personas', icon: Users, label: 'Personas' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { currentPersona } = usePersonaStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-card transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">S</span>
              </div>
              <span className="font-semibold">Soothsayer</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Workspace Selector */}
        {!sidebarCollapsed && (
          <div className="border-b border-border p-3">
            <button className="flex w-full items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm hover:bg-secondary/80">
              <span className="truncate">{currentWorkspace?.name || 'Select Workspace'}</span>
              <Plus className="h-4 w-4 opacity-50" />
            </button>
          </div>
        )}

        {/* Persona Indicator */}
        {!sidebarCollapsed && currentPersona && (
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm">
              <span className="text-lg">{currentPersona.icon}</span>
              <div className="flex-1 truncate">
                <div className="font-medium">{currentPersona.name}</div>
                <div className="text-xs text-muted-foreground">{currentPersona.category}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-3">
          {!sidebarCollapsed && user && (
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 truncate">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search or press ⌘K..."
                className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
