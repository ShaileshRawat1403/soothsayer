import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Search,
  MessageSquare,
  Terminal,
  GitBranch,
  Users,
  BarChart3,
  Settings,
  Plus,
  Zap,
  Code,
  FileText,
  Moon,
  Sun,
  LogOut,
  Keyboard,
} from 'lucide-react';
import { useTheme } from '@/components/common/ThemeProvider';
import { useAuthStore } from '@/stores/auth.store';
import { usePersonaStore } from '@/stores/persona.store';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'personas' | 'settings';
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const { logout } = useAuthStore();
  const { personas, setCurrentPersona } = usePersonaStore();

  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: <Zap className="h-4 w-4" />, shortcut: 'G D', action: () => navigate('/dashboard'), category: 'navigation' },
    { id: 'nav-chat', label: 'Go to Chat', icon: <MessageSquare className="h-4 w-4" />, shortcut: 'G C', action: () => navigate('/chat'), category: 'navigation' },
    { id: 'nav-terminal', label: 'Go to Terminal', icon: <Terminal className="h-4 w-4" />, shortcut: 'G T', action: () => navigate('/terminal'), category: 'navigation' },
    { id: 'nav-workflows', label: 'Go to Workflows', icon: <GitBranch className="h-4 w-4" />, shortcut: 'G W', action: () => navigate('/workflows'), category: 'navigation' },
    { id: 'nav-personas', label: 'Go to Personas', icon: <Users className="h-4 w-4" />, shortcut: 'G P', action: () => navigate('/personas'), category: 'navigation' },
    { id: 'nav-analytics', label: 'Go to Analytics', icon: <BarChart3 className="h-4 w-4" />, shortcut: 'G A', action: () => navigate('/analytics'), category: 'navigation' },
    { id: 'nav-settings', label: 'Go to Settings', icon: <Settings className="h-4 w-4" />, shortcut: 'G S', action: () => navigate('/settings'), category: 'navigation' },
    
    // Actions
    { id: 'action-new-chat', label: 'New Chat', description: 'Start a new conversation', icon: <Plus className="h-4 w-4" />, shortcut: 'N', action: () => navigate('/chat'), category: 'actions' },
    { id: 'action-new-workflow', label: 'New Workflow', description: 'Create a new workflow', icon: <Plus className="h-4 w-4" />, action: () => navigate('/workflows'), category: 'actions' },
    { id: 'action-run-command', label: 'Run Command', description: 'Open terminal', icon: <Terminal className="h-4 w-4" />, action: () => navigate('/terminal'), category: 'actions' },
    { id: 'action-generate-code', label: 'Generate Code', description: 'AI code generation', icon: <Code className="h-4 w-4" />, action: () => navigate('/chat'), category: 'actions' },
    { id: 'action-explain-code', label: 'Explain Code', description: 'Get code explanation', icon: <FileText className="h-4 w-4" />, action: () => navigate('/chat'), category: 'actions' },
    
    // Settings
    { id: 'settings-theme', label: resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode', icon: resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, action: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'), category: 'settings' },
    { id: 'settings-logout', label: 'Sign Out', icon: <LogOut className="h-4 w-4" />, action: () => { logout(); navigate('/login'); }, category: 'settings' },
    { id: 'settings-shortcuts', label: 'Keyboard Shortcuts', icon: <Keyboard className="h-4 w-4" />, action: () => {}, category: 'settings' },
  ];

  const filteredCommands = query
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    personas: 'Personas',
    settings: 'Settings',
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Open command palette with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          setIsOpen(false);
          setQuery('');
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
            setQuery('');
          }
          break;
      }
    },
    [isOpen, filteredCommands, selectedIndex]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          setIsOpen(false);
          setQuery('');
        }}
      />

      {/* Command Panel */}
      <div className="relative w-full max-w-xl animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="h-14 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden rounded bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground sm:block">
              ESC
            </kbd>
          </div>

          {/* Commands List */}
          <div className="max-h-[50vh] overflow-auto p-2">
            {Object.entries(groupedCommands).map(([category, items]) => (
              <div key={category} className="mb-2">
                <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {categoryLabels[category]}
                </div>
                {items.map((cmd, idx) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                        globalIndex === selectedIndex
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg',
                          globalIndex === selectedIndex
                            ? 'bg-primary-foreground/20'
                            : 'bg-secondary'
                        )}
                      >
                        {cmd.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{cmd.label}</div>
                        {cmd.description && (
                          <div
                            className={cn(
                              'text-sm',
                              globalIndex === selectedIndex
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            )}
                          >
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd
                          className={cn(
                            'rounded px-2 py-0.5 text-xs font-medium',
                            globalIndex === selectedIndex
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-secondary text-muted-foreground'
                          )}
                        >
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredCommands.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No commands found for "{query}"
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-secondary px-1.5 py-0.5">↑</kbd>
                <kbd className="rounded bg-secondary px-1.5 py-0.5">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-secondary px-1.5 py-0.5">↵</kbd>
                to select
              </span>
            </div>
            <span>
              <kbd className="rounded bg-secondary px-1.5 py-0.5">⌘K</kbd> to toggle
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
