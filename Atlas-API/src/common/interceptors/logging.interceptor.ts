import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = uuidv4();
    
    // Attach request ID to request object for use in other parts of the app
    (request as any).requestId = requestId;
    
    const { method, url, body, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(
      `Incoming Request`,
      {
        requestId,
        method,
        url,
        ip,
        userAgent,
        body: this.sanitizeBody(body),
      },
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const { statusCode } = response;
          const duration = Date.now() - startTime;

          // Log successful response
          this.logger.log(
            `Outgoing Response`,
            {
              requestId,
              method,
              url,
              statusCode,
              duration: `${duration}ms`,
              responseSize: data ? JSON.stringify(data).length : 0,
            },
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          
          // Log error response
          this.logger.error(
            `Error Response`,
            {
              requestId,
              method,
              url,
              duration: `${duration}ms`,
              error: error.message,
            },
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}