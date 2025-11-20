import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this endpoint is marked as public
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API Key é obrigatória');
    }

    // Validate API key format
    if (!apiKey.startsWith('atlas_')) {
      throw new UnauthorizedException('Formato de API Key inválido');
    }

    try {
      // Find the API key request with this key
      const apiKeyRequest = await this.prisma.apiKeyRequest.findFirst({
        where: {
          status: 'APPROVED',
          generatedApiKey: {
            not: null,
          },
        },
        include: {
          user: true,
        },
      });

      // Check all approved API keys
      let validUser: any = null;
      const approvedRequests = await this.prisma.apiKeyRequest.findMany({
        where: {
          status: 'APPROVED',
          generatedApiKey: {
            not: null,
          },
        },
        include: {
          user: true,
        },
      });

      for (const req of approvedRequests) {
        if (req.generatedApiKey) {
          // For new plain API keys (starting with atlas_)
          if (req.generatedApiKey === apiKey) {
            validUser = req.user;
            break;
          }
          // For hashed API keys (backward compatibility)
          const isValid = await bcrypt.compare(apiKey, req.generatedApiKey).catch(() => false);
          if (isValid) {
            validUser = req.user;
            break;
          }
        }
      }

      if (!validUser) {
        throw new UnauthorizedException('API Key inválida ou expirada');
      }

      // Check if user is active
      if (!validUser.isActive) {
        throw new UnauthorizedException('Usuário desativado');
      }

      // Check API key expiration if set
      if (apiKeyRequest?.apiKeyExpiresAt && new Date(apiKeyRequest.apiKeyExpiresAt) < new Date()) {
        throw new UnauthorizedException('API Key expirada');
      }

      // Attach user to request for use in controllers
      request.user = validUser;
      request.apiKeyUsed = true;

      // Log API key usage
      await this.prisma.apiKeyUsageLog.create({
        data: {
          apiKeyRequestId: apiKeyRequest?.id || approvedRequests.find(r => r.user.id === validUser.id)?.id,
          endpoint: request.url,
          method: request.method,
          ipAddress: request.ip || request.connection.remoteAddress,
          userAgent: request.headers['user-agent'] || 'Unknown',
          statusCode: 200, // Will be updated by response interceptor
        },
      }).catch(err => {
        console.error('[API_KEY_GUARD] Failed to log API usage:', err);
        // Don't throw, just log the error
      });

      return true;
    } catch (error) {
      console.error('[API_KEY_GUARD] Error validating API key:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Erro ao validar API Key');
    }
  }

  private extractApiKey(request: any): string | null {
    // Check X-API-Key header (preferred)
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check Authorization header with Bearer token format
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer atlas_')) {
      return authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Check query parameter (not recommended for production)
    if (request.query && request.query.api_key) {
      return request.query.api_key;
    }

    return null;
  }
}