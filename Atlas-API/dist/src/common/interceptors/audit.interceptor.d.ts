import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditLogRepository } from '../../repositories/audit-log.repository';
export declare class AuditInterceptor implements NestInterceptor {
    private readonly auditLogRepository;
    constructor(auditLogRepository: AuditLogRepository);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private parseRequest;
    private shouldAudit;
    private sanitizeBody;
    private sanitizeResponse;
}
