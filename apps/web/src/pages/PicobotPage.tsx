import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  GitBranch,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Sparkles,
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
  config?: {
    isBuiltIn?: boolean;
  };
  analytics?: {
    totalInvocations?: number;
    successRate?: number;
    avgLatencyMs?: number;
    errorRate?: number;
    lastInvokedAt?: string | Date | null;
    lastHealthStatus?: string | null;
  };
  workspaceConfig?: {
    enabled?: boolean;
    overrides?: {
      requiredTier?: number;
      riskLevel?: string;
      timeout?: number;
    } | null;
  } | null;
};

type IntegrationStatus = {
  name: string;
  configured: boolean;
  connected: boolean;
  message: string;
  accountName?: string;
  lastTestStatus?: 'pass' | 'fail' | 'not_configured';
};

const INGRESS_LABELS: Record<string, string> = {
  slack: 'Slack',
  github: 'GitHub',
  jira: 'Jira',
  linear: 'Linear',
  notion: 'Notion',
  discord: 'Discord',
  google_drive: 'Google Drive',
};

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
        tone === 'neutral' && 'bg-muted/40 text-secondary-content',
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

export function PicobotPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const { providers, activeProvider, activeModel } = useAIProviderStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [daxHealth, setDaxHealth] = useState<DaxHealthResponse | null>(null);
  const [daxOverview, setDaxOverview] = useState<DaxRunOverviewResponse | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

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

  const loadPage = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const [toolsResult, healthResult, overviewResult, integrationsResult] = await Promise.allSettled([
          apiHelpers.getTools(currentWorkspace?.id),
          apiHelpers.getDaxHealth(),
          apiHelpers.getDaxOverview(inferredRepoPath),
          apiHelpers.getIntegrationStatus(currentWorkspace?.id),
        ]);

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
          setIntegrations(Array.isArray(integrationsResult.value.data) ? integrationsResult.value.data : []);
        } else {
          setIntegrations([]);
        }

        const failedLoads = [toolsResult, healthResult, overviewResult, integrationsResult].filter(
          (result) => result.status === 'rejected'
        ).length;

        setError(
          failedLoads > 0
            ? 'Some Picobot operator signals are unavailable right now, but the page is still showing the data we could load.'
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

  useEffect(() => {
    void loadPage('initial');
  }, [loadPage]);

  const daxProvider = useMemo(
    () => providers.find((provider) => provider.id === 'dax'),
    [providers]
  );

  const fallbackProviders = useMemo(
    () => providers.filter((provider) => provider.id !== 'dax'),
    [providers]
  );

  const activeTools = useMemo(
    () => tools.filter((tool) => tool.status !== 'disabled'),
    [tools]
  );

  const enabledTools = useMemo(
    () => activeTools.filter((tool) => tool.workspaceConfig?.enabled !== false),
    [activeTools]
  );

  const governedTools = useMemo(
    () =>
      enabledTools.filter((tool) => {
        const effectiveTier = tool.workspaceConfig?.overrides?.requiredTier ?? tool.requiredTier ?? 0;
        return effectiveTier >= 2;
      }),
    [enabledTools]
  );

  const highRiskTools = useMemo(
    () =>
      [...enabledTools]
        .filter((tool) => rankRiskLevel(tool.workspaceConfig?.overrides?.riskLevel ?? tool.riskLevel) >= 3)
        .sort((left, right) => {
          const riskDelta =
            rankRiskLevel(right.workspaceConfig?.overrides?.riskLevel ?? right.riskLevel) -
            rankRiskLevel(left.workspaceConfig?.overrides?.riskLevel ?? left.riskLevel);

          if (riskDelta !== 0) {
            return riskDelta;
          }

          return (right.analytics?.totalInvocations ?? 0) - (left.analytics?.totalInvocations ?? 0);
        })
        .slice(0, 5),
    [enabledTools]
  );

  const topTools = useMemo(
    () =>
      [...enabledTools]
        .sort((left, right) => (right.analytics?.totalInvocations ?? 0) - (left.analytics?.totalInvocations ?? 0))
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
    const runs = dedupeRuns([...(daxOverview?.activeRuns || []), ...(daxOverview?.recentRuns || [])]);
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
  const primaryRouteLabel =
    daxHealth?.healthy && activeProvider === 'dax' ? 'DAX First' : daxHealth?.healthy ? 'DAX Ready' : 'Attention';

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
    <div className="mx-auto flex w-full max-w-[1450px] flex-col gap-8 p-6 md:p-10 animate-in-up">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
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
                  Picobot is the ingress layer for the suite. This page shows how requests route into
                  DAX, which capability registry entries are live for the workspace, and where policy,
                  approvals, and fallback posture stand right now.
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
              label={currentWorkspace?.name || 'Global Workspace'}
              tone="neutral"
            />
            <button
              onClick={() => void loadPage('refresh')}
              className="flex h-10 items-center gap-2 rounded-xl border border-border/40 bg-card/30 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-card/60"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-border/40 bg-card/20 p-5 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-label">Suite Topology</span>
            </div>
            <div className="grid gap-3">
              <div className="rounded-2xl border border-border/30 bg-background/50 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary-content">
                  Picobot
                </div>
                <p className="mt-2 text-sm text-foreground">Ingress and routing for operator requests.</p>
              </div>
              <div className="rounded-2xl border border-border/30 bg-background/50 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary-content">
                  DAX
                </div>
                <p className="mt-2 text-sm text-foreground">Execution authority for approvals, replay, and governed runs.</p>
              </div>
              <div className="rounded-2xl border border-border/30 bg-background/50 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary-content">
                  Soothsayer
                </div>
                <p className="mt-2 text-sm text-foreground">Operator plane for policy, monitoring, and capability oversight.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/40 bg-card/20 p-5 md:p-6 lg:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <Workflow className="h-4 w-4 text-primary" />
              <span className="text-label">Authority Path</span>
            </div>
            <div className="grid gap-4 md:grid-cols-[1.1fr_auto_1.2fr_auto_1fr] md:items-center">
              <div className="rounded-2xl border border-border/30 bg-background/50 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary-content">
                  Ingress
                </div>
                <div className="mt-2 text-base font-bold text-foreground">Picobot surface</div>
                <p className="mt-2 text-sm text-secondary-content">
                  Normal requests enter through operator-facing chat and workspace context.
                </p>
              </div>
              <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground md:block" />
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                  Primary Route
                </div>
                <div className="mt-2 text-base font-bold text-foreground">
                  {daxProvider?.name || 'DAX Assistant'}
                </div>
                <p className="mt-2 text-sm text-secondary-content">
                  Default model: {activeProvider === 'dax' ? activeModel : daxProvider?.defaultModel || 'gemini-2.5-pro'}
                </p>
              </div>
              <ArrowRight className="mx-auto hidden h-4 w-4 text-muted-foreground md:block" />
              <div className="rounded-2xl border border-border/30 bg-background/50 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary-content">
                  Advanced Fallbacks
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {fallbackProviders.map((provider) => (
                    <StatusBadge
                      key={provider.id}
                      label={provider.id}
                      tone={provider.isConfigured ? 'info' : 'neutral'}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm text-secondary-content">
                  Direct providers stay available as explicit overrides, not the default path.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={ShieldCheck}
            label="Primary Route"
            value={primaryRouteLabel}
            detail={
              daxHealth?.checkedAt
                ? `Health checked ${formatRelativeTime(daxHealth.checkedAt)}`
                : 'DAX health is currently unavailable.'
            }
          />
          <MetricCard
            icon={Activity}
            label="Governed Runs"
            value={daxOverview?.activeRuns.length || 0}
            detail={`${recentRuns.length} recent runs visible on this surface`}
          />
          <MetricCard
            icon={AlertTriangle}
            label="Pending Approvals"
            value={daxOverview?.pendingApprovals.length || 0}
            detail={`${governedTools.length} capabilities currently sit at tier 2 or tier 3`}
          />
          <MetricCard
            icon={Wrench}
            label="Capability Registry"
            value={enabledTools.length}
            detail={`${categoryCount.length} categories with ${configuredIngresses.length} configured ingress surfaces`}
          />
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-[2rem] border border-border/40 bg-card/20 p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">Capability Catalog</h2>
              <p className="mt-1 text-sm text-secondary-content">
                Registry view of the tools Picobot can route toward through the governed Soothsayer and DAX path.
              </p>
            </div>
            <StatusBadge label={`${enabledTools.length} enabled`} tone="success" />
          </div>

          {topTools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 p-8 text-center text-sm text-secondary-content">
              No tool registry data is currently available for this workspace.
            </div>
          ) : (
            <div className="space-y-3">
              {topTools.map((tool) => {
                const effectiveRisk = tool.workspaceConfig?.overrides?.riskLevel ?? tool.riskLevel ?? 'unknown';
                const effectiveTier = tool.workspaceConfig?.overrides?.requiredTier ?? tool.requiredTier ?? 0;
                const invocationCount = tool.analytics?.totalInvocations ?? 0;
                const successRate = tool.analytics?.successRate ?? 0;

                return (
                  <div
                    key={tool.id}
                    className="rounded-2xl border border-border/30 bg-background/50 p-4 transition-colors hover:border-primary/20 hover:bg-background/70"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                            {tool.name}
                          </h3>
                          <StatusBadge
                            label={formatStatusLabel(tool.status)}
                            tone={tool.status === 'active' ? 'success' : tool.status === 'beta' ? 'info' : 'warning'}
                          />
                          <StatusBadge
                            label={effectiveRisk}
                            tone={rankRiskLevel(effectiveRisk) >= 3 ? 'danger' : rankRiskLevel(effectiveRisk) === 2 ? 'warning' : 'neutral'}
                          />
                          <StatusBadge
                            label={formatTierLabel(effectiveTier)}
                            tone={effectiveTier >= 2 ? 'info' : 'neutral'}
                          />
                          {tool.workspaceConfig?.enabled === false && (
                            <StatusBadge label="workspace disabled" tone="warning" />
                          )}
                        </div>
                        <p className="mt-2 text-sm text-secondary-content">
                          {tool.description || 'No tool description available.'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          <span>{tool.slug}</span>
                          <span>•</span>
                          <span>{tool.category || 'uncategorized'}</span>
                          <span>•</span>
                          <span>{tool.domain || 'unspecified domain'}</span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[320px]">
                        <div className="rounded-2xl border border-border/30 bg-card/30 p-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-content">
                            Invocations
                          </div>
                          <div className="mt-2 text-xl font-black text-foreground">{invocationCount}</div>
                        </div>
                        <div className="rounded-2xl border border-border/30 bg-card/30 p-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-content">
                            Success
                          </div>
                          <div className="mt-2 text-xl font-black text-foreground">
                            {formatPercent(successRate)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-border/30 bg-card/30 p-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-content">
                            Latency
                          </div>
                          <div className="mt-2 text-xl font-black text-foreground">
                            {tool.analytics?.avgLatencyMs ? `${Math.round(tool.analytics.avgLatencyMs)}ms` : 'n/a'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-border/40 bg-card/20 p-5 md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <Layers3 className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">Ingress Surfaces</h2>
                <p className="mt-1 text-sm text-secondary-content">
                  Connected and configured endpoints that can feed the operator plane.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="rounded-2xl border border-border/30 bg-background/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                          {INGRESS_LABELS[integration.name] || integration.name}
                        </h3>
                        <StatusBadge
                          label={integration.connected ? 'connected' : integration.configured ? 'ready' : 'not ready'}
                          tone={integration.connected ? 'success' : integration.configured ? 'info' : 'neutral'}
                        />
                      </div>
                      <p className="mt-2 text-sm text-secondary-content">{integration.message}</p>
                      {integration.accountName && (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {integration.accountName}
                        </p>
                      )}
                    </div>
                    {integration.connected ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}

              {integrations.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 p-6 text-sm text-secondary-content">
                  No integration readiness data is currently available.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/40 bg-card/20 p-5 md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">Policy Posture</h2>
                <p className="mt-1 text-sm text-secondary-content">
                  Workspace risk and execution posture for the tools Picobot can route into.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/30 bg-background/50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-content">
                  Tier 2+
                </div>
                <div className="mt-2 text-2xl font-black text-foreground">{governedTools.length}</div>
                <p className="mt-2 text-sm text-secondary-content">
                  Capabilities that enter supervised or governed execution.
                </p>
              </div>
              <div className="rounded-2xl border border-border/30 bg-background/50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-content">
                  High Risk
                </div>
                <div className="mt-2 text-2xl font-black text-foreground">{highRiskTools.length}</div>
                <p className="mt-2 text-sm text-secondary-content">
                  Capabilities with high or critical effective risk.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {highRiskTools.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 p-4 text-sm text-secondary-content">
                  No high-risk capabilities are currently exposed through the registry.
                </div>
              ) : (
                highRiskTools.map((tool) => {
                  const effectiveRisk = tool.workspaceConfig?.overrides?.riskLevel ?? tool.riskLevel ?? 'unknown';
                  const effectiveTier = tool.workspaceConfig?.overrides?.requiredTier ?? tool.requiredTier ?? 0;
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
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-[2rem] border border-border/40 bg-card/20 p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">Governed Activity</h2>
              <p className="mt-1 text-sm text-secondary-content">
                The most recent DAX runs currently visible from the Picobot ingress surface.
              </p>
            </div>
            <Link to="/dax" className="text-sm font-semibold text-primary hover:underline">
              Open control plane
            </Link>
          </div>

          {recentRuns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 p-8 text-center text-sm text-secondary-content">
              No governed runs are visible yet for this workspace context.
            </div>
          ) : (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <Link
                  key={run.runId}
                  to={runLink(run)}
                  className="group flex flex-col gap-4 rounded-2xl border border-border/30 bg-background/50 p-4 transition-colors hover:border-primary/20 hover:bg-background/70"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                          {run.title || `Run ${truncate(run.runId, 14)}`}
                        </span>
                        <StatusBadge
                          label={formatStatusLabel(run.status)}
                          tone={
                            run.status === 'completed'
                              ? 'success'
                              : run.status === 'failed'
                                ? 'danger'
                                : run.status === 'waiting_approval'
                                  ? 'warning'
                                  : 'info'
                          }
                        />
                        <StatusBadge label={run.sourceSurface || 'unknown'} tone="neutral" />
                        {run.pendingApprovalCount > 0 && (
                          <StatusBadge label={`${run.pendingApprovalCount} approvals`} tone="warning" />
                        )}
                      </div>
                      <p className="mt-2 text-sm text-secondary-content">
                        {run.failureDescription || run.terminalReasonLabel || 'Governed run visible from the DAX operator plane.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <span>{truncate(run.runId, 16)}</span>
                        <span>•</span>
                        <span>{run.provider || 'dax'}</span>
                        <span>•</span>
                        <span>{run.model || daxProvider?.defaultModel || 'governed model'}</span>
                      </div>
                    </div>
                    <div className="text-sm text-secondary-content xl:text-right">
                      {formatRelativeTime(run.updatedAt || run.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    View run
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-border/40 bg-card/20 p-5 md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <GitBranch className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">Registry Shape</h2>
                <p className="mt-1 text-sm text-secondary-content">
                  How the current workspace capability registry is distributed.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {categoryCount.map(([category, count]) => (
                <div key={category} className="rounded-2xl border border-border/30 bg-background/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black uppercase tracking-[0.14em] text-foreground">
                      {category}
                    </span>
                    <StatusBadge label={`${count} tools`} tone="info" />
                  </div>
                </div>
              ))}

              {categoryCount.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border/50 bg-background/30 p-4 text-sm text-secondary-content">
                  The workspace has not surfaced any categorized capabilities yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/40 bg-card/20 p-5 md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <Activity className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">Operator Notes</h2>
                <p className="mt-1 text-sm text-secondary-content">
                  Current summary of the Picobot control surface.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-secondary-content">
              <p>
                {connectedIngresses.length > 0
                  ? `${connectedIngresses.length} ingress surfaces are actively connected right now.`
                  : 'No ingress surfaces are actively connected right now.'}
              </p>
              <p>
                {enabledTools.length > 0
                  ? `${enabledTools.length} capabilities are currently enabled in the registry, with ${governedTools.length} crossing into supervised execution tiers.`
                  : 'No enabled capability registry entries were returned for this workspace.'}
              </p>
              <p>
                {lastUpdatedAt
                  ? `Last refreshed ${formatRelativeTime(lastUpdatedAt)}.`
                  : 'Refresh timing is not available yet.'}
              </p>
              {inferredRepoPath && (
                <p className="rounded-2xl border border-border/30 bg-background/50 px-4 py-3 font-mono text-xs text-muted-foreground">
                  repoPath: {inferredRepoPath}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
