import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `org-${randomUUID().slice(0, 8)}`;
}

async function main() {
  const email = (process.env.ADMIN_SEED_EMAIL || 'admin@soothsayer.local').toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD || 'password123';
  const name = process.env.ADMIN_SEED_NAME || 'Admin User';
  const organizationName = process.env.ADMIN_SEED_ORGANIZATION || 'Soothsayer Admin Org';

  if (password.length < 8) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      name,
      passwordHash,
      isActive: true,
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: {
          email: true,
          inApp: true,
          approvalRequests: true,
          workflowCompletions: true,
          mentions: true,
        },
      },
    },
  });

  const existingOrgMember = await prisma.organizationMember.findFirst({
    where: { userId: user.id, role: { in: ['owner', 'admin'] } },
    include: { organization: true },
  });

  let organizationId = existingOrgMember?.organizationId;
  if (!organizationId) {
    const org = await prisma.organization.create({
      data: {
        name: organizationName,
        slug: `${slugify(organizationName)}-${randomUUID().slice(0, 6)}`,
        settings: {
          allowSignup: true,
          defaultWorkspaceRole: 'editor',
          maxWorkspaces: 5,
          enableAuditLogs: true,
          dataRetentionDays: 90,
        },
      },
    });
    organizationId = org.id;

    await prisma.organizationMember.create({
      data: {
        organizationId,
        userId: user.id,
        role: 'owner',
      },
    });
  }

  let workspace = await prisma.workspace.findFirst({
    where: { organizationId, isDefault: true },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        organizationId,
        name: 'Main Workspace',
        slug: 'main',
        isDefault: true,
        settings: {
          maxConcurrentJobs: 5,
          retentionDays: 90,
        },
      },
    });
  }

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: { role: 'admin' },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'admin',
    },
  });

  await prisma.command.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: 'Preflight Health Check',
      },
    },
    update: {
      description: 'Allowlisted command used by release preflight terminal check',
      template: 'echo PRECHECK_OK',
      category: 'system',
      domain: 'release',
      riskLevel: 'low',
      requiredTier: 0,
      timeout: 10000,
      requiresApproval: false,
      isBuiltIn: true,
      createdById: user.id,
    },
    create: {
      workspaceId: workspace.id,
      name: 'Preflight Health Check',
      description: 'Allowlisted command used by release preflight terminal check',
      template: 'echo PRECHECK_OK',
      category: 'system',
      domain: 'release',
      riskLevel: 'low',
      requiredTier: 0,
      timeout: 10000,
      requiresApproval: false,
      isBuiltIn: true,
      createdById: user.id,
    },
  });

  // Ensure at least one active persona exists so chat can start on fresh admin-only setups.
  let fallbackPersona = await prisma.persona.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [{ workspaceId: workspace.id }, { isBuiltIn: true }],
    },
    orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }],
  });

  if (!fallbackPersona) {
    fallbackPersona = await prisma.persona.create({
      data: {
        workspaceId: workspace.id,
        createdById: user.id,
        name: 'DAX Assistant',
        slug: 'dax-assistant',
        category: 'developer',
        description: 'Default governed assistant persona for workspace chat.',
        isBuiltIn: false,
        isActive: true,
        config: {
          mission: 'Provide practical, governed engineering assistance through DAX.',
          communicationStyle: 'professional',
          verbosityLevel: 'standard',
          decisionStyle: 'balanced',
          riskTolerance: 'medium',
          outputFormat: 'hybrid',
          systemPromptTemplate:
            'You are DAX Assistant. Be practical, concise, and evidence-oriented.',
        },
      },
    });
  }

  await prisma.personaPreference.upsert({
    where: {
      userId_personaId_workspaceId: {
        userId: user.id,
        personaId: fallbackPersona.id,
        workspaceId: workspace.id,
      },
    },
    update: {
      isDefault: true,
    },
    create: {
      userId: user.id,
      personaId: fallbackPersona.id,
      workspaceId: workspace.id,
      isDefault: true,
    },
  });

  console.log('Admin seed complete');
  console.log(`EMAIL=${email}`);
  console.log(`PASSWORD=${password}`);
  console.log(`WORKSPACE_ID=${workspace.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
