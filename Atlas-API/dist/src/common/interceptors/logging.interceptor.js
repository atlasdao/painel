"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const uuid_1 = require("uuid");
let LoggingInterceptor = class LoggingInterceptor {
    logger = new common_1.Logger('HTTP');
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const requestId = (0, uuid_1.v4)();
        request.requestId = requestId;
        const { method, url, body, ip } = request;
        const userAgent = request.get('user-agent') || '';
        const startTime = Date.now();
        this.logger.log(`Incoming Request`, {
            requestId,
            method,
            url,
            ip,
            userAgent,
            body: this.sanitizeBody(body),
        });
        return next.handle().pipe((0, operators_1.tap)({
            next: (data) => {
                const { statusCode } = response;
                const duration = Date.now() - startTime;
                this.logger.log(`Outgoing Response`, {
                    requestId,
                    method,
                    url,
                    statusCode,
                    duration: `${duration}ms`,
                    responseSize: data ? JSON.stringify(data).length : 0,
                });
            },
            error: (error) => {
                const duration = Date.now() - startTime;
                this.logger.error(`Error Response`, {
                    requestId,
                    method,
                    url,
                    duration: `${duration}ms`,
                    error: error.message,
                });
            },
        }));
    }
    sanitizeBody(body) {
        if (!body)
            return body;
        const sanitized = { ...body };
        const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }
        return sanitized;
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map