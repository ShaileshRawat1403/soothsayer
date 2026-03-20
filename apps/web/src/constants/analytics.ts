export interface AnalyticsStat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  resource: string;
  status: 'success' | 'blocked' | 'pending';
  timestamp: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PersonaUsage {
  name: string;
  usage: number;
  color: string;
}

export const ANALYTICS_MOCK_STATS: AnalyticsStat[] = [
  {
    label: 'Total Commands',
    value: '2,847',
    change: '+12.5%',
    trend: 'up',
    icon: 'Terminal',
  },
  {
    label: 'Workflow Runs',
    value: '456',
    change: '+8.2%',
    trend: 'up',
    icon: 'GitBranch',
  },
  {
    label: 'Chat Conversations',
    value: '1,234',
    change: '+24.1%',
    trend: 'up',
    icon: 'MessageSquare',
  },
  {
    label: 'Active Users',
    value: '89',
    change: '-2.3%',
    trend: 'down',
    icon: 'Users',
  },
];

export const ANALYTICS_MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: '1',
    action: 'command.execute',
    user: 'alice@company.com',
    resource: 'npm audit fix',
    status: 'success',
    timestamp: '2024-01-15T10:30:00Z',
    riskLevel: 'medium',
  },
  {
    id: '2',
    action: 'workflow.run',
    user: 'bob@company.com',
    resource: 'Release Checklist',
    status: 'success',
    timestamp: '2024-01-15T10:25:00Z',
    riskLevel: 'low',
  },
  {
    id: '3',
    action: 'persona.switch',
    user: 'alice@company.com',
    resource: 'Security Engineer',
    status: 'success',
    timestamp: '2024-01-15T10:20:00Z',
    riskLevel: 'low',
  },
  {
    id: '4',
    action: 'command.execute',
    user: 'charlie@company.com',
    resource: 'rm -rf node_modules',
    status: 'blocked',
    timestamp: '2024-01-15T10:15:00Z',
    riskLevel: 'high',
  },
  {
    id: '5',
    action: 'approval.request',
    user: 'bob@company.com',
    resource: 'Production Deploy',
    status: 'pending',
    timestamp: '2024-01-15T10:10:00Z',
    riskLevel: 'critical',
  },
];

export const ANALYTICS_MOCK_PERSONA_USAGE: PersonaUsage[] = [
  { name: 'Staff SWE', usage: 35, color: 'bg-blue-500' },
  { name: 'Backend Dev', usage: 25, color: 'bg-emerald-500' },
  { name: 'Security Eng', usage: 20, color: 'bg-amber-500' },
  { name: 'Data Analyst', usage: 12, color: 'bg-purple-500' },
  { name: 'DevOps Eng', usage: 8, color: 'bg-rose-500' },
];
