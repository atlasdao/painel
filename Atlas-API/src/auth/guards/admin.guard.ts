import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      return false;
    }
    
    // Check both roles array and role field for flexibility
    const hasAdminRole = user.role === UserRole.ADMIN || 
                        user.role === 'ADMIN' ||
                        (user.roles && Array.isArray(user.roles) && user.roles.includes('ADMIN')) ||
                        (user.roles && Array.isArray(user.roles) && user.roles.includes(UserRole.ADMIN));
    
    return hasAdminRole;
  }
}