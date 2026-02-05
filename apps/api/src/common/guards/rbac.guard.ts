import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RequiredRoles } from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RequiredRoles>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles required, allow access
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check organization role
    if (requiredRoles.organization) {
      const orgId = request.params.organizationId || request.body.organizationId;
      if (orgId) {
        const membership = await this.prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: orgId,
              userId: user.id,
            },
          },
        });

        if (!membership || !requiredRoles.organization.includes(membership.role)) {
          throw new ForbiddenException(
            `Organization role '${requiredRoles.organization.join(' or ')}' required`,
          );
        }
      }
    }

    // Check workspace role
    if (requiredRoles.workspace) {
      const workspaceId = request.params.workspaceId || request.body.workspaceId;
      if (workspaceId) {
        const membership = await this.prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId,
              userId: user.id,
            },
          },
        });

        if (!membership || !requiredRoles.workspace.includes(membership.role)) {
          throw new ForbiddenException(
            `Workspace role '${requiredRoles.workspace.join(' or ')}' required`,
          );
        }
      }
    }

    // Check project role
    if (requiredRoles.project) {
      const projectId = request.params.projectId || request.body.projectId;
      if (projectId) {
        const membership = await this.prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId,
              userId: user.id,
            },
          },
        });

        if (!membership || !requiredRoles.project.includes(membership.role)) {
          throw new ForbiddenException(
            `Project role '${requiredRoles.project.join(' or ')}' required`,
          );
        }
      }
    }

    return true;
  }
}
