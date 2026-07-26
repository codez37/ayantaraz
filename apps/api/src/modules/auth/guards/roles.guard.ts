import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JWT_SECRET } from '../auth.constants';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

export interface JwtPayload {
  sub: number;
  phone: string;
  role: string;
  jti?: string;
  exp?: number;
  iat?: number;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new ForbiddenException('No authentication token provided');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: JWT_SECRET,
      });

      const userRole = payload?.role;

      if (!userRole) {
        throw new ForbiddenException('User role not found in token');
      }

      const hasRequiredRole = requiredRoles.some((role) => userRole === role);

      if (!hasRequiredRole) {
        throw new ForbiddenException(
          `User role '${userRole}' does not have required permissions`,
        );
      }

      return true;
    } catch (error) {
      throw new ForbiddenException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    if (request?.cookies?.accessToken) {
      return request.cookies.accessToken;
    }

    const authHeader = request?.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }
}
