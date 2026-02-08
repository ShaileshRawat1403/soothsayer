import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  MessageSquare,
  Terminal,
  GitBranch,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Sparkles,
  History,
  Star,
  Folder,
  FileCode,
  Command,
  Keyboard,
  Moon,
  Sun,
  LogOut,
  User,
  Bell,
  Zap,
  Bot,
  Brain,
  Code2,
  Database,
  Shield,
  Workflow,
} from 'lucide-react';
import { useTheme } from '../common/ThemeProvider';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  isNew?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navSections: NavSection[] = [
  {
    id: 'main',
    label: 'Main',
    icon: <Home className="w-4 h-4" />,
    defaultOpen: true,
    items: [
      { path: '/', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
      { path: '/chat', label: 'AI Chat', icon: <MessageSquare className="w-5 h-5" />, isNew: true },
      { path: '/terminal', label: 'Terminal', icon: <Terminal className="w-5 h-5" /> },
    ],
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: <Workflow className="w-4 h-4" />,
    defaultOpen: true,
    items: [
      { path: '/workflows', label: 'Workflows', icon: <GitBranch className="w-5 h-5" /> },
      { path: '/personas', label: 'Personas', icon: <Users className="w-5 h-5" /> },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: <BarChart3 className="w-4 h-4" />,
    defaultOpen: false,
    items: [
      { path: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: <Settings className="w-4 h-4" />,
    defaultOpen: false,
    items: [
      { path: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
    ],
  },
];

interface RecentChat {
  id: string;
  title: string;
  timestamp: Date;
  persona?: string;
}

const recentChats: RecentChat[] = [
  { id: '1', title: 'Debug Python script', timestamp: new Date(), persona: '🐍' },
  { id: '2', title: 'Optimize SQL query', timestamp: new Date(Date.now() - 3600000), persona: '🗄️' },
  { id: '3', title: 'Setup Docker compose', timestamp: new Date(Date.now() - 7200000), persona: '🐳' },
];

interface EnhancedSidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onOpenCommandPalette?: () => void;
}

export const EnhancedSidebar: React.FC<EnhancedSidebarProps> = ({
  isCollapsed: controlledCollapsed,
  onCollapsedChange,
  onOpenCommandPalette,
}) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(controlledCollapsed ?? false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(navSections.filter(s => s.defaultOpen).map(s => s.id))
  );
  const [showRecentChats, setShowRecentChats] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (controlledCollapsed !== undefined) {
      setIsCollapsed(controlledCollapsed);
    }
  }, [controlledCollapsed]);

  const handleCollapsedChange = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    onCollapsedChange?.(collapsed);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Filter nav items based on search
  const filteredSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(section => section.items.length > 0);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 280 }}
      className="h-screen flex flex-col bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 relative z-40"
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
                  Soothsayer
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={() => handleCollapsedChange(!isCollapsed)}
          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Search & Quick Actions */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 border-b border-gray-800"
          >
            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] bg-gray-700 text-gray-400 rounded">
                ⌘K
              </kbd>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={onOpenCommandPalette}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-lg text-sm text-blue-400 transition-colors"
              >
                <Command className="w-4 h-4" />
                <span>Commands</span>
              </button>
              <Link
                to="/chat"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 rounded-lg text-sm text-purple-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {(searchQuery ? filteredSections : navSections).map((section) => (
          <div key={section.id} className="mb-2">
            {/* Section Header */}
            {!isCollapsed && (
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {section.icon}
                  <span>{section.label}</span>
                </div>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    expandedSections.has(section.id) ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
            )}

            {/* Section Items */}
            <AnimatePresence>
              {(isCollapsed || expandedSections.has(section.id)) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-0.5"
                >
                  {section.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                        isActive(item.path)
                          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                          : 'text-gray-400 hover:bg-gray-800/50 hover:text-white border border-transparent'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={`flex-shrink-0 ${isActive(item.path) ? 'text-blue-400' : ''}`}>
                        {item.icon}
                      </span>
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="text-sm font-medium whitespace-nowrap overflow-hidden"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {!isCollapsed && item.badge && (
                        <span className="ml-auto px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                          {item.badge}
                        </span>
                      )}
                      {!isCollapsed && item.isNew && (
                        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium bg-green-500/20 text-green-400 rounded">
                          NEW
                        </span>
                      )}
                      {isActive(item.path) && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r"
                        />
                      )}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* Recent Chats */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-800"
          >
            <button
              onClick={() => setShowRecentChats(!showRecentChats)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>Recent Chats</span>
              </div>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  showRecentChats ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            <AnimatePresence>
              {showRecentChats && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-2 pb-3 space-y-1"
                >
                  {recentChats.map((chat) => (
                    <Link
                      key={chat.id}
                      to={`/chat/${chat.id}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white transition-colors group"
                    >
                      <span className="text-lg">{chat.persona || '💬'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{chat.title}</p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(chat.timestamp)}
                        </p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all">
                        <Star className="w-3 h-3" />
                      </button>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User & Theme */}
      <div className="border-t border-gray-800 p-3">
        <div className={`flex ${isCollapsed ? 'flex-col' : ''} items-center gap-2`}>
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <button
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User Menu */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 flex items-center gap-2 ml-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">Admin User</p>
                  <p className="text-xs text-gray-500 truncate">admin@soothsayer.ai</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};

// Helper function
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default EnhancedSidebar;
