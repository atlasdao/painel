"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    logger = new common_1.Logger(HttpExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = (0, uuid_1.v4)();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'InternalServerError';
        let validationErrors = null;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object') {
                const responseObj = exceptionResponse;
                message = responseObj.message || message;
                error = responseObj.error || exception.name;
                if (responseObj.message && Array.isArray(responseObj.message)) {
                    validationErrors = responseObj.message.map((msg) => {
                        const [field, ...messageParts] = msg.split(' ');
                        return {
                            field,
                            message: messageParts.join(' '),
                        };
                    });
                    message = 'Validation failed';
                }
            }
        }
        else if (exception instanceof Error) {
            message = exception.message;
            error = exception.name;
            this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack, {
                requestId,
                method: request.method,
                url: request.url,
                ip: request.ip,
                userAgent: request.get('user-agent'),
            });
        }
        const errorResponse = {
            statusCode: status,
            message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url,
            requestId,
        };
        if (validationErrors) {
            errorResponse.errors = validationErrors;
        }
        if (status >= 500) {
            this.logger.error(`HTTP ${status} Error: ${message}`, {
                requestId,
                statusCode: status,
                error,
                path: request.url,
                method: request.method,
                ip: request.ip,
                userAgent: request.get('user-agent'),
            });
        }
        else {
            this.logger.warn(`HTTP ${status} Response: ${message}`, {
                requestId,
                statusCode: status,
                error,
                path: request.url,
                method: request.method,
            });
        }
        response.status(status).json(errorResponse);
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map