import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      this.logger.warn('Access denied: No authenticated user');
      throw new ForbiddenException('Access denied');
    }
    const hasRequiredRole = requiredRoles.includes(user.role as UserRole);
    if (!hasRequiredRole) {
      this.logger.warn(
        `Access denied: User ${user.id} with role ${user.role} requires one of [${requiredRoles.join(', ')}]`,
      );
      throw new ForbiddenException('Access denied');
    }
    return true;
  }
}
