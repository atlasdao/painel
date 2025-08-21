import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { SCOPE_KEY } from '../../common/decorators/scope.decorator';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check for new Scope decorator
    const requiredScopes = this.reflector.get<UserRole[]>(SCOPE_KEY, context.getHandler());
    
    // Also check for old RequireScope decorator for backward compatibility
    const oldScope = this.reflector.get<string>('scope', context.getHandler());
    
    if (!requiredScopes && !oldScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Check new scope system based on UserRole
    if (requiredScopes) {
      const userRole = user.role || user.roles?.[0];
      if (!userRole || !requiredScopes.includes(userRole)) {
        throw new ForbiddenException(`Required role: ${requiredScopes.join(' or ')}`);
      }
      return true;
    }

    // Check old scope system for backward compatibility
    if (oldScope && user.scope) {
      // Simple role check for old system
      if (user.scope !== oldScope && user.role !== oldScope) {
        throw new ForbiddenException(`Required scope: ${oldScope}`);
      }
    }

    return true;
  }
}