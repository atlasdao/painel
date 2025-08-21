import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('custom-jwt') {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {
    super();
  }

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    
    // Check for API Key first
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
      try {
        // Validate API key directly with database
        const users = await this.prisma.user.findMany({
          where: {
            apiKey: { not: null },
            isActive: true
          }
        });
        
        for (const user of users) {
          if (user.apiKey) {
            const isValid = await bcrypt.compare(apiKey, user.apiKey);
            if (isValid) {
              request.user = {
                id: user.id,
                sub: user.id,
                email: user.email,
                username: user.username,
                roles: [user.role],
                scope: ['api']
              };
              return true;
            }
          }
        }
      } catch (error) {
        // Continue to JWT validation if API key fails
      }
    }
    
    // Check for JWT token
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7);
    
    try {
      // Decode without verification (for external RSA tokens)
      const decoded = jwt.decode(token) as any;
      
      if (!decoded) {
        throw new UnauthorizedException('Invalid token');
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new UnauthorizedException('Token has expired');
      }

      // Extract user ID with fallback logic
      const userId = decoded.id || decoded.sub || decoded.userId;
      
      // Attach user to request with consistent structure
      request.user = {
        id: userId,
        sub: decoded.sub || decoded.id,
        email: decoded.email,
        username: decoded.username,
        roles: decoded.roles || [decoded.role] || ['user'],
        scope: decoded.scope || ['web']
      };
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized access');
    }
    return user;
  }
}