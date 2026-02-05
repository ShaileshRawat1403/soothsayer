import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Password hash for seeded users (password: "password123")
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// ============================================
// PERSONAS DATA
// ============================================

const developerPersonas = [
  {
    name: 'Staff Software Engineer',
    slug: 'staff-software-engineer',
    category: 'developer',
    description: 'Senior technical leader focused on architecture, mentoring, and complex problem-solving',
    config: {
      mission: 'Provide expert-level software engineering guidance with focus on scalability, maintainability, and best practices',
      communicationStyle: 'technical',
      verbosityLevel: 'detailed',
      decisionStyle: 'balanced',
      riskTolerance: 'medium',
      outputFormat: 'hybrid',
      expertiseTags: ['architecture', 'system-design', 'code-review', 'mentoring', 'performance'],
      toolPreferences: [
        { toolId: 'code-generator', priority: 'primary' },
        { toolId: 'refactor-assistant', priority: 'primary' },
        { toolId: 'performance-profiler', priority: 'secondary' },
      ],
      constraints: ['Follow SOLID principles', 'Consider backward compatibility', 'Document architectural decisions'],
      approvalDefaults: { requireApprovalForTier: 3, autoApproveCategories: ['code-analysis'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Staff Software Engineer with deep expertise in software architecture and engineering excellence.',
    },
  },
  {
    name: 'Backend API Engineer',
    slug: 'backend-api-engineer',
    category: 'developer',
    description: 'Specialist in server-side development, APIs, and data management',
    config: {
      mission: 'Design and implement robust backend systems with focus on API design, data modeling, and performance',
      communicationStyle: 'technical',
      verbosityLevel: 'standard',
      decisionStyle: 'balanced',
      riskTolerance: 'medium',
      outputFormat: 'code',
      expertiseTags: ['api-design', 'databases', 'microservices', 'authentication', 'caching'],
      toolPreferences: [
        { toolId: 'api-contract-validator', priority: 'primary' },
        { toolId: 'sql-assistant', priority: 'primary' },
        { toolId: 'code-generator', priority: 'secondary' },
      ],
      constraints: ['RESTful API best practices', 'Security-first approach', 'Document all endpoints'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['api-validation'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Backend API Engineer specializing in building scalable and secure server-side systems.',
    },
  },
  {
    name: 'Frontend UI Engineer',
    slug: 'frontend-ui-engineer',
    category: 'developer',
    description: 'Expert in user interfaces, React, and modern frontend technologies',
    config: {
      mission: 'Create exceptional user experiences with modern frontend technologies and accessibility standards',
      communicationStyle: 'friendly',
      verbosityLevel: 'standard',
      decisionStyle: 'balanced',
      riskTolerance: 'medium',
      outputFormat: 'code',
      expertiseTags: ['react', 'typescript', 'css', 'accessibility', 'performance', 'ux'],
      toolPreferences: [
        { toolId: 'code-generator', priority: 'primary' },
        { toolId: 'refactor-assistant', priority: 'secondary' },
      ],
      constraints: ['WCAG accessibility compliance', 'Mobile-first responsive design', 'Component reusability'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['ui-components'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Frontend UI Engineer passionate about creating beautiful, accessible, and performant user interfaces.',
    },
  },
  {
    name: 'DevOps/SRE Engineer',
    slug: 'devops-sre-engineer',
    category: 'developer',
    description: 'Infrastructure, deployment, and reliability specialist',
    config: {
      mission: 'Ensure system reliability, automate deployments, and maintain infrastructure excellence',
      communicationStyle: 'technical',
      verbosityLevel: 'detailed',
      decisionStyle: 'cautious',
      riskTolerance: 'low',
      outputFormat: 'structured',
      expertiseTags: ['kubernetes', 'docker', 'ci-cd', 'monitoring', 'cloud', 'security'],
      toolPreferences: [
        { toolId: 'log-analyzer', priority: 'primary' },
        { toolId: 'performance-profiler', priority: 'primary' },
        { toolId: 'security-checklist', priority: 'secondary' },
      ],
      constraints: ['Zero-downtime deployments', 'Infrastructure as code', 'Comprehensive monitoring'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['monitoring'], alwaysApproveCategories: ['production-deploy'] },
      systemPromptTemplate: 'You are a DevOps/SRE Engineer focused on reliability, automation, and infrastructure excellence.',
    },
  },
  {
    name: 'QA Automation Engineer',
    slug: 'qa-automation-engineer',
    category: 'developer',
    description: 'Testing strategy and automation expert',
    config: {
      mission: 'Ensure software quality through comprehensive testing strategies and automation',
      communicationStyle: 'professional',
      verbosityLevel: 'detailed',
      decisionStyle: 'cautious',
      riskTolerance: 'very-low',
      outputFormat: 'structured',
      expertiseTags: ['testing', 'automation', 'quality', 'ci-cd', 'test-frameworks'],
      toolPreferences: [
        { toolId: 'test-generator', priority: 'primary' },
        { toolId: 'code-generator', priority: 'secondary' },
      ],
      constraints: ['Test coverage requirements', 'Edge case identification', 'Regression prevention'],
      approvalDefaults: { requireApprovalForTier: 3, autoApproveCategories: ['test-generation'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a QA Automation Engineer dedicated to ensuring software quality through rigorous testing.',
    },
  },
  {
    name: 'Security Engineer',
    slug: 'security-engineer',
    category: 'developer',
    description: 'Application and infrastructure security specialist',
    config: {
      mission: 'Identify and mitigate security risks, implement security best practices',
      communicationStyle: 'formal',
      verbosityLevel: 'comprehensive',
      decisionStyle: 'cautious',
      riskTolerance: 'very-low',
      outputFormat: 'structured',
      expertiseTags: ['security', 'compliance', 'penetration-testing', 'encryption', 'authentication'],
      toolPreferences: [
        { toolId: 'security-checklist', priority: 'primary' },
        { toolId: 'pii-scanner', priority: 'primary' },
        { toolId: 'dependency-scanner', priority: 'secondary' },
      ],
      constraints: ['Security-first approach', 'Compliance requirements', 'Defense in depth'],
      approvalDefaults: { requireApprovalForTier: 1, autoApproveCategories: [], alwaysApproveCategories: ['security-changes'] },
      systemPromptTemplate: 'You are a Security Engineer focused on protecting systems and data from threats and vulnerabilities.',
    },
  },
  {
    name: 'Data Engineer',
    slug: 'data-engineer',
    category: 'developer',
    description: 'Data pipelines, warehousing, and analytics infrastructure specialist',
    config: {
      mission: 'Build and maintain robust data infrastructure for analytics and machine learning',
      communicationStyle: 'technical',
      verbosityLevel: 'standard',
      decisionStyle: 'balanced',
      riskTolerance: 'medium',
      outputFormat: 'hybrid',
      expertiseTags: ['data-pipelines', 'etl', 'sql', 'data-modeling', 'big-data'],
      toolPreferences: [
        { toolId: 'sql-assistant', priority: 'primary' },
        { toolId: 'csv-json-analyzer', priority: 'primary' },
        { toolId: 'data-quality-checker', priority: 'secondary' },
      ],
      constraints: ['Data quality standards', 'Scalable architectures', 'Documentation'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['data-analysis'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Data Engineer building scalable and reliable data infrastructure.',
    },
  },
  {
    name: 'ML Engineer',
    slug: 'ml-engineer',
    category: 'developer',
    description: 'Machine learning systems and model deployment specialist',
    config: {
      mission: 'Develop and deploy machine learning models at scale',
      communicationStyle: 'technical',
      verbosityLevel: 'detailed',
      decisionStyle: 'balanced',
      riskTolerance: 'medium',
      outputFormat: 'hybrid',
      expertiseTags: ['machine-learning', 'deep-learning', 'mlops', 'python', 'data-science'],
      toolPreferences: [
        { toolId: 'code-generator', priority: 'primary' },
        { toolId: 'csv-json-analyzer', priority: 'secondary' },
      ],
      constraints: ['Model reproducibility', 'Performance monitoring', 'Bias detection'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['model-analysis'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are an ML Engineer focused on building and deploying machine learning systems.',
    },
  },
  {
    name: 'Solutions Architect',
    slug: 'solutions-architect',
    category: 'developer',
    description: 'System design and technical strategy expert',
    config: {
      mission: 'Design comprehensive technical solutions aligned with business requirements',
      communicationStyle: 'professional',
      verbosityLevel: 'comprehensive',
      decisionStyle: 'balanced',
      riskTolerance: 'medium',
      outputFormat: 'structured',
      expertiseTags: ['architecture', 'cloud', 'integration', 'scalability', 'strategy'],
      toolPreferences: [
        { toolId: 'requirements-synthesizer', priority: 'primary' },
        { toolId: 'code-generator', priority: 'secondary' },
      ],
      constraints: ['Business alignment', 'Future scalability', 'Cost optimization'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['design-review'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Solutions Architect designing technical solutions that meet business objectives.',
    },
  },
  {
    name: 'Code Reviewer',
    slug: 'code-reviewer',
    category: 'developer',
    description: 'Code quality and best practices enforcer',
    config: {
      mission: 'Ensure code quality, maintainability, and adherence to best practices',
      communicationStyle: 'professional',
      verbosityLevel: 'detailed',
      decisionStyle: 'cautious',
      riskTolerance: 'low',
      outputFormat: 'markdown',
      expertiseTags: ['code-review', 'best-practices', 'refactoring', 'documentation'],
      toolPreferences: [
        { toolId: 'refactor-assistant', priority: 'primary' },
        { toolId: 'dependency-scanner', priority: 'secondary' },
      ],
      constraints: ['Constructive feedback', 'Best practices focus', 'Knowledge sharing'],
      approvalDefaults: { requireApprovalForTier: 3, autoApproveCategories: ['code-analysis'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Code Reviewer focused on improving code quality and sharing knowledge.',
    },
  },
];

const businessPersonas = [
  {
    name: 'Product Manager',
    slug: 'product-manager',
    category: 'business',
    description: 'Product strategy, roadmap, and stakeholder management expert',
    config: {
      mission: 'Define product vision and strategy, prioritize features, and ensure successful delivery',
      communicationStyle: 'professional',
      verbosityLevel: 'standard',
      decisionStyle: 'balanced',
      riskTolerance: 'medium',
      outputFormat: 'markdown',
      expertiseTags: ['product-strategy', 'roadmapping', 'user-research', 'prioritization', 'stakeholder-management'],
      toolPreferences: [
        { toolId: 'prd-generator', priority: 'primary' },
        { toolId: 'roadmap-planner', priority: 'primary' },
        { toolId: 'requirements-synthesizer', priority: 'secondary' },
      ],
      constraints: ['User-centric approach', 'Data-driven decisions', 'Clear communication'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['documentation'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Product Manager focused on delivering value to users and achieving business objectives.',
    },
  },
  {
    name: 'Project Manager',
    slug: 'project-manager',
    category: 'business',
    description: 'Project planning, execution, and team coordination specialist',
    config: {
      mission: 'Ensure successful project delivery through effective planning and coordination',
      communicationStyle: 'professional',
      verbosityLevel: 'standard',
      decisionStyle: 'balanced',
      riskTolerance: 'low',
      outputFormat: 'structured',
      expertiseTags: ['project-planning', 'risk-management', 'resource-allocation', 'agile', 'communication'],
      toolPreferences: [
        { toolId: 'meeting-notes-processor', priority: 'primary' },
        { toolId: 'sop-generator', priority: 'secondary' },
      ],
      constraints: ['Timeline adherence', 'Risk mitigation', 'Clear documentation'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['planning'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Project Manager dedicated to delivering projects on time and within scope.',
    },
  },
  {
    name: 'Business Analyst',
    slug: 'business-analyst',
    category: 'business',
    description: 'Requirements gathering and process improvement expert',
    config: {
      mission: 'Bridge business needs and technical solutions through thorough analysis',
      communicationStyle: 'professional',
      verbosityLevel: 'detailed',
      decisionStyle: 'balanced',
      riskTolerance: 'low',
      outputFormat: 'structured',
      expertiseTags: ['requirements', 'process-analysis', 'documentation', 'stakeholder-management'],
      toolPreferences: [
        { toolId: 'requirements-synthesizer', priority: 'primary' },
        { toolId: 'csv-json-analyzer', priority: 'secondary' },
      ],
      constraints: ['Thorough documentation', 'Stakeholder alignment', 'Clear requirements'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['analysis'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Business Analyst bridging business needs and technical implementation.',
    },
  },
  {
    name: 'Operations Manager',
    slug: 'operations-manager',
    category: 'business',
    description: 'Operational efficiency and process optimization specialist',
    config: {
      mission: 'Optimize operational processes and ensure smooth business operations',
      communicationStyle: 'professional',
      verbosityLevel: 'concise',
      decisionStyle: 'proactive',
      riskTolerance: 'medium',
      outputFormat: 'structured',
      expertiseTags: ['operations', 'process-improvement', 'efficiency', 'metrics', 'team-management'],
      toolPreferences: [
        { toolId: 'sop-generator', priority: 'primary' },
        { toolId: 'kpi-assistant', priority: 'primary' },
      ],
      constraints: ['Efficiency focus', 'Cost awareness', 'Team support'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['operations'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are an Operations Manager focused on efficiency and smooth business operations.',
    },
  },
  {
    name: 'Customer Support Lead',
    slug: 'customer-support-lead',
    category: 'business',
    description: 'Customer experience and support operations expert',
    config: {
      mission: 'Deliver exceptional customer support and improve customer satisfaction',
      communicationStyle: 'friendly',
      verbosityLevel: 'standard',
      decisionStyle: 'balanced',
      riskTolerance: 'low',
      outputFormat: 'text',
      expertiseTags: ['customer-service', 'communication', 'problem-solving', 'empathy', 'processes'],
      toolPreferences: [
        { toolId: 'email-drafter', priority: 'primary' },
        { toolId: 'sop-generator', priority: 'secondary' },
      ],
      constraints: ['Customer-first approach', 'Empathetic communication', 'Quick resolution'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['communication'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Customer Support Lead dedicated to exceptional customer experiences.',
    },
  },
  {
    name: 'Sales Strategist',
    slug: 'sales-strategist',
    category: 'business',
    description: 'Sales strategy and revenue optimization expert',
    config: {
      mission: 'Drive revenue growth through effective sales strategies and customer relationships',
      communicationStyle: 'professional',
      verbosityLevel: 'concise',
      decisionStyle: 'proactive',
      riskTolerance: 'medium',
      outputFormat: 'markdown',
      expertiseTags: ['sales', 'strategy', 'negotiation', 'crm', 'forecasting'],
      toolPreferences: [
        { toolId: 'forecast-summarizer', priority: 'primary' },
        { toolId: 'email-drafter', priority: 'secondary' },
      ],
      constraints: ['Revenue focus', 'Customer relationships', 'Data-driven'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['sales'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Sales Strategist focused on driving revenue and building customer relationships.',
    },
  },
  {
    name: 'Marketing Strategist',
    slug: 'marketing-strategist',
    category: 'business',
    description: 'Marketing strategy and brand management expert',
    config: {
      mission: 'Build brand awareness and drive growth through effective marketing strategies',
      communicationStyle: 'friendly',
      verbosityLevel: 'standard',
      decisionStyle: 'proactive',
      riskTolerance: 'medium',
      outputFormat: 'markdown',
      expertiseTags: ['marketing', 'branding', 'content', 'analytics', 'campaigns'],
      toolPreferences: [
        { toolId: 'email-drafter', priority: 'primary' },
        { toolId: 'csv-json-analyzer', priority: 'secondary' },
      ],
      constraints: ['Brand consistency', 'Data-driven', 'Creative approach'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['content'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Marketing Strategist building brand awareness and driving growth.',
    },
  },
  {
    name: 'Content Strategist',
    slug: 'content-strategist',
    category: 'business',
    description: 'Content creation and editorial strategy expert',
    config: {
      mission: 'Create compelling content that engages audiences and supports business goals',
      communicationStyle: 'friendly',
      verbosityLevel: 'standard',
      decisionStyle: 'balanced',
      riskTolerance: 'medium',
      outputFormat: 'markdown',
      expertiseTags: ['content', 'writing', 'seo', 'storytelling', 'editorial'],
      toolPreferences: [
        { toolId: 'email-drafter', priority: 'primary' },
      ],
      constraints: ['Brand voice', 'Audience focus', 'Quality standards'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['content'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Content Strategist creating compelling content that resonates with audiences.',
    },
  },
  {
    name: 'UX Researcher',
    slug: 'ux-researcher',
    category: 'business',
    description: 'User research and experience optimization specialist',
    config: {
      mission: 'Understand user needs and behaviors to inform product decisions',
      communicationStyle: 'professional',
      verbosityLevel: 'detailed',
      decisionStyle: 'balanced',
      riskTolerance: 'low',
      outputFormat: 'structured',
      expertiseTags: ['user-research', 'usability', 'analytics', 'interviews', 'testing'],
      toolPreferences: [
        { toolId: 'csv-json-analyzer', priority: 'primary' },
        { toolId: 'requirements-synthesizer', priority: 'secondary' },
      ],
      constraints: ['User-centered', 'Evidence-based', 'Ethical research'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['research'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a UX Researcher dedicated to understanding and advocating for users.',
    },
  },
  {
    name: 'Finance Analyst',
    slug: 'finance-analyst',
    category: 'business',
    description: 'Financial analysis and planning expert',
    config: {
      mission: 'Provide financial insights and recommendations to support business decisions',
      communicationStyle: 'formal',
      verbosityLevel: 'detailed',
      decisionStyle: 'cautious',
      riskTolerance: 'low',
      outputFormat: 'structured',
      expertiseTags: ['finance', 'analysis', 'forecasting', 'budgeting', 'reporting'],
      toolPreferences: [
        { toolId: 'csv-json-analyzer', priority: 'primary' },
        { toolId: 'forecast-summarizer', priority: 'primary' },
        { toolId: 'visualization-recommender', priority: 'secondary' },
      ],
      constraints: ['Accuracy', 'Compliance', 'Clear reporting'],
      approvalDefaults: { requireApprovalForTier: 1, autoApproveCategories: [], alwaysApproveCategories: ['financial-changes'] },
      systemPromptTemplate: 'You are a Finance Analyst providing financial insights for informed decision-making.',
    },
  },
  {
    name: 'Legal/Compliance Analyst',
    slug: 'legal-compliance-analyst',
    category: 'business',
    description: 'Legal compliance and risk management specialist',
    config: {
      mission: 'Ensure legal compliance and manage regulatory risks',
      communicationStyle: 'formal',
      verbosityLevel: 'comprehensive',
      decisionStyle: 'cautious',
      riskTolerance: 'very-low',
      outputFormat: 'structured',
      expertiseTags: ['compliance', 'legal', 'risk', 'policy', 'regulations'],
      toolPreferences: [
        { toolId: 'policy-checker', priority: 'primary' },
        { toolId: 'pii-scanner', priority: 'primary' },
      ],
      constraints: ['Legal accuracy', 'Risk aversion', 'Documentation'],
      approvalDefaults: { requireApprovalForTier: 1, autoApproveCategories: [], alwaysApproveCategories: ['legal-changes'] },
      systemPromptTemplate: 'You are a Legal/Compliance Analyst ensuring regulatory compliance and managing risks.',
    },
  },
  {
    name: 'HR/People Ops Partner',
    slug: 'hr-people-ops-partner',
    category: 'business',
    description: 'Human resources and employee experience specialist',
    config: {
      mission: 'Support employees and build a positive workplace culture',
      communicationStyle: 'friendly',
      verbosityLevel: 'standard',
      decisionStyle: 'balanced',
      riskTolerance: 'low',
      outputFormat: 'markdown',
      expertiseTags: ['hr', 'recruiting', 'culture', 'benefits', 'employee-relations'],
      toolPreferences: [
        { toolId: 'email-drafter', priority: 'primary' },
        { toolId: 'sop-generator', priority: 'secondary' },
      ],
      constraints: ['Confidentiality', 'Fairness', 'Empathy'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['hr-general'], alwaysApproveCategories: ['employee-data'] },
      systemPromptTemplate: 'You are an HR/People Ops Partner supporting employees and fostering a positive culture.',
    },
  },
  {
    name: 'Executive Chief of Staff',
    slug: 'executive-chief-of-staff',
    category: 'business',
    description: 'Executive support and strategic operations leader',
    config: {
      mission: 'Support executive decision-making and drive strategic initiatives',
      communicationStyle: 'professional',
      verbosityLevel: 'concise',
      decisionStyle: 'proactive',
      riskTolerance: 'medium',
      outputFormat: 'structured',
      expertiseTags: ['strategy', 'operations', 'communication', 'leadership', 'planning'],
      toolPreferences: [
        { toolId: 'meeting-notes-processor', priority: 'primary' },
        { toolId: 'email-drafter', priority: 'primary' },
        { toolId: 'forecast-summarizer', priority: 'secondary' },
      ],
      constraints: ['Strategic alignment', 'Confidentiality', 'Efficiency'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['planning'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are an Executive Chief of Staff supporting leadership and driving strategic initiatives.',
    },
  },
  {
    name: 'Founder/Generalist Operator',
    slug: 'founder-generalist-operator',
    category: 'business',
    description: 'Multi-disciplinary founder mindset with broad expertise',
    config: {
      mission: 'Solve problems across domains with a founder\'s resourcefulness and urgency',
      communicationStyle: 'friendly',
      verbosityLevel: 'concise',
      decisionStyle: 'aggressive',
      riskTolerance: 'high',
      outputFormat: 'hybrid',
      expertiseTags: ['startups', 'strategy', 'product', 'growth', 'fundraising', 'operations'],
      toolPreferences: [
        { toolId: 'prd-generator', priority: 'secondary' },
        { toolId: 'email-drafter', priority: 'secondary' },
        { toolId: 'code-generator', priority: 'secondary' },
      ],
      constraints: ['Speed over perfection', 'Resource efficiency', 'Customer focus'],
      approvalDefaults: { requireApprovalForTier: 3, autoApproveCategories: ['all'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Founder/Generalist Operator with a bias for action and broad problem-solving skills.',
    },
  },
];

const specialistPersonas = [
  {
    name: 'Incident Commander',
    slug: 'incident-commander',
    category: 'specialist',
    description: 'Emergency response and incident management leader',
    config: {
      mission: 'Coordinate incident response and minimize impact during emergencies',
      communicationStyle: 'professional',
      verbosityLevel: 'concise',
      decisionStyle: 'aggressive',
      riskTolerance: 'high',
      outputFormat: 'structured',
      expertiseTags: ['incident-response', 'communication', 'coordination', 'triage', 'post-mortem'],
      toolPreferences: [
        { toolId: 'log-analyzer', priority: 'primary' },
        { toolId: 'notification-dispatcher', priority: 'primary' },
      ],
      constraints: ['Speed is critical', 'Clear communication', 'Documentation'],
      approvalDefaults: { requireApprovalForTier: 3, autoApproveCategories: ['incident'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are an Incident Commander leading emergency response with calm and decisive action.',
    },
  },
  {
    name: 'Debug Specialist',
    slug: 'debug-specialist',
    category: 'specialist',
    description: 'Expert in troubleshooting and root cause analysis',
    config: {
      mission: 'Identify and resolve complex technical issues efficiently',
      communicationStyle: 'technical',
      verbosityLevel: 'detailed',
      decisionStyle: 'cautious',
      riskTolerance: 'low',
      outputFormat: 'structured',
      expertiseTags: ['debugging', 'root-cause-analysis', 'logging', 'profiling', 'troubleshooting'],
      toolPreferences: [
        { toolId: 'log-analyzer', priority: 'primary' },
        { toolId: 'performance-profiler', priority: 'primary' },
      ],
      constraints: ['Systematic approach', 'Evidence-based', 'Document findings'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['analysis'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Debug Specialist with expertise in systematic troubleshooting and root cause analysis.',
    },
  },
  {
    name: 'Documentation Specialist',
    slug: 'documentation-specialist',
    category: 'specialist',
    description: 'Technical writing and documentation expert',
    config: {
      mission: 'Create clear, comprehensive, and maintainable documentation',
      communicationStyle: 'professional',
      verbosityLevel: 'comprehensive',
      decisionStyle: 'balanced',
      riskTolerance: 'low',
      outputFormat: 'markdown',
      expertiseTags: ['documentation', 'technical-writing', 'tutorials', 'api-docs', 'knowledge-base'],
      toolPreferences: [
        { toolId: 'sop-generator', priority: 'primary' },
      ],
      constraints: ['Clarity', 'Accuracy', 'Maintainability'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['documentation'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Documentation Specialist creating clear and comprehensive documentation.',
    },
  },
  {
    name: 'Training/Enablement Coach',
    slug: 'training-enablement-coach',
    category: 'specialist',
    description: 'Learning and development specialist',
    config: {
      mission: 'Enable team growth through effective training and knowledge sharing',
      communicationStyle: 'educational',
      verbosityLevel: 'detailed',
      decisionStyle: 'balanced',
      riskTolerance: 'low',
      outputFormat: 'markdown',
      expertiseTags: ['training', 'education', 'onboarding', 'mentoring', 'workshops'],
      toolPreferences: [
        { toolId: 'sop-generator', priority: 'primary' },
      ],
      constraints: ['Learner-focused', 'Practical examples', 'Assessment'],
      approvalDefaults: { requireApprovalForTier: 2, autoApproveCategories: ['training'], alwaysApproveCategories: [] },
      systemPromptTemplate: 'You are a Training/Enablement Coach helping teams grow and succeed.',
    },
  },
  {
    name: 'Procurement Analyst',
    slug: 'procurement-analyst',
    category: 'specialist',
    description: 'Vendor management and procurement specialist',
    config: {
      mission: 'Optimize vendor relationships and procurement processes',
      communicationStyle: 'professional',
      verbosityLevel: 'standard',
      decisionStyle: 'cautious',
      riskTolerance: 'low',
      outputFormat: 'structured',
      expertiseTags: ['procurement', 'vendor-management', 'contracts', 'negotiation', 'cost-analysis'],
      toolPreferences: [
        { toolId: 'csv-json-analyzer', priority: 'primary' },
        { toolId: 'email-drafter', priority: 'secondary' },
      ],
      constraints: ['Cost efficiency', 'Risk assessment', 'Compliance'],
      approvalDefaults: { requireApprovalForTier: 1, autoApproveCategories: [], alwaysApproveCategories: ['procurement'] },
      systemPromptTemplate: 'You are a Procurement Analyst optimizing vendor relationships and procurement efficiency.',
    },
  },
  {
    name: 'Risk Officer',
    slug: 'risk-officer',
    category: 'specialist',
    description: 'Enterprise risk management specialist',
    config: {
      mission: 'Identify, assess, and mitigate organizational risks',
      communicationStyle: 'formal',
      verbosityLevel: 'comprehensive',
      decisionStyle: 'cautious',
      riskTolerance: 'very-low',
      outputFormat: 'structured',
      expertiseTags: ['risk-management', 'compliance', 'audit', 'controls', 'governance'],
      toolPreferences: [
        { toolId: 'policy-checker', priority: 'primary' },
        { toolId: 'security-checklist', priority: 'primary' },
        { toolId: 'audit-package-generator', priority: 'secondary' },
      ],
      constraints: ['Risk awareness', 'Compliance focus', 'Documentation'],
      approvalDefaults: { requireApprovalForTier: 1, autoApproveCategories: [], alwaysApproveCategories: ['risk-changes'] },
      systemPromptTemplate: 'You are a Risk Officer dedicated to identifying and mitigating organizational risks.',
    },
  },
];

// ============================================
// TOOLS DATA
// ============================================

const tools = [
  // Engineering Tools
  {
    name: 'Code Generator',
    slug: 'code-generator',
    description: 'Generate code snippets, functions, and boilerplate based on specifications',
    category: 'engineering',
    domain: 'generation',
    riskLevel: 'low',
    requiredTier: 1,
    timeout: 60000,
    inputSchema: { type: 'object', properties: { language: { type: 'string' }, specification: { type: 'string' }, context: { type: 'string' } }, required: ['language', 'specification'] },
    outputSchema: { type: 'object', properties: { code: { type: 'string' }, explanation: { type: 'string' } } },
  },
  {
    name: 'Refactor Assistant',
    slug: 'refactor-assistant',
    description: 'Suggest and apply code refactoring improvements',
    category: 'engineering',
    domain: 'code',
    riskLevel: 'medium',
    requiredTier: 2,
    timeout: 45000,
    inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' }, goals: { type: 'array' } }, required: ['code', 'language'] },
    outputSchema: { type: 'object', properties: { refactoredCode: { type: 'string' }, changes: { type: 'array' }, explanation: { type: 'string' } } },
  },
  {
    name: 'Test Generator',
    slug: 'test-generator',
    description: 'Generate unit tests, integration tests, and test fixtures',
    category: 'engineering',
    domain: 'generation',
    riskLevel: 'low',
    requiredTier: 1,
    timeout: 45000,
    inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' }, framework: { type: 'string' } }, required: ['code', 'language'] },
    outputSchema: { type: 'object', properties: { tests: { type: 'string' }, coverage: { type: 'object' } } },
  },
  {
    name: 'API Contract Validator',
    slug: 'api-contract-validator',
    description: 'Validate API contracts, schemas, and documentation',
    category: 'engineering',
    domain: 'validation',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { contract: { type: 'string' }, format: { type: 'string' } }, required: ['contract'] },
    outputSchema: { type: 'object', properties: { valid: { type: 'boolean' }, errors: { type: 'array' }, suggestions: { type: 'array' } } },
  },
  {
    name: 'Dependency Scanner',
    slug: 'dependency-scanner',
    description: 'Scan dependencies for vulnerabilities and outdated packages',
    category: 'engineering',
    domain: 'validation',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 60000,
    inputSchema: { type: 'object', properties: { manifest: { type: 'string' }, type: { type: 'string' } }, required: ['manifest'] },
    outputSchema: { type: 'object', properties: { vulnerabilities: { type: 'array' }, outdated: { type: 'array' }, recommendations: { type: 'array' } } },
  },
  {
    name: 'Performance Profiler',
    slug: 'performance-profiler',
    description: 'Analyze code performance and suggest optimizations',
    category: 'engineering',
    domain: 'analysis',
    riskLevel: 'low',
    requiredTier: 1,
    timeout: 90000,
    inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' }, metrics: { type: 'array' } }, required: ['code'] },
    outputSchema: { type: 'object', properties: { profile: { type: 'object' }, bottlenecks: { type: 'array' }, recommendations: { type: 'array' } } },
  },
  {
    name: 'Log Analyzer',
    slug: 'log-analyzer',
    description: 'Analyze logs to identify errors, patterns, and anomalies',
    category: 'engineering',
    domain: 'analysis',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 60000,
    inputSchema: { type: 'object', properties: { logs: { type: 'string' }, format: { type: 'string' }, query: { type: 'string' } }, required: ['logs'] },
    outputSchema: { type: 'object', properties: { summary: { type: 'object' }, errors: { type: 'array' }, patterns: { type: 'array' } } },
  },
  {
    name: 'Git Helper',
    slug: 'git-helper',
    description: 'Safe Git operations: status, diff, log, blame (read-only)',
    category: 'engineering',
    domain: 'code',
    riskLevel: 'low',
    requiredTier: 1,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { operation: { type: 'string' }, path: { type: 'string' }, options: { type: 'object' } }, required: ['operation'] },
    outputSchema: { type: 'object', properties: { output: { type: 'string' }, formatted: { type: 'object' } } },
  },
  // Business Tools
  {
    name: 'Requirements Synthesizer',
    slug: 'requirements-synthesizer',
    description: 'Extract and organize requirements from various sources',
    category: 'business',
    domain: 'analysis',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 45000,
    inputSchema: { type: 'object', properties: { sources: { type: 'array' }, context: { type: 'string' } }, required: ['sources'] },
    outputSchema: { type: 'object', properties: { requirements: { type: 'array' }, userStories: { type: 'array' }, acceptance: { type: 'array' } } },
  },
  {
    name: 'PRD Generator',
    slug: 'prd-generator',
    description: 'Generate product requirement documents from specifications',
    category: 'business',
    domain: 'generation',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 60000,
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, requirements: { type: 'array' } }, required: ['title', 'description'] },
    outputSchema: { type: 'object', properties: { prd: { type: 'string' }, sections: { type: 'object' } } },
  },
  {
    name: 'Roadmap Planner',
    slug: 'roadmap-planner',
    description: 'Plan and visualize product roadmaps',
    category: 'business',
    domain: 'generation',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 45000,
    inputSchema: { type: 'object', properties: { goals: { type: 'array' }, timeline: { type: 'string' }, resources: { type: 'object' } }, required: ['goals'] },
    outputSchema: { type: 'object', properties: { roadmap: { type: 'object' }, milestones: { type: 'array' }, dependencies: { type: 'array' } } },
  },
  {
    name: 'KPI Assistant',
    slug: 'kpi-assistant',
    description: 'Track, analyze, and visualize key performance indicators',
    category: 'business',
    domain: 'analysis',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { metrics: { type: 'array' }, period: { type: 'string' }, targets: { type: 'object' } }, required: ['metrics'] },
    outputSchema: { type: 'object', properties: { dashboard: { type: 'object' }, insights: { type: 'array' }, recommendations: { type: 'array' } } },
  },
  {
    name: 'Meeting Notes Processor',
    slug: 'meeting-notes-processor',
    description: 'Convert meeting notes to action items and summaries',
    category: 'business',
    domain: 'analysis',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { notes: { type: 'string' }, participants: { type: 'array' } }, required: ['notes'] },
    outputSchema: { type: 'object', properties: { summary: { type: 'string' }, actionItems: { type: 'array' }, decisions: { type: 'array' } } },
  },
  {
    name: 'SOP Generator',
    slug: 'sop-generator',
    description: 'Generate standard operating procedures from descriptions',
    category: 'business',
    domain: 'generation',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 45000,
    inputSchema: { type: 'object', properties: { process: { type: 'string' }, context: { type: 'string' }, format: { type: 'string' } }, required: ['process'] },
    outputSchema: { type: 'object', properties: { sop: { type: 'string' }, steps: { type: 'array' }, checklist: { type: 'array' } } },
  },
  {
    name: 'Email Drafter',
    slug: 'email-drafter',
    description: 'Draft professional emails and communications',
    category: 'business',
    domain: 'generation',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { purpose: { type: 'string' }, recipient: { type: 'string' }, context: { type: 'string' }, tone: { type: 'string' } }, required: ['purpose'] },
    outputSchema: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' }, alternatives: { type: 'array' } } },
  },
  {
    name: 'Forecast Summarizer',
    slug: 'forecast-summarizer',
    description: 'Summarize and analyze forecasts and projections',
    category: 'business',
    domain: 'analysis',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 45000,
    inputSchema: { type: 'object', properties: { data: { type: 'object' }, period: { type: 'string' }, metrics: { type: 'array' } }, required: ['data'] },
    outputSchema: { type: 'object', properties: { summary: { type: 'string' }, trends: { type: 'array' }, risks: { type: 'array' } } },
  },
  // Data Tools
  {
    name: 'CSV/JSON Analyzer',
    slug: 'csv-json-analyzer',
    description: 'Analyze structured data files and extract insights',
    category: 'data',
    domain: 'analysis',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 60000,
    inputSchema: { type: 'object', properties: { data: { type: 'string' }, format: { type: 'string' }, query: { type: 'string' } }, required: ['data'] },
    outputSchema: { type: 'object', properties: { schema: { type: 'object' }, stats: { type: 'object' }, insights: { type: 'array' } } },
  },
  {
    name: 'SQL Assistant',
    slug: 'sql-assistant',
    description: 'Generate and optimize SQL queries (safe query mode)',
    category: 'data',
    domain: 'database',
    riskLevel: 'low',
    requiredTier: 1,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { description: { type: 'string' }, schema: { type: 'object' }, dialect: { type: 'string' } }, required: ['description'] },
    outputSchema: { type: 'object', properties: { query: { type: 'string' }, explanation: { type: 'string' }, optimizations: { type: 'array' } } },
  },
  {
    name: 'Data Quality Checker',
    slug: 'data-quality-checker',
    description: 'Check data quality, completeness, and consistency',
    category: 'data',
    domain: 'validation',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 60000,
    inputSchema: { type: 'object', properties: { data: { type: 'string' }, rules: { type: 'array' } }, required: ['data'] },
    outputSchema: { type: 'object', properties: { score: { type: 'number' }, issues: { type: 'array' }, recommendations: { type: 'array' } } },
  },
  {
    name: 'Visualization Recommender',
    slug: 'visualization-recommender',
    description: 'Recommend optimal visualizations for data',
    category: 'data',
    domain: 'analysis',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { data: { type: 'object' }, goal: { type: 'string' } }, required: ['data'] },
    outputSchema: { type: 'object', properties: { recommendations: { type: 'array' }, chartConfig: { type: 'object' } } },
  },
  {
    name: 'Anomaly Explainer',
    slug: 'anomaly-explainer',
    description: 'Detect and explain anomalies in metrics data',
    category: 'data',
    domain: 'analysis',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 45000,
    inputSchema: { type: 'object', properties: { data: { type: 'array' }, metric: { type: 'string' }, threshold: { type: 'number' } }, required: ['data', 'metric'] },
    outputSchema: { type: 'object', properties: { anomalies: { type: 'array' }, explanations: { type: 'array' }, recommendations: { type: 'array' } } },
  },
  // Security Tools
  {
    name: 'Policy Checker',
    slug: 'policy-checker',
    description: 'Check compliance with security and governance policies',
    category: 'security',
    domain: 'validation',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { content: { type: 'string' }, policies: { type: 'array' } }, required: ['content'] },
    outputSchema: { type: 'object', properties: { compliant: { type: 'boolean' }, violations: { type: 'array' }, recommendations: { type: 'array' } } },
  },
  {
    name: 'PII Scanner',
    slug: 'pii-scanner',
    description: 'Scan content for personally identifiable information',
    category: 'security',
    domain: 'validation',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { content: { type: 'string' }, types: { type: 'array' } }, required: ['content'] },
    outputSchema: { type: 'object', properties: { found: { type: 'array' }, redacted: { type: 'string' }, report: { type: 'object' } } },
  },
  {
    name: 'Security Checklist',
    slug: 'security-checklist',
    description: 'Run security checklists and assessments',
    category: 'security',
    domain: 'validation',
    riskLevel: 'none',
    requiredTier: 0,
    timeout: 45000,
    inputSchema: { type: 'object', properties: { type: { type: 'string' }, context: { type: 'object' } }, required: ['type'] },
    outputSchema: { type: 'object', properties: { checklist: { type: 'array' }, score: { type: 'number' }, recommendations: { type: 'array' } } },
  },
  {
    name: 'Audit Package Generator',
    slug: 'audit-package-generator',
    description: 'Generate compliance audit packages and reports',
    category: 'security',
    domain: 'generation',
    riskLevel: 'low',
    requiredTier: 1,
    timeout: 60000,
    inputSchema: { type: 'object', properties: { framework: { type: 'string' }, scope: { type: 'object' }, period: { type: 'string' } }, required: ['framework'] },
    outputSchema: { type: 'object', properties: { package: { type: 'object' }, evidence: { type: 'array' }, gaps: { type: 'array' } } },
  },
  // Automation Tools
  {
    name: 'Scheduler',
    slug: 'scheduler',
    description: 'Schedule and manage recurring tasks',
    category: 'automation',
    domain: 'monitoring',
    riskLevel: 'low',
    requiredTier: 1,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { task: { type: 'object' }, schedule: { type: 'string' }, options: { type: 'object' } }, required: ['task', 'schedule'] },
    outputSchema: { type: 'object', properties: { jobId: { type: 'string' }, nextRun: { type: 'string' }, status: { type: 'string' } } },
  },
  {
    name: 'Webhook Trigger',
    slug: 'webhook-trigger',
    description: 'Trigger webhooks and external integrations',
    category: 'automation',
    domain: 'communication',
    riskLevel: 'medium',
    requiredTier: 2,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { url: { type: 'string' }, method: { type: 'string' }, payload: { type: 'object' } }, required: ['url'] },
    outputSchema: { type: 'object', properties: { status: { type: 'number' }, response: { type: 'object' }, duration: { type: 'number' } } },
  },
  {
    name: 'Notification Dispatcher',
    slug: 'notification-dispatcher',
    description: 'Send notifications via email, Slack, or other channels',
    category: 'automation',
    domain: 'communication',
    riskLevel: 'low',
    requiredTier: 1,
    timeout: 30000,
    inputSchema: { type: 'object', properties: { channel: { type: 'string' }, recipients: { type: 'array' }, message: { type: 'object' } }, required: ['channel', 'recipients', 'message'] },
    outputSchema: { type: 'object', properties: { sent: { type: 'number' }, failed: { type: 'number' }, details: { type: 'array' } } },
  },
  {
    name: 'Report Exporter',
    slug: 'report-exporter',
    description: 'Export reports in various formats (PDF, Markdown, JSON)',
    category: 'automation',
    domain: 'generation',
    riskLevel: 'low',
    requiredTier: 1,
    timeout: 60000,
    inputSchema: { type: 'object', properties: { data: { type: 'object' }, format: { type: 'string' }, template: { type: 'string' } }, required: ['data', 'format'] },
    outputSchema: { type: 'object', properties: { url: { type: 'string' }, filename: { type: 'string' }, size: { type: 'number' } } },
  },
];

// ============================================
// WORKFLOW TEMPLATES
// ============================================

const workflowTemplates = [
  {
    name: 'Bug Triage',
    slug: 'bug-triage',
    description: 'Automatically triage and assign incoming bug reports',
    templateCategory: 'engineering',
    trigger: { type: 'webhook', config: { webhookPath: '/webhooks/bug-triage', allowedMethods: ['POST'] } },
    steps: [
      { id: 'classify', name: 'Classify Bug', type: 'ai', config: { prompt: 'Classify the severity and type of this bug report' }, inputs: [], outputs: [{ name: 'severity', type: 'string' }, { name: 'type', type: 'string' }], dependsOn: [], timeout: 30000, position: { x: 100, y: 100 } },
      { id: 'assign', name: 'Assign Team', type: 'tool', toolId: 'notification-dispatcher', config: {}, inputs: [{ name: 'severity', type: 'string', source: { type: 'step_output', stepId: 'classify', outputName: 'severity' }, required: true }], outputs: [], dependsOn: ['classify'], timeout: 10000, position: { x: 300, y: 100 } },
      { id: 'notify', name: 'Send Notification', type: 'notification', config: { notificationConfig: { channel: 'slack', template: 'New bug assigned: {{title}}', recipients: ['#engineering'] } }, inputs: [], outputs: [], dependsOn: ['assign'], timeout: 10000, position: { x: 500, y: 100 } },
    ],
    variables: [{ name: 'title', type: 'string', description: 'Bug title', isSecret: false }],
    errorHandling: { defaultRetries: 2, onErrorAction: 'continue', notifyOnError: true },
  },
  {
    name: 'Incident Summary',
    slug: 'incident-summary',
    description: 'Generate incident summary reports after resolution',
    templateCategory: 'operations',
    trigger: { type: 'manual', config: { allowedRoles: ['admin', 'operator'] } },
    steps: [
      { id: 'gather', name: 'Gather Logs', type: 'tool', toolId: 'log-analyzer', config: {}, inputs: [{ name: 'timeRange', type: 'string', source: { type: 'variable', name: 'timeRange' }, required: true }], outputs: [{ name: 'analysis', type: 'object' }], dependsOn: [], timeout: 60000, position: { x: 100, y: 100 } },
      { id: 'summarize', name: 'Generate Summary', type: 'ai', config: { prompt: 'Generate an incident summary from these logs' }, inputs: [{ name: 'logs', type: 'object', source: { type: 'step_output', stepId: 'gather', outputName: 'analysis' }, required: true }], outputs: [{ name: 'summary', type: 'string' }], dependsOn: ['gather'], timeout: 45000, position: { x: 300, y: 100 } },
      { id: 'export', name: 'Export Report', type: 'tool', toolId: 'report-exporter', config: {}, inputs: [{ name: 'content', type: 'string', source: { type: 'step_output', stepId: 'summarize', outputName: 'summary' }, required: true }], outputs: [{ name: 'url', type: 'string' }], dependsOn: ['summarize'], timeout: 30000, position: { x: 500, y: 100 } },
    ],
    variables: [{ name: 'timeRange', type: 'string', description: 'Time range for log analysis', isSecret: false }],
    errorHandling: { defaultRetries: 1, onErrorAction: 'stop', notifyOnError: true },
  },
  {
    name: 'Release Checklist',
    slug: 'release-checklist',
    description: 'Automated release checklist verification',
    templateCategory: 'engineering',
    trigger: { type: 'manual', config: { allowedRoles: ['admin', 'editor'] } },
    steps: [
      { id: 'scan', name: 'Scan Dependencies', type: 'tool', toolId: 'dependency-scanner', config: {}, inputs: [], outputs: [{ name: 'vulnerabilities', type: 'array' }], dependsOn: [], timeout: 60000, position: { x: 100, y: 100 } },
      { id: 'security', name: 'Security Checklist', type: 'tool', toolId: 'security-checklist', config: {}, inputs: [], outputs: [{ name: 'score', type: 'number' }], dependsOn: [], timeout: 45000, position: { x: 100, y: 200 } },
      { id: 'approval', name: 'Release Approval', type: 'approval', config: { approvalConfig: { approvers: ['release-manager'], timeout: 3600000, message: 'Approve release?' } }, inputs: [], outputs: [], dependsOn: ['scan', 'security'], timeout: 3600000, position: { x: 300, y: 150 } },
      { id: 'notify', name: 'Notify Team', type: 'notification', config: { notificationConfig: { channel: 'slack', template: 'Release approved and ready', recipients: ['#releases'] } }, inputs: [], outputs: [], dependsOn: ['approval'], timeout: 10000, position: { x: 500, y: 150 } },
    ],
    variables: [],
    errorHandling: { defaultRetries: 0, onErrorAction: 'stop', notifyOnError: true },
  },
  {
    name: 'Data Report',
    slug: 'data-report',
    description: 'Generate scheduled data reports',
    templateCategory: 'analytics',
    trigger: { type: 'scheduled', config: { cronExpression: '0 9 * * 1', timezone: 'UTC' } },
    steps: [
      { id: 'fetch', name: 'Fetch Data', type: 'tool', toolId: 'csv-json-analyzer', config: {}, inputs: [], outputs: [{ name: 'data', type: 'object' }], dependsOn: [], timeout: 60000, position: { x: 100, y: 100 } },
      { id: 'analyze', name: 'Analyze Metrics', type: 'tool', toolId: 'kpi-assistant', config: {}, inputs: [{ name: 'metrics', type: 'object', source: { type: 'step_output', stepId: 'fetch', outputName: 'data' }, required: true }], outputs: [{ name: 'insights', type: 'array' }], dependsOn: ['fetch'], timeout: 45000, position: { x: 300, y: 100 } },
      { id: 'report', name: 'Generate Report', type: 'tool', toolId: 'report-exporter', config: {}, inputs: [], outputs: [{ name: 'url', type: 'string' }], dependsOn: ['analyze'], timeout: 60000, position: { x: 500, y: 100 } },
      { id: 'send', name: 'Send Report', type: 'notification', config: { notificationConfig: { channel: 'email', template: 'Weekly data report', recipients: ['{{stakeholders}}'] } }, inputs: [], outputs: [], dependsOn: ['report'], timeout: 10000, position: { x: 700, y: 100 } },
    ],
    variables: [{ name: 'stakeholders', type: 'array', description: 'Report recipients', isSecret: false }],
    errorHandling: { defaultRetries: 2, onErrorAction: 'continue', notifyOnError: true },
  },
  {
    name: 'Content Review',
    slug: 'content-review',
    description: 'Content review and approval workflow',
    templateCategory: 'content',
    trigger: { type: 'manual', config: { allowedRoles: ['editor', 'admin'] } },
    steps: [
      { id: 'check', name: 'Policy Check', type: 'tool', toolId: 'policy-checker', config: {}, inputs: [{ name: 'content', type: 'string', source: { type: 'variable', name: 'content' }, required: true }], outputs: [{ name: 'compliant', type: 'boolean' }], dependsOn: [], timeout: 30000, position: { x: 100, y: 100 } },
      { id: 'pii', name: 'PII Scan', type: 'tool', toolId: 'pii-scanner', config: {}, inputs: [{ name: 'content', type: 'string', source: { type: 'variable', name: 'content' }, required: true }], outputs: [{ name: 'found', type: 'array' }], dependsOn: [], timeout: 30000, position: { x: 100, y: 200 } },
      { id: 'review', name: 'Editorial Review', type: 'approval', config: { approvalConfig: { approvers: ['content-team'], timeout: 86400000, message: 'Review content' } }, inputs: [], outputs: [], dependsOn: ['check', 'pii'], timeout: 86400000, position: { x: 300, y: 150 } },
      { id: 'publish', name: 'Ready to Publish', type: 'notification', config: { notificationConfig: { channel: 'in-app', template: 'Content approved', recipients: ['{{author}}'] } }, inputs: [], outputs: [], dependsOn: ['review'], timeout: 10000, position: { x: 500, y: 150 } },
    ],
    variables: [{ name: 'content', type: 'string', description: 'Content to review', isSecret: false }, { name: 'author', type: 'string', description: 'Content author', isSecret: false }],
    errorHandling: { defaultRetries: 0, onErrorAction: 'stop', notifyOnError: true },
  },
];

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Create admin user
  console.log('Creating admin user...');
  const passwordHash = await hashPassword('password123');
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@soothsayer.local' },
    update: {},
    create: {
      email: 'admin@soothsayer.local',
      passwordHash,
      name: 'Admin User',
      emailVerified: true,
      isActive: true,
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: { email: true, inApp: true, approvalRequests: true, workflowCompletions: true, mentions: true },
      },
    },
  });
  console.log(`  ✓ Created admin user: ${adminUser.email}`);

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@soothsayer.local' },
    update: {},
    create: {
      email: 'demo@soothsayer.local',
      passwordHash,
      name: 'Demo User',
      emailVerified: true,
      isActive: true,
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: { email: false, inApp: true, approvalRequests: true, workflowCompletions: false, mentions: true },
      },
    },
  });
  console.log(`  ✓ Created demo user: ${demoUser.email}`);

  // Create organization
  console.log('\nCreating organization...');
  const organization = await prisma.organization.upsert({
    where: { slug: 'soothsayer-demo' },
    update: {},
    create: {
      name: 'Soothsayer Demo',
      slug: 'soothsayer-demo',
      settings: {
        allowSignup: true,
        defaultWorkspaceRole: 'editor',
        maxWorkspaces: 10,
        enableAuditLogs: true,
        dataRetentionDays: 365,
      },
    },
  });
  console.log(`  ✓ Created organization: ${organization.name}`);

  // Add users to organization
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: adminUser.id } },
    update: {},
    create: { organizationId: organization.id, userId: adminUser.id, role: 'owner' },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: demoUser.id } },
    update: {},
    create: { organizationId: organization.id, userId: demoUser.id, role: 'member' },
  });
  console.log('  ✓ Added users to organization');

  // Create workspace
  console.log('\nCreating workspace...');
  const workspace = await prisma.workspace.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: 'main' } },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Main Workspace',
      slug: 'main',
      description: 'Primary workspace for the team',
      isDefault: true,
      settings: {
        maxConcurrentJobs: 5,
        retentionDays: 90,
      },
    },
  });
  console.log(`  ✓ Created workspace: ${workspace.name}`);

  // Add users to workspace
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: adminUser.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: adminUser.id, role: 'admin' },
  });
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: demoUser.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: demoUser.id, role: 'editor' },
  });
  console.log('  ✓ Added users to workspace');

  // Create project
  console.log('\nCreating sample project...');
  const project = await prisma.project.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: 'sample-project' } },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Sample Project',
      slug: 'sample-project',
      description: 'A sample project for demonstration',
      settings: {
        language: 'typescript',
        framework: 'react',
        allowedPaths: ['/src', '/tests'],
        blockedPaths: ['/node_modules', '/.git'],
      },
    },
  });
  console.log(`  ✓ Created project: ${project.name}`);

  // Create personas
  console.log('\nCreating personas...');
  const allPersonas = [...developerPersonas, ...businessPersonas, ...specialistPersonas];
  
  for (const personaData of allPersonas) {
    await prisma.persona.upsert({
      where: { workspaceId_slug: { workspaceId: null, slug: personaData.slug } },
      update: { config: personaData.config },
      create: {
        name: personaData.name,
        slug: personaData.slug,
        category: personaData.category,
        description: personaData.description,
        isBuiltIn: true,
        isActive: true,
        config: personaData.config,
      },
    });
  }
  console.log(`  ✓ Created ${allPersonas.length} personas`);

  // Create tools
  console.log('\nCreating tools...');
  for (const toolData of tools) {
    await prisma.tool.upsert({
      where: { slug: toolData.slug },
      update: {},
      create: {
        name: toolData.name,
        slug: toolData.slug,
        description: toolData.description,
        category: toolData.category,
        domain: toolData.domain,
        riskLevel: toolData.riskLevel,
        requiredTier: toolData.requiredTier,
        timeout: toolData.timeout,
        inputSchema: toolData.inputSchema,
        outputSchema: toolData.outputSchema,
        config: {
          isBuiltIn: true,
          requiresAuth: false,
          rateLimits: { maxRequestsPerMinute: 60, maxRequestsPerHour: 500, maxConcurrent: 5 },
          retryConfig: { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 },
          sandboxed: true,
        },
        isBuiltIn: true,
      },
    });
  }
  console.log(`  ✓ Created ${tools.length} tools`);

  // Create workflow templates
  console.log('\nCreating workflow templates...');
  for (const templateData of workflowTemplates) {
    await prisma.workflow.upsert({
      where: { workspaceId_slug: { workspaceId: workspace.id, slug: templateData.slug } },
      update: {},
      create: {
        workspaceId: workspace.id,
        createdById: adminUser.id,
        name: templateData.name,
        slug: templateData.slug,
        description: templateData.description,
        status: 'active',
        trigger: templateData.trigger,
        steps: templateData.steps,
        variables: templateData.variables,
        errorHandling: templateData.errorHandling,
        isTemplate: true,
        templateCategory: templateData.templateCategory,
        metadata: { tags: [templateData.templateCategory] },
      },
    });
  }
  console.log(`  ✓ Created ${workflowTemplates.length} workflow templates`);

  // Create default policy
  console.log('\nCreating default policy...');
  await prisma.policy.upsert({
    where: { id: 'default-policy' },
    update: {},
    create: {
      id: 'default-policy',
      createdById: adminUser.id,
      name: 'Default Security Policy',
      description: 'Default security policy for all workspaces',
      isActive: true,
      priority: 100,
      rules: [
        {
          id: 'require-approval-tier-3',
          name: 'Require Approval for Advanced Operations',
          description: 'Require approval for tier 3 operations',
          condition: { type: 'tier', config: { tiers: [3] } },
          action: { type: 'require_approval', config: { approvers: ['admin'], approvalTimeout: 3600000 } },
          isActive: true,
          order: 1,
        },
        {
          id: 'audit-all-executions',
          name: 'Audit All Executions',
          description: 'Log all command and tool executions',
          condition: { type: 'tier', config: { tiers: [1, 2, 3] } },
          action: { type: 'audit', config: { auditLevel: 'detailed' } },
          isActive: true,
          order: 2,
        },
      ],
    },
  });
  console.log('  ✓ Created default policy');

  console.log('\n✅ Seed completed successfully!\n');
  console.log('You can log in with:');
  console.log('  Email: admin@soothsayer.local');
  console.log('  Password: password123');
  console.log('\nOr:');
  console.log('  Email: demo@soothsayer.local');
  console.log('  Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
