import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditLogRepository } from '../../repositories/audit-log.repository';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const { method, url, body, ip, user } = request as any;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();
    
    // Determine action and resource from URL
    const { action, resource, resourceId } = this.parseRequest(method, url);

    return next.handle().pipe(
      tap({
        next: async (data) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          // Only audit write operations and important reads
          if (this.shouldAudit(method, url)) {
            try {
              await this.auditLogRepository.createLog({
                userId: user?.id || null, // Explicitly set to null if user doesn't exist
                action,
                resource,
                resourceId,
                ipAddress: ip,
                userAgent,
                requestBody: this.sanitizeBody(body),
                responseBody: this.sanitizeResponse(data),
                statusCode,
                duration,
              });
            } catch (auditError) {
              // Don't fail the request if audit logging fails
              console.error('Audit logging failed:', auditError);
            }
          }
        },
        error: async (error) => {
          const duration = Date.now() - startTime;
          
          // Audit failed operations
          if (this.shouldAudit(method, url)) {
            try {
              await this.auditLogRepository.createLog({
                userId: user?.id || null, // Explicitly set to null if user doesn't exist
                action,
                resource,
                resourceId,
                ipAddress: ip,
                userAgent,
                requestBody: this.sanitizeBody(body),
                responseBody: { error: error.message },
                statusCode: error.status || 500,
                duration,
              });
            } catch (auditError) {
              // Don't fail the request if audit logging fails
              console.error('Audit logging failed:', auditError);
            }
          }
        },
      }),
    );
  }

  private parseRequest(method: string, url: string): {
    action: string;
    resource: string;
    resourceId?: string;
  } {
    const urlParts = url.split('/').filter(Boolean);
    const resource = urlParts[0] || 'unknown';
    const resourceId = urlParts[1]?.match(/^[a-f\d-]+$/i) ? urlParts[1] : undefined;
    
    const actionMap: Record<string, string> = {
      GET: 'READ',
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    
    const action = actionMap[method] || method;
    
    return { action, resource, resourceId };
  }

  private shouldAudit(method: string, url: string): boolean {
    // Skip health checks and status endpoints
    if (url.includes('/health') || url.includes('/ping')) {
      return false;
    }
    
    // Audit all write operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }
    
    // Audit sensitive reads
    if (method === 'GET' && (
      url.includes('/transactions') ||
      url.includes('/users') ||
      url.includes('/audit')
    )) {
      return true;
    }
    
    return false;
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    
    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      'creditCard',
      'cvv',
    ];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeResponse(data: any): any {
    if (!data) return null;
    
    // Limit response size for audit logs
    const stringified = JSON.stringify(data);
    if (stringified.length > 1000) {
      return { _truncated: true, _size: stringified.length };
    }
    
    return data;
  }
}