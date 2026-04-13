import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  GitBranch,
  Layers3,
  MessageSquare,
  Play,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  Wrench,
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useAIProviderStore } from '@/stores/ai-provider.store';
import type { DaxHealthResponse, DaxRunListItem, DaxRunOverviewResponse } from '@/types/dax';

type ToolRecord = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  domain?: string;
  status?: string;
  riskLevel?: string;
  requiredTier?: number;
  analytics?: {
    totalInvocations?: number;
    successRate?: number;
    avgLatencyMs?: number;
  };
  workspaceConfig?: {
    enabled?: boolean;
    overrides?: {
      requiredTier?: number;
      riskLevel?: string;
    } | null;
  } | null;
};

type IntegrationStatus = {
  name: string;
  configured: boolean;
  connected: boolean;
  message: string;
  accountName?: string;
};

type PicobotOverview = {
  workspaceId: string;
  legacyData: boolean;
  instance: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    url?: string | null;
    health?: unknown;
    lastSeenAt?: string | null;
  } | null;
  stats: {
    status: string;
    totalChannels: number;
    connectedChannels: number;
    enabledChannels: number;
    totalSessions: number;
    activeSessions: number;
    telegramActiveSessions: number;
    sessions24h: number;
    messages24h: number;
    telegramMessages24h: number;
    pendingCommands: number;
    totalCommands: number;
    lastSeenAt?: string | null;
  };
  channels: PicobotChannel[];
  sessions: PicobotSession[];
  recentLogs: PicobotLogRecord[];
  recentCommands: PicobotCommand[];
};

type PicobotChannel = {
  id: string;
  picobotId: string;
  channelType: string;
  name: string;
  enabled: boolean;
  status: string;
  stats?: unknown;
  lastActivityAt?: string | null;
  messages24h: number;
  activeSessions: number;
};

type PicobotSession = {
  id: string;
  channelId: string;
  channelType: string;
  userId?: string | null;
  userName?: string | null;
  status: string;
  messageCount: number;
  tokenCount: number;
  startedAt: string;
  lastMessageAt?: string | null;
  endedAt?: string | null;
  metadata?: unknown;
};

type PicobotLogRecord = {
  id: string;
  type: string;
  channelType?: string | null;
  userId?: string | null;
  userName?: string | null;
  message: string;
  summary: string;
  metadata?: unknown;
  timestamp: string;
  direction: 'inbound' | 'outbound' | 'system';
};

type PicobotCommand = {
  id: string;
  commandType: string;
  status: string;
  payload?: unknown;
  daxRunId?: string | null;
  executedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt?: string | null;
  acknowledgedAt?: string | null;
  completedAt?: string | null;
  ageMinutes: number;
};

type PicobotLogsResponse = {
  workspaceId: string;
  legacyData: boolean;
  channelType?: string | null;
  logs: PicobotLogRecord[];
};

type PicobotTab = 'overview' | 'channels' | 'logs' | 'capabilities' | 'governance';

const INGRESS_LABELS: Record<string, string> = {
  slack: 'Slack',
  github: 'GitHub',
  jira: 'Jira',
  linear: 'Linear',
  notion: 'Notion',
  discord: 'Discord',
  google_drive: 'Google Drive',
};

const PICOBOT_TABS: Array<{
  id: PicobotTab;
  label: string;
  icon: typeof Sparkles;
  description: string;
}> = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Sparkles,
    description: 'High-level Picobot and ingress posture',
  },
  {
    id: 'channels',
    label: 'Channels',
    icon: Layers3,
    description: 'Telegram and channel session state',
  },
  {
    id: 'logs',
    label: 'Telegram Logs',
    icon: MessageSquare,
    description: 'Operator-visible Telegram activity timeline',
  },
  {
    id: 'capabilities',
    label: 'Capabilities',
    icon: Wrench,
    description: 'Tool registry and policy posture',
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: ShieldCheck,
    description: 'DAX runs, approvals, and operator control',
  },
];

function dedupeRuns(runs: DaxRunListItem[]): DaxRunListItem[] {
  const seen = new Set<string>();
  return runs.filter((run) => {
    if (seen.has(run.runId)) {
      return false;
    }

    seen.add(run.runId);
    return true;
  });
}

function rankRiskLevel(risk?: string): number {
  switch (risk) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

function formatTierLabel(tier?: number): string {
  switch (tier) {
    case 0:
      return 'Tier 0';
    case 1:
      return 'Tier 1';
    case 2:
      return 'Tier 2';
    case 3:
      return 'Tier 3';
    default:
      return 'Tier ?';
  }
}

function formatStatusLabel(status?: string): string {
  return status ? status.replace(/_/g, ' ') : 'unknown';
}

function formatPercent(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'n/a';
  }

  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

function statusTone(status?: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'connected' || normalized === 'active' || normalized === 'completed') {
    return 'success';
  }
  if (
    normalized === 'pending' ||
    normalized === 'waiting approval' ||
    normalized === 'waiting_approval'
  ) {
    return 'warning';
  }
  if (normalized === 'failed' || normalized === 'error' || normalized === 'impaired') {
    return 'danger';
  }
  if (normalized === 'running' || normalized === 'beta') {
    return 'info';
  }

  return 'neutral';
}

function directionTone(direction: PicobotLogRecord['direction']) {
  switch (direction) {
    case 'inbound':
      return 'success';
    case 'outbound':
      return 'info';
    default:
      return 'warning';
  }
}

function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
        tone === 'success' && 'bg-emerald-500/10 text-emerald-600',
        tone === 'warning' && 'bg-amber-500/10 text-amber-700',
        tone === 'danger' && 'bg-rose-500/10 text-rose-600',
        tone === 'info' && 'bg-blue-500/10 text-blue-600',
        tone === 'neutral' && 'bg-muted/40 text-secondary-content'
      )}
    >
      {label}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Bot;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-border/40 bg-card/20 p-5 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <span className="text-label">{label}</span>
      </div>
      <div className="text-3xl font-black tracking-tight text-foreground">{value}</div>
      <p className="mt-2 text-sm text-secondary-content">{detail}</p>
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn('rounded-[2rem] border border-border/40 bg-card/20 p-5 md:p-6', className)}
    >
      {children}
    </section>
  );
}

function PanelHeader({
  title,
  description,
  icon: Icon,
  trailing,
}: {
  title: string;
  description: string;
  icon: typeof Bot;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-secondary-content">{description}</p>
        </div>
      </div>
      {trailing}
    </div>
  );
}

export function PicobotPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const { providers, activeProvider, activeModel } = useAIProviderStore();

  const [activeTab, setActiveTab] = useState<PicobotTab>('overview');
  const [selectedChannel, setSelectedChannel] = useState<string>('telegram');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [logSearch, setLogSearch] = useState('');
  const deferredLogSearch = useDeferredValue(logSearch.trim().toLowerCase());
  const [logLimit, setLogLimit] = useState(60);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<PicobotOverview | null>(null);
  const [logsResponse, setLogsResponse] = useState<PicobotLogsResponse | null>(null);
  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [daxHealth, setDaxHealth] = useState<DaxHealthResponse | null>(null);
  const [daxOverview, setDaxOverview] = useState<DaxRunOverviewResponse | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [executingCommandId, setExecutingCommandId] = useState<string | null>(null);

  const workspaceSettings =
    currentWorkspace?.settings && typeof currentWorkspace.settings === 'object'
      ? (currentWorkspace.settings as Record<string, unknown>)
      : null;

  const inferredRepoPath =
    typeof workspaceSettings?.repoPath === 'string'
      ? workspaceSettings.repoPath
      : typeof workspaceSettings?.defaultRepoPath === 'string'
        ? workspaceSettings.defaultRepoPath
        : typeof workspaceSettings?.targetRepoPath === 'string'
          ? workspaceSettings.targetRepoPath
          : undefined;

  const loadOverview = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const [picobotResult, toolsResult, healthResult, overviewResult, integrationsResult] =
          await Promise.allSettled([
            apiHelpers.getPicobotOverview(currentWorkspace?.id),
            apiHelpers.getTools(currentWorkspace?.id),
            apiHelpers.getDaxHealth(),
            apiHelpers.getDaxOverview(inferredRepoPath),
            apiHelpers.getIntegrationStatus(currentWorkspace?.id),
          ]);

        if (picobotResult.status === 'fulfilled') {
          setOverview(picobotResult.value.data as PicobotOverview);
        } else {
          setOverview(null);
        }

        if (toolsResult.status === 'fulfilled') {
          const payload = (toolsResult.value.data as { tools?: ToolRecord[] }) || {};
          setTools(Array.isArray(payload.tools) ? payload.tools : []);
        } else {
          setTools([]);
        }

        if (healthResult.status === 'fulfilled') {
          setDaxHealth(healthResult.value.data);
        } else {
          setDaxHealth(null);
        }

        if (overviewResult.status === 'fulfilled') {
          setDaxOverview(overviewResult.value.data);
        } else {
          setDaxOverview(null);
        }

        if (integrationsResult.status === 'fulfilled') {
          setIntegrations(
            Array.isArray(integrationsResult.value.data)
              ? (integrationsResult.value.data as IntegrationStatus[])
              : []
          );
        } else {
          setIntegrations([]);
        }

        const failedLoads = [
          picobotResult,
          toolsResult,
          healthResult,
          overviewResult,
          integrationsResult,
        ].filter((result) => result.status === 'rejected').length;

        setError(
          failedLoads > 0
            ? 'Some operator signals are unavailable right now, but the Picobot surface is still showing the data we could load.'
            : null
        );
        setLastUpdatedAt(new Date().toISOString());
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentWorkspace?.id, inferredRepoPath]
  );

  const loadLogs = useCallback(async () => {
    setIsLogsLoading(true);
    try {
      const response = await apiHelpers.getPicobotLogs({
        workspaceId: currentWorkspace?.id,
        channelType: selectedChannel === 'all' ? undefined : selectedChannel,
        limit: logLimit,
      });
      setLogsResponse(response.data as PicobotLogsResponse);
    } catch {
      setLogsResponse((current) => current);
    } finally {
      setIsLogsLoading(false);
    }
  }, [currentWorkspace?.id, logLimit, selectedChannel]);

  const executeCommand = useCallback(
    async (commandId: string) => {
      setExecutingCommandId(commandId);
      try {
        await apiHelpers.executePicobotCommand(commandId);
        void loadOverview('refresh');
      } catch (err) {
        console.error('Failed to execute command:', err);
      } finally {
        setExecutingCommandId(null);
      }
    },
    [loadOverview]
  );

  useEffect(() => {
    void loadOverview('initial');
  }, [loadOverview]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void loadOverview('refresh');
      void loadLogs();
    }, 20000);

    return () => window.clearInterval(interval);
  }, [autoRefresh, loadLogs, loadOverview]);

  useEffect(() => {
    if (!overview?.channels.length) {
      return;
    }

    const available = new Set(['all', ...overview.channels.map((channel) => channel.channelType)]);
    if (!available.has(selectedChannel)) {
      setSelectedChannel(
        overview.channels.find((channel) => channel.channelType === 'telegram')?.channelType ||
          overview.channels[0].channelType
      );
    }
  }, [overview?.channels, selectedChannel]);

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    const stillVisible = overview?.sessions.some((session) => session.id === selectedSessionId);
    if (!stillVisible) {
      setSelectedSessionId(null);
    }
  }, [overview?.sessions, selectedSessionId]);

  const daxProvider = useMemo(
    () => providers.find((provider) => provider.id === 'dax'),
    [providers]
  );

  const fallbackProviders = useMemo(
    () => providers.filter((provider) => provider.id !== 'dax'),
    [providers]
  );

  const activeTools = useMemo(() => tools.filter((tool) => tool.status !== 'disabled'), [tools]);

  const enabledTools = useMemo(
    () => activeTools.filter((tool) => tool.workspaceConfig?.enabled !== false),
    [activeTools]
  );

  const governedTools = useMemo(
    () =>
      enabledTools.filter((tool) => {
        const effectiveTier =
          tool.workspaceConfig?.overrides?.requiredTier ?? tool.requiredTier ?? 0;
        return effectiveTier >= 2;
      }),
    [enabledTools]
  );

  const highRiskTools = useMemo(
    () =>
      [...enabledTools]
        .filter(
          (tool) => rankRiskLevel(tool.workspaceConfig?.overrides?.riskLevel ?? tool.riskLevel) >= 3
        )
        .sort((left, right) => {
          const riskDelta =
            rankRiskLevel(right.workspaceConfig?.overrides?.riskLevel ?? right.riskLevel) -
            rankRiskLevel(left.workspaceConfig?.overrides?.riskLevel ?? left.riskLevel);

          if (riskDelta !== 0) {
            return riskDelta;
          }

          return (right.analytics?.totalInvocations ?? 0) - (left.analytics?.totalInvocations ?? 0);
        })
        .slice(0, 6),
    [enabledTools]
  );

  const topTools = useMemo(
    () =>
      [...enabledTools]
        .sort(
          (left, right) =>
            (right.analytics?.totalInvocations ?? 0) - (left.analytics?.totalInvocations ?? 0)
        )
        .slice(0, 8),
    [enabledTools]
  );

  const categoryCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tool of enabledTools) {
      const key = tool.category || 'uncategorized';
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [enabledTools]);

  const recentRuns = useMemo(() => {
    const runs = dedupeRuns([
      ...(daxOverview?.activeRuns || []),
      ...(daxOverview?.recentRuns || []),
    ]);
    return runs
      .sort(
        (left, right) =>
          new Date(right.updatedAt || right.createdAt).getTime() -
          new Date(left.updatedAt || left.createdAt).getTime()
      )
      .slice(0, 8);
  }, [daxOverview]);

  const connectedIngresses = integrations.filter((integration) => integration.connected);
  const configuredIngresses = integrations.filter((integration) => integration.configured);

  const channels = overview?.channels || [];
  const sessions = overview?.sessions || [];
  const recentCommands = overview?.recentCommands || [];
  const liveLogs = logsResponse?.logs || overview?.recentLogs || [];
  const telegramPreview = (overview?.recentLogs || [])
    .filter((log) => log.channelType === 'telegram')
    .slice(0, 5);

  const selectedChannelDetails = useMemo(() => {
    if (!channels.length) {
      return null;
    }

    if (selectedChannel === 'all') {
      return null;
    }

    return channels.find((channel) => channel.channelType === selectedChannel) || null;
  }, [channels, selectedChannel]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [selectedSessionId, sessions]
  );

  const sessionsForSelectedChannel = useMemo(() => {
    if (selectedChannel === 'all') {
      return sessions;
    }

    return sessions.filter((session) => session.channelType === selectedChannel);
  }, [selectedChannel, sessions]);

  const filteredLogs = useMemo(() => {
    let items = [...liveLogs];

    if (selectedChannel !== 'all') {
      items = items.filter((log) => log.channelType === selectedChannel);
    }

    if (selectedSession) {
      const startedAt = new Date(selectedSession.startedAt).getTime();
      const endedAt = selectedSession.endedAt
        ? new Date(selectedSession.endedAt).getTime()
        : Number.POSITIVE_INFINITY;
      items = items.filter((log) => {
        const logTime = new Date(log.timestamp).getTime();
        const inWindow = logTime >= startedAt && logTime <= endedAt;
        const sameUser = selectedSession.userId
          ? log.userId === selectedSession.userId
          : selectedSession.userName
            ? log.userName === selectedSession.userName
            : true;
        return inWindow && sameUser;
      });
    }

    if (deferredLogSearch) {
      items = items.filter((log) =>
        [
          log.message,
          log.summary,
          log.userName || '',
          log.userId || '',
          log.type,
          log.channelType || '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(deferredLogSearch)
      );
    }

    return items;
  }, [deferredLogSearch, liveLogs, selectedChannel, selectedSession]);

  const primaryRouteLabel =
    daxHealth?.healthy && activeProvider === 'dax'
      ? 'DAX First'
      : daxHealth?.healthy
        ? 'DAX Ready'
        : 'Attention';

  const runLink = (run: DaxRunListItem) => {
    const query = new URLSearchParams({
      targetMode: run.targeting?.mode || 'default_cwd',
      ...(run.targeting?.repoPath ? { repoPath: run.targeting.repoPath } : {}),
    });
    return `/runs/${run.runId}?${query.toString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 p-6 md:p-10 animate-in-up">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-label">
              <Bot className="h-3.5 w-3.5" />
              Picobot Ingress Plane
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-xl shadow-primary/10">
                <Bot className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-foreground md:text-4xl">
                  Picobot
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-secondary-content md:text-base">
                  Operator view for Picobot ingress, live Telegram traces, capability policy, and
                  DAX-governed execution. The page is split into focused modules so we can move from
                  routing posture to Telegram activity without overwhelming the operator.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              label={primaryRouteLabel}
              tone={daxHealth?.healthy ? 'success' : 'warning'}
            />
            <StatusBadge
              label={overview?.legacyData ? 'Telegram logs live' : 'No legacy Picobot data'}
              tone={overview?.legacyData ? 'info' : 'warning'}
            />
            <button
              onClick={() => {
                void loadOverview('refresh');
                void loadLogs();
              }}
              className="flex h-10 items-center gap-2 rounded-xl border border-border/40 bg-card/30 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-card/60"
            >
              <RefreshCw
                className={cn('h-4 w-4', (isRefreshing || isLogsLoading) && 'animate-spin')}
              />
              Refresh
            </button>
            <button
              onClick={() => setAutoRefresh((current) => !current)}
              className={cn(
                'flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors',
                autoRefresh
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
                  : 'border-border/40 bg-card/30 text-foreground hover:bg-card/60'
              )}
            >
              <Radio className="h-4 w-4" />
              {autoRefresh ? 'Auto refresh on' : 'Auto refresh off'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={ShieldCheck}
            label="Primary Route"
            value={primaryRouteLabel}
            detail={
              daxHealth?.checkedAt
                ? `DAX checked ${formatRelativeTime(daxHealth.checkedAt)}`
                : 'DAX health is currently unavailable.'
            }
          />
          <MetricCard
            icon={MessageSquare}
            label="Telegram 24h"
            value={overview?.stats.telegramMessages24h || 0}
            detail={`${overview?.stats.telegramActiveSessions || 0} active Telegram sessions`}
          />
          <MetricCard
            icon={Layers3}
            label="Channels"
            value={overview?.stats.connectedChannels || 0}
            detail={`${overview?.stats.enabledChannels || 0} enabled ingress channels`}
          />
          <MetricCard
            icon={Terminal}
            label="Queued Commands"
            value={overview?.stats.pendingCommands || 0}
            detail={`${overview?.stats.totalCommands || 0} total Picobot commands tracked`}
          />
          <MetricCard
            icon={Wrench}
            label="Governed Tools"
            value={governedTools.length}
            detail={`${enabledTools.length} enabled capabilities in the current workspace`}
          />
        </div>

        <div className="overflow-x-auto scrollbar-none">
          <div className="flex min-w-max gap-2 rounded-[1.6rem] border border-border/40 bg-card/20 p-2">
            {PICOBOT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group rounded-[1.1rem] px-4 py-3 text-left transition-all',
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-secondary-content hover:bg-background/70 hover:text-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  <span className="text-sm font-black uppercase tracking-[0.16em]">
                    {tab.label}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium normal-case tracking-normal text-inherit">
                  {tab.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      {!overview?.legacyData && (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/10 px-5 py-4 text-sm text-secondary-content">
          Legacy Picobot runtime tables are not available for this workspace, so Telegram session
          logs cannot be rendered here yet.
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Panel>
            <PanelHeader
              title="Authority Path"
              description="How Picobot ingress hands work into Soothsayer and DAX."
              icon={Workflow}
            />
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1.2fr_auto_1fr] md:items-center">
              <NodeCard
                title="Picobot"
                body="Ingress surface for operator and channel-originated requests."
              />
              <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground md:block" />
              <NodeCard
                title={daxProvider?.name || 'DAX Assistant'}
                body={`Primary route${activeProvider === 'dax' ? ` using ${activeModel}` : ` using ${daxProvider?.defaultModel || 'gemini-2.5-pro'}`}.`}
                accent
              />
              <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground md:block" />
              <NodeCard
                title="Fallbacks"
                body={
                  fallbackProviders.length > 0
                    ? `${fallbackProviders.length} advanced direct overrides remain available when intentionally selected.`
                    : 'No direct fallback backends are configured.'
                }
              />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-border/30 bg-background/50 p-5">
                <div className="mb-3 flex items-center gap-2 text-label">
                  <Layers3 className="h-4 w-4 text-primary" />
                  Ingress Surfaces
                </div>
                <div className="space-y-3">
                  {integrations.map((integration) => (
                    <div
                      key={integration.name}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border/30 bg-card/30 p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                            {INGRESS_LABELS[integration.name] || integration.name}
                          </span>
                          <StatusBadge
                            label={
                              integration.connected
                                ? 'connected'
                                : integration.configured
                                  ? 'ready'
                                  : 'not ready'
                            }
                            tone={
                              integration.connected
                                ? 'success'
                                : integration.configured
                                  ? 'info'
                                  : 'neutral'
                            }
                          />
                        </div>
                        <p className="mt-2 text-sm text-secondary-content">{integration.message}</p>
                      </div>
                      {integration.connected ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border/30 bg-background/50 p-5">
                <div className="mb-3 flex items-center gap-2 text-label">
                  <Clock3 className="h-4 w-4 text-primary" />
                  Telegram Pulse
                </div>
                {telegramPreview.length === 0 ? (
                  <p className="text-sm text-secondary-content">
                    No Telegram activity is currently available in the legacy Picobot log stream.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {telegramPreview.map((log) => (
                      <button
                        key={log.id}
                        onClick={() => {
                          setActiveTab('logs');
                          setSelectedChannel('telegram');
                          setExpandedLogId(log.id);
                        }}
                        className="w-full rounded-2xl border border-border/30 bg-card/30 p-3 text-left transition-colors hover:border-primary/20 hover:bg-card/50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <StatusBadge label={log.direction} tone={directionTone(log.direction)} />
                          <span className="text-xs text-secondary-content">
                            {formatRelativeTime(log.timestamp)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-foreground">{truncate(log.summary, 150)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel>
              <PanelHeader
                title="Live Telegram Surface"
                description="Current signal from the legacy Telegram ingress channel."
                icon={Radio}
                trailing={
                  selectedChannelDetails?.channelType === 'telegram' ? (
                    <StatusBadge
                      label={formatStatusLabel(selectedChannelDetails.status)}
                      tone={statusTone(selectedChannelDetails.status)}
                    />
                  ) : undefined
                }
              />
              {channels.find((channel) => channel.channelType === 'telegram') ? (
                <div className="space-y-4">
                  {(() => {
                    const telegramChannel = channels.find(
                      (channel) => channel.channelType === 'telegram'
                    )!;
                    return (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <SmallStat
                            label="Messages 24h"
                            value={telegramChannel.messages24h}
                            detail="Telegram activity rows"
                          />
                          <SmallStat
                            label="Active Sessions"
                            value={telegramChannel.activeSessions}
                            detail="Telegram sessions currently open"
                          />
                        </div>
                        <div className="rounded-2xl border border-border/30 bg-card/30 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                                {telegramChannel.name}
                              </div>
                              <p className="mt-1 text-sm text-secondary-content">
                                {telegramChannel.lastActivityAt
                                  ? `Last activity ${formatRelativeTime(telegramChannel.lastActivityAt)}`
                                  : 'No recent activity timestamp available.'}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setActiveTab('logs');
                                setSelectedChannel('telegram');
                              }}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                            >
                              Open logs
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-sm text-secondary-content">
                  Telegram is not configured in the legacy Picobot channel registry for this
                  workspace.
                </p>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Queue Snapshot"
                description="Most recent Picobot command traffic retained in the legacy runtime."
                icon={Terminal}
              />
              {recentCommands.length === 0 ? (
                <p className="text-sm text-secondary-content">
                  No Picobot command queue records are currently available.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentCommands.slice(0, 5).map((command) => (
                    <div
                      key={command.id}
                      className="rounded-2xl border border-border/30 bg-card/30 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                              {command.commandType}
                            </span>
                            <StatusBadge
                              label={formatStatusLabel(command.status)}
                              tone={statusTone(command.status)}
                            />
                          </div>
                          <p className="mt-2 text-sm text-secondary-content">
                            Created {formatRelativeTime(command.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {command.daxRunId && (
                            <Link
                              to={`/runs/${command.daxRunId}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              View Run
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          )}
                          {command.status === 'pending' && (
                            <button
                              onClick={() => executeCommand(command.id)}
                              disabled={executingCommandId === command.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                              {executingCommandId === command.id ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  Executing...
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3" />
                                  Execute
                                </>
                              )}
                            </button>
                          )}
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {command.ageMinutes}m old
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {activeTab === 'channels' && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <Panel>
            <PanelHeader
              title="Channel Registry"
              description="Configured Picobot ingress channels with live session and activity hints."
              icon={Layers3}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {channels.map((channel) => {
                const isActive = selectedChannelDetails?.id === channel.id;
                return (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setSelectedChannel(channel.channelType);
                      setActiveTab('channels');
                    }}
                    className={cn(
                      'rounded-3xl border p-5 text-left transition-all',
                      isActive
                        ? 'border-primary/20 bg-primary/[0.05]'
                        : 'border-border/30 bg-background/50 hover:border-primary/15 hover:bg-background/70'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                        {channel.name}
                      </span>
                      <StatusBadge
                        label={formatStatusLabel(channel.status)}
                        tone={statusTone(channel.status)}
                      />
                    </div>
                    <p className="mt-3 text-sm text-secondary-content">
                      {channel.enabled
                        ? 'Channel enabled for operator traffic.'
                        : 'Channel currently disabled.'}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <SmallInlineMetric label="24h" value={channel.messages24h} />
                      <SmallInlineMetric label="Sessions" value={channel.activeSessions} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel>
              <PanelHeader
                title={selectedChannelDetails?.name || 'Channel Detail'}
                description="Focused detail for the selected ingress surface."
                icon={Radio}
              />
              {selectedChannelDetails ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SmallStat
                      label="Messages 24h"
                      value={selectedChannelDetails.messages24h}
                      detail="Recent operator-visible messages"
                    />
                    <SmallStat
                      label="Active Sessions"
                      value={selectedChannelDetails.activeSessions}
                      detail="Current open sessions"
                    />
                  </div>
                  <div className="rounded-2xl border border-border/30 bg-card/30 p-4 text-sm text-secondary-content">
                    {selectedChannelDetails.lastActivityAt
                      ? `Last activity ${formatRelativeTime(selectedChannelDetails.lastActivityAt)}`
                      : 'No last-activity timestamp is currently stored for this channel.'}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-secondary-content">
                  Select a channel to inspect its operator posture.
                </p>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Session Inspector"
                description="Recent Picobot sessions tied to the selected channel."
                icon={MessageSquare}
              />
              {sessionsForSelectedChannel.length === 0 ? (
                <p className="text-sm text-secondary-content">
                  No sessions are currently visible for this channel.
                </p>
              ) : (
                <div className="space-y-3">
                  {sessionsForSelectedChannel.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setSelectedSessionId(session.id === selectedSessionId ? null : session.id);
                        setActiveTab('logs');
                      }}
                      className={cn(
                        'w-full rounded-2xl border p-4 text-left transition-all',
                        session.id === selectedSessionId
                          ? 'border-primary/20 bg-primary/[0.05]'
                          : 'border-border/30 bg-card/30 hover:border-primary/15 hover:bg-card/50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                              {session.userName || session.userId || truncate(session.id, 10)}
                            </span>
                            <StatusBadge
                              label={formatStatusLabel(session.status)}
                              tone={statusTone(session.status)}
                            />
                          </div>
                          <p className="mt-2 text-sm text-secondary-content">
                            Started {formatRelativeTime(session.startedAt)}
                          </p>
                        </div>
                        <div className="text-right text-sm text-secondary-content">
                          <div>{session.messageCount} messages</div>
                          <div>{session.tokenCount} tokens</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <Panel>
            <PanelHeader
              title="Telegram Log Console"
              description="Read-only operator trace from Picobot channel activity, with session-aware filtering."
              icon={MessageSquare}
              trailing={
                isLogsLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : undefined
              }
            />

            <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-border/30 bg-background/50 p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedChannel('all')}
                  className={channelFilterClass(selectedChannel === 'all')}
                >
                  All Channels
                </button>
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.channelType)}
                    className={channelFilterClass(selectedChannel === channel.channelType)}
                  >
                    {channel.name}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                <label className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={logSearch}
                    onChange={(event) => setLogSearch(event.target.value)}
                    placeholder="Search Telegram logs, users, and command traces..."
                    className="h-11 w-full rounded-2xl border border-border/40 bg-card/20 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/20"
                  />
                </label>

                <label className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/20 px-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={String(logLimit)}
                    onChange={(event) => setLogLimit(Number(event.target.value))}
                    className="h-11 bg-transparent text-sm outline-none"
                  >
                    <option value="30">30 logs</option>
                    <option value="60">60 logs</option>
                    <option value="100">100 logs</option>
                  </select>
                </label>

                <div className="flex items-center rounded-2xl border border-border/40 bg-card/20 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-secondary-content">
                  {filteredLogs.length} visible
                </div>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 p-8 text-center text-sm text-secondary-content">
                No logs match the current channel, session, and search filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => {
                  const expanded = expandedLogId === log.id;
                  return (
                    <button
                      key={log.id}
                      onClick={() => setExpandedLogId(expanded ? null : log.id)}
                      className="w-full rounded-3xl border border-border/30 bg-background/50 p-4 text-left transition-colors hover:border-primary/15 hover:bg-background/70"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              label={log.direction}
                              tone={directionTone(log.direction)}
                            />
                            <StatusBadge label={log.channelType || 'unknown'} tone="neutral" />
                            <StatusBadge label={formatStatusLabel(log.type)} tone="info" />
                            {log.userName && (
                              <StatusBadge label={truncate(log.userName, 20)} tone="neutral" />
                            )}
                          </div>
                          <p className="mt-3 text-sm text-foreground">
                            {expanded ? log.message : truncate(log.summary, 220)}
                          </p>
                        </div>
                        <div className="text-sm text-secondary-content">
                          {formatRelativeTime(log.timestamp)}
                        </div>
                      </div>
                      {expanded && (
                        <div className="mt-4 rounded-2xl border border-border/30 bg-card/30 p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <MetadataRow
                              label="User"
                              value={log.userName || log.userId || 'unknown'}
                            />
                            <MetadataRow
                              label="Timestamp"
                              value={new Date(log.timestamp).toLocaleString()}
                            />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          <div className="space-y-6">
            <Panel>
              <PanelHeader
                title="Session Focus"
                description="Pin a session to narrow the log console to one Telegram exchange."
                icon={Clock3}
              />
              {sessionsForSelectedChannel.length === 0 ? (
                <p className="text-sm text-secondary-content">
                  No recent sessions are available for the selected channel.
                </p>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedSessionId(null)}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition-all',
                      !selectedSessionId
                        ? 'border-primary/20 bg-primary/[0.05]'
                        : 'border-border/30 bg-card/30 hover:border-primary/15 hover:bg-card/50'
                    )}
                  >
                    <div className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                      All visible sessions
                    </div>
                    <p className="mt-2 text-sm text-secondary-content">
                      Use all logs for the current channel selection.
                    </p>
                  </button>
                  {sessionsForSelectedChannel.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={cn(
                        'w-full rounded-2xl border p-4 text-left transition-all',
                        session.id === selectedSessionId
                          ? 'border-primary/20 bg-primary/[0.05]'
                          : 'border-border/30 bg-card/30 hover:border-primary/15 hover:bg-card/50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                          {session.userName || session.userId || truncate(session.id, 10)}
                        </span>
                        <StatusBadge
                          label={formatStatusLabel(session.status)}
                          tone={statusTone(session.status)}
                        />
                      </div>
                      <p className="mt-2 text-sm text-secondary-content">
                        {session.messageCount} messages since{' '}
                        {formatRelativeTime(session.startedAt)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Operator Notes"
                description="Quick operational cues for the current log view."
                icon={Activity}
              />
              <div className="space-y-3 text-sm text-secondary-content">
                <p>
                  Showing{' '}
                  <span className="font-semibold text-foreground">{filteredLogs.length}</span>{' '}
                  visible logs for{' '}
                  <span className="font-semibold text-foreground">
                    {selectedChannel === 'all' ? 'all channels' : selectedChannel}
                  </span>
                  .
                </p>
                <p>
                  {selectedSession
                    ? `Session filter pinned to ${selectedSession.userName || selectedSession.userId || selectedSession.id}.`
                    : 'No session is pinned; logs are flowing across the current channel selection.'}
                </p>
                <p>
                  {lastUpdatedAt
                    ? `Last refreshed ${formatRelativeTime(lastUpdatedAt)}.`
                    : 'Refresh time not available yet.'}
                </p>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === 'capabilities' && (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <Panel>
            <PanelHeader
              title="Capability Catalog"
              description="Tool registry view of what Picobot can route toward through Soothsayer and DAX."
              icon={Wrench}
              trailing={<StatusBadge label={`${enabledTools.length} enabled`} tone="success" />}
            />
            {topTools.length === 0 ? (
              <p className="text-sm text-secondary-content">
                No workspace capability data is currently available.
              </p>
            ) : (
              <div className="space-y-3">
                {topTools.map((tool) => {
                  const effectiveRisk =
                    tool.workspaceConfig?.overrides?.riskLevel ?? tool.riskLevel ?? 'unknown';
                  const effectiveTier =
                    tool.workspaceConfig?.overrides?.requiredTier ?? tool.requiredTier ?? 0;
                  return (
                    <div
                      key={tool.id}
                      className="rounded-3xl border border-border/30 bg-background/50 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                              {tool.name}
                            </span>
                            <StatusBadge
                              label={formatStatusLabel(tool.status)}
                              tone={statusTone(tool.status)}
                            />
                            <StatusBadge
                              label={effectiveRisk}
                              tone={
                                rankRiskLevel(effectiveRisk) >= 3
                                  ? 'danger'
                                  : rankRiskLevel(effectiveRisk) === 2
                                    ? 'warning'
                                    : 'neutral'
                              }
                            />
                            <StatusBadge
                              label={formatTierLabel(effectiveTier)}
                              tone={effectiveTier >= 2 ? 'info' : 'neutral'}
                            />
                          </div>
                          <p className="mt-2 text-sm text-secondary-content">
                            {tool.description || 'No description available.'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            <span>{tool.slug}</span>
                            <span>•</span>
                            <span>{tool.category || 'uncategorized'}</span>
                            <span>•</span>
                            <span>{tool.domain || 'unspecified domain'}</span>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[300px]">
                          <SmallStat
                            label="Invocations"
                            value={tool.analytics?.totalInvocations ?? 0}
                            detail="Total observed"
                            compact
                          />
                          <SmallStat
                            label="Success"
                            value={formatPercent(tool.analytics?.successRate)}
                            detail="Observed rate"
                            compact
                          />
                          <SmallStat
                            label="Latency"
                            value={
                              tool.analytics?.avgLatencyMs
                                ? `${Math.round(tool.analytics.avgLatencyMs)}ms`
                                : 'n/a'
                            }
                            detail="Average latency"
                            compact
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <div className="space-y-6">
            <Panel>
              <PanelHeader
                title="Risk Focus"
                description="Capabilities most likely to require operator attention."
                icon={AlertTriangle}
              />
              {highRiskTools.length === 0 ? (
                <p className="text-sm text-secondary-content">
                  No high-risk capabilities are active in the current workspace.
                </p>
              ) : (
                <div className="space-y-3">
                  {highRiskTools.map((tool) => {
                    const effectiveRisk =
                      tool.workspaceConfig?.overrides?.riskLevel ?? tool.riskLevel ?? 'unknown';
                    const effectiveTier =
                      tool.workspaceConfig?.overrides?.requiredTier ?? tool.requiredTier ?? 0;
                    return (
                      <div
                        key={tool.id}
                        className="rounded-2xl border border-rose-500/10 bg-rose-500/[0.03] p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                            {tool.name}
                          </span>
                          <StatusBadge label={effectiveRisk} tone="danger" />
                          <StatusBadge label={formatTierLabel(effectiveTier)} tone="info" />
                        </div>
                        <p className="mt-2 text-sm text-secondary-content">
                          {tool.description || 'No description available.'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Registry Shape"
                description="How the capability registry is distributed across categories."
                icon={GitBranch}
              />
              <div className="space-y-3">
                {categoryCount.map(([category, count]) => (
                  <div
                    key={category}
                    className="rounded-2xl border border-border/30 bg-background/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                        {category}
                      </span>
                      <StatusBadge label={`${count} tools`} tone="info" />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === 'governance' && (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <Panel>
            <PanelHeader
              title="Governed Activity"
              description="Recent DAX runs visible from the current Picobot workspace context."
              icon={ShieldCheck}
              trailing={
                <Link to="/dax" className="text-sm font-semibold text-primary hover:underline">
                  Open control plane
                </Link>
              }
            />

            {recentRuns.length === 0 ? (
              <p className="text-sm text-secondary-content">
                No recent DAX runs are currently visible for this workspace.
              </p>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <Link
                    key={run.runId}
                    to={runLink(run)}
                    className="group block rounded-3xl border border-border/30 bg-background/50 p-4 transition-colors hover:border-primary/15 hover:bg-background/70"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                            {run.title || `Run ${truncate(run.runId, 14)}`}
                          </span>
                          <StatusBadge
                            label={formatStatusLabel(run.status)}
                            tone={statusTone(run.status)}
                          />
                          <StatusBadge label={run.sourceSurface || 'unknown'} tone="neutral" />
                          {run.pendingApprovalCount > 0 && (
                            <StatusBadge
                              label={`${run.pendingApprovalCount} approvals`}
                              tone="warning"
                            />
                          )}
                        </div>
                        <p className="mt-2 text-sm text-secondary-content">
                          {run.failureDescription ||
                            run.terminalReasonLabel ||
                            'Governed run visible from the DAX operator plane.'}
                        </p>
                      </div>
                      <div className="text-sm text-secondary-content">
                        {formatRelativeTime(run.updatedAt || run.createdAt)}
                      </div>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      View run
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <div className="space-y-6">
            <Panel>
              <PanelHeader
                title="Approval Posture"
                description="Immediate view of DAX approval pressure on the current workspace."
                icon={Activity}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <SmallStat
                  label="Pending Approvals"
                  value={daxOverview?.pendingApprovals.length || 0}
                  detail="Awaiting operator action"
                />
                <SmallStat
                  label="Active Runs"
                  value={daxOverview?.activeRuns.length || 0}
                  detail="Currently executing"
                />
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                title="Operator Notes"
                description="Current state of the Picobot supervision surface."
                icon={Sparkles}
              />
              <div className="space-y-3 text-sm text-secondary-content">
                <p>
                  {connectedIngresses.length > 0
                    ? `${connectedIngresses.length} ingress surfaces are actively connected right now.`
                    : 'No ingress surfaces are actively connected right now.'}
                </p>
                <p>
                  {configuredIngresses.length > 0
                    ? `${configuredIngresses.length} ingress providers are configured in this workspace.`
                    : 'No ingress providers are configured in this workspace.'}
                </p>
                <p>
                  {lastUpdatedAt
                    ? `Last refreshed ${formatRelativeTime(lastUpdatedAt)}.`
                    : 'Refresh time is not currently available.'}
                </p>
                {inferredRepoPath && (
                  <p className="rounded-2xl border border-border/30 bg-background/50 px-4 py-3 font-mono text-xs text-muted-foreground">
                    repoPath: {inferredRepoPath}
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function NodeCard({
  title,
  body,
  accent = false,
}: {
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-3xl border p-4',
        accent ? 'border-primary/20 bg-primary/[0.05]' : 'border-border/30 bg-background/50'
      )}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary-content">
        {title}
      </div>
      <p className="mt-3 text-sm text-foreground">{body}</p>
    </div>
  );
}

function SmallStat({
  label,
  value,
  detail,
  compact = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/30 bg-background/50 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-content">
        {label}
      </div>
      <div className={cn('mt-2 font-black text-foreground', compact ? 'text-xl' : 'text-2xl')}>
        {value}
      </div>
      <p className="mt-2 text-sm text-secondary-content">{detail}</p>
    </div>
  );
}

function SmallInlineMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/30 bg-card/30 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-content">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-foreground">{value}</div>
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-content">
        {label}
      </div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

function channelFilterClass(active: boolean) {
  return cn(
    'rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition-colors',
    active
      ? 'bg-primary text-primary-foreground'
      : 'bg-card/30 text-secondary-content hover:bg-card/50 hover:text-foreground'
  );
}
