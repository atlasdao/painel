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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyRequestController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const scope_guard_1 = require("../auth/guards/scope.guard");
const scope_decorator_1 = require("../common/decorators/scope.decorator");
const api_key_request_service_1 = require("./api-key-request.service");
const api_key_request_dto_1 = require("../common/dto/api-key-request.dto");
const client_1 = require("@prisma/client");
let ApiKeyRequestController = class ApiKeyRequestController {
    apiKeyRequestService;
    constructor(apiKeyRequestService) {
        this.apiKeyRequestService = apiKeyRequestService;
    }
    async createRequest(req, dto) {
        const userId = req.user.sub || req.user.id;
        return await this.apiKeyRequestService.createRequest(userId, dto);
    }
    async getMyRequests(req) {
        const userId = req.user.sub || req.user.id;
        return await this.apiKeyRequestService.getUserRequests(userId);
    }
    async getMyApiKeys(req) {
        const userId = req.user.sub || req.user.id;
        return await this.apiKeyRequestService.getUserActiveApiKeys(userId);
    }
    async getAllRequests(filter) {
        return await this.apiKeyRequestService.getAllRequests(filter);
    }
    async getRequestById(id) {
        return await this.apiKeyRequestService.getRequestById(id);
    }
    async approveRequest(id, req, dto) {
        const adminId = req.user.sub || req.user.id;
        return await this.apiKeyRequestService.approveRequest(id, adminId, dto);
    }
    async rejectRequest(id, req, dto) {
        const adminId = req.user.sub || req.user.id;
        return await this.apiKeyRequestService.rejectRequest(id, adminId, dto);
    }
    async revokeApiKey(id, req, reason) {
        const adminId = req.user.sub || req.user.id;
        return await this.apiKeyRequestService.revokeApiKey(id, adminId, reason);
    }
};
exports.ApiKeyRequestController = ApiKeyRequestController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Request an API key' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'API key request created successfully',
        type: api_key_request_dto_1.ApiKeyRequestResponseDto
    }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Conflict - User already has request or API key' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, api_key_request_dto_1.CreateApiKeyRequestDto]),
    __metadata("design:returntype", Promise)
], ApiKeyRequestController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Get)('my-requests'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user API key requests' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of user API key requests',
        type: [api_key_request_dto_1.ApiKeyRequestResponseDto]
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApiKeyRequestController.prototype, "getMyRequests", null);
__decorate([
    (0, common_1.Get)('my-api-keys'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user active API keys' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of user active API keys',
        type: [api_key_request_dto_1.ApiKeyRequestResponseDto]
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApiKeyRequestController.prototype, "getMyApiKeys", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(scope_guard_1.ScopeGuard),
    (0, scope_decorator_1.Scope)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all API key requests (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'] }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, type: String }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of all API key requests',
        type: [api_key_request_dto_1.ApiKeyRequestResponseDto]
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [api_key_request_dto_1.FilterApiKeyRequestsDto]),
    __metadata("design:returntype", Promise)
], ApiKeyRequestController.prototype, "getAllRequests", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(scope_guard_1.ScopeGuard),
    (0, scope_decorator_1.Scope)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get API key request by ID (Admin only)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'API key request details',
        type: api_key_request_dto_1.ApiKeyRequestResponseDto
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Request not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApiKeyRequestController.prototype, "getRequestById", null);
__decorate([
    (0, common_1.Put)(':id/approve'),
    (0, common_1.UseGuards)(scope_guard_1.ScopeGuard),
    (0, scope_decorator_1.Scope)(client_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve API key request (Admin only)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Request approved and API key generated',
        schema: {
            properties: {
                id: { type: 'string' },
                status: { type: 'string', example: 'APPROVED' },
                apiKey: { type: 'string', description: 'Generated API key (only shown once)' },
                approvedAt: { type: 'string', format: 'date-time' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Request already processed' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Request not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, api_key_request_dto_1.ApproveApiKeyRequestDto]),
    __metadata("design:returntype", Promise)
], ApiKeyRequestController.prototype, "approveRequest", null);
__decorate([
    (0, common_1.Put)(':id/reject'),
    (0, common_1.UseGuards)(scope_guard_1.ScopeGuard),
    (0, scope_decorator_1.Scope)(client_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject API key request (Admin only)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Request rejected',
        type: api_key_request_dto_1.ApiKeyRequestResponseDto
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Request already processed' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Request not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, api_key_request_dto_1.RejectApiKeyRequestDto]),
    __metadata("design:returntype", Promise)
], ApiKeyRequestController.prototype, "rejectRequest", null);
__decorate([
    (0, common_1.Put)(':id/revoke'),
    (0, common_1.UseGuards)(scope_guard_1.ScopeGuard),
    (0, scope_decorator_1.Scope)(client_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke approved API key (Admin only)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'API key revoked',
        type: api_key_request_dto_1.ApiKeyRequestResponseDto
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Can only revoke approved keys' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Request not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ApiKeyRequestController.prototype, "revokeApiKey", null);
exports.ApiKeyRequestController = ApiKeyRequestController = __decorate([
    (0, swagger_1.ApiTags)('API Key Requests'),
    (0, common_1.Controller)('api-key-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [api_key_request_service_1.ApiKeyRequestService])
], ApiKeyRequestController);
//# sourceMappingURL=api-key-request.controller.js.map