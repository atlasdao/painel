"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const audit_log_repository_1 = require("../../repositories/audit-log.repository");
let AuditInterceptor = class AuditInterceptor {
    auditLogRepository;
    constructor(auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const { method, url, body, ip, user } = request;
        const userAgent = request.get('user-agent') || '';
        const startTime = Date.now();
        const { action, resource, resourceId } = this.parseRequest(method, url);
        return next.handle().pipe((0, operators_1.tap)({
            next: async (data) => {
                const duration = Date.now() - startTime;
                const { statusCode } = response;
                if (this.shouldAudit(method, url)) {
                    try {
                        await this.auditLogRepository.createLog({
                            userId: user?.id || null,
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
                    }
                    catch (auditError) {
                        console.error('Audit logging failed:', auditError);
                    }
                }
            },
            error: async (error) => {
                const duration = Date.now() - startTime;
                if (this.shouldAudit(method, url)) {
                    try {
                        await this.auditLogRepository.createLog({
                            userId: user?.id || null,
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
                    }
                    catch (auditError) {
                        console.error('Audit logging failed:', auditError);
                    }
                }
            },
        }));
    }
    parseRequest(method, url) {
        const urlParts = url.split('/').filter(Boolean);
        const resource = urlParts[0] || 'unknown';
        const resourceId = urlParts[1]?.match(/^[a-f\d-]+$/i) ? urlParts[1] : undefined;
        const actionMap = {
            GET: 'READ',
            POST: 'CREATE',
            PUT: 'UPDATE',
            PATCH: 'UPDATE',
            DELETE: 'DELETE',
        };
        const action = actionMap[method] || method;
        return { action, resource, resourceId };
    }
    shouldAudit(method, url) {
        if (url.includes('/health') || url.includes('/ping')) {
            return false;
        }
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return true;
        }
        if (method === 'GET' && (url.includes('/transactions') ||
            url.includes('/users') ||
            url.includes('/audit'))) {
            return true;
        }
        return false;
    }
    sanitizeBody(body) {
        if (!body)
            return null;
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
    sanitizeResponse(data) {
        if (!data)
            return null;
        const stringified = JSON.stringify(data);
        if (stringified.length > 1000) {
            return { _truncated: true, _size: stringified.length };
        }
        return data;
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_log_repository_1.AuditLogRepository])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map