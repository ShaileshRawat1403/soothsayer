import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface UpdateProfileData {
  name?: string;
  avatarUrl?: string;
  bio?: string;
  timezone?: string;
}

export interface UpdatePreferencesData {
  theme?: string;
  language?: string;
  notifications?: {
    email?: boolean;
    inApp?: boolean;
    approvalRequests?: boolean;
    workflowCompletions?: boolean;
    mentions?: boolean;
  };
  defaultPersonaId?: string;
  defaultWorkspaceId?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        timezone: true,
        isActive: true,
        emailVerified: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        timezone: true,
        isActive: true,
        emailVerified: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        organizationMembers: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        workspaceMembers: {
          select: {
            role: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                isDefault: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find active workspace
    const defaultWorkspace = user.workspaceMembers.find(
      (wm: any) => wm.workspace.isDefault,
    )?.workspace;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        timezone: user.timezone,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      preferences: user.preferences as Record<string, unknown>,
      organizations: user.organizationMembers.map((om: any) => ({
        organizationId: om.organization.id,
        organizationName: om.organization.name,
        role: om.role,
      })),
      activeWorkspace: defaultWorkspace
        ? {
            id: defaultWorkspace.id,
            name: defaultWorkspace.name,
            role: user.workspaceMembers.find(
              (wm: any) => wm.workspace.id === defaultWorkspace.id,
            )?.role,
          }
        : undefined,
    };
  }

  async updateProfile(userId: string, data: UpdateProfileData) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
        timezone: data.timezone,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        timezone: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updatePreferences(userId: string, data: UpdatePreferencesData) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentPrefs = (user.preferences as Record<string, unknown>) || {};
    const updatedPrefs: Record<string, unknown> = {
      ...currentPrefs,
      ...(data.theme && { theme: data.theme }),
      ...(data.language && { language: data.language }),
      ...(data.defaultPersonaId !== undefined && { defaultPersonaId: data.defaultPersonaId }),
      ...(data.defaultWorkspaceId !== undefined && { defaultWorkspaceId: data.defaultWorkspaceId }),
    };

    // Merge notification preferences
    if (data.notifications) {
      const currentNotifs = (currentPrefs.notifications as Record<string, boolean>) || {};
      updatedPrefs.notifications = {
        ...currentNotifs,
        ...data.notifications,
      };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: updatedPrefs as any },
    });

    return updatedPrefs;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new ConflictException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async getSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return sessions;
  }

  async deleteSession(userId: string, sessionId: string) {
    await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
  }

  async deleteAllSessions(userId: string, exceptSessionId?: string) {
    await this.prisma.session.deleteMany({
      where: {
        userId,
        ...(exceptSessionId && { id: { not: exceptSessionId } }),
      },
    });
  }
}
