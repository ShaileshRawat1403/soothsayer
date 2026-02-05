import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                members: true,
                projects: true,
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      workspace: m.workspace,
      memberCount: m.workspace._count.members,
      projectCount: m.workspace._count.projects,
      currentUserRole: m.role,
    }));
  }

  async findOne(id: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: id, userId },
      },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            projects: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    return {
      workspace: membership.workspace,
      currentUserRole: membership.role,
      members: membership.workspace.members.map((m) => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      projects: membership.workspace.projects,
    };
  }

  async create(
    organizationId: string,
    userId: string,
    data: { name: string; slug?: string; description?: string },
  ) {
    // Check organization membership
    const orgMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });

    if (!orgMember || !['owner', 'admin'].includes(orgMember.role)) {
      throw new ForbiddenException('Not authorized to create workspaces');
    }

    const slug = data.slug || this.generateSlug(data.name);

    const workspace = await this.prisma.workspace.create({
      data: {
        organizationId,
        name: data.name,
        slug,
        description: data.description,
        settings: {
          maxConcurrentJobs: 5,
          retentionDays: 90,
        },
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
      },
    });

    return workspace;
  }

  async update(
    id: string,
    userId: string,
    data: { name?: string; description?: string; settings?: Record<string, unknown> },
  ) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: id, userId },
      },
    });

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Not authorized to update workspace');
    }

    return this.prisma.workspace.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        settings: data.settings,
      },
    });
  }

  async delete(id: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: id, userId },
      },
    });

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Not authorized to delete workspace');
    }

    await this.prisma.workspace.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addMember(workspaceId: string, userId: string, email: string, role: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Not authorized to add members');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role,
      },
    });
  }

  async removeMember(workspaceId: string, userId: string, memberId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Not authorized to remove members');
    }

    await this.prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId, userId: memberId },
      },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}
