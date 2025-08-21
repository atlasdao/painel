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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const transaction_cleanup_service_1 = require("../services/transaction-cleanup.service");
const client_1 = require("@prisma/client");
let AdminController = class AdminController {
    adminService;
    transactionCleanupService;
    constructor(adminService, transactionCleanupService) {
        this.adminService = adminService;
        this.transactionCleanupService = transactionCleanupService;
    }
    checkAdminRole(user) {
        const isAdminInRoles = user.roles?.some((r) => r === client_1.UserRole.ADMIN);
        const isAdminInRole = user.role === client_1.UserRole.ADMIN;
        if (!isAdminInRoles && !isAdminInRole) {
            throw new common_1.ForbiddenException('Admin access required');
        }
    }
    async getAllUsers(req, skip, take, isActive) {
        this.checkAdminRole(req.user);
        return this.adminService.getAllUsers({ skip, take, isActive });
    }
    async getUserById(req, userId) {
        this.checkAdminRole(req.user);
        return this.adminService.getUserById(userId);
    }
    async updateUserStatus(req, userId, isActive) {
        this.checkAdminRole(req.user);
        return this.adminService.updateUserStatus(userId, isActive);
    }
    async updateUser(req, userId, data) {
        this.checkAdminRole(req.user);
        return this.adminService.updateUser(userId, data);
    }
    async generateUserApiKey(req, userId) {
        this.checkAdminRole(req.user);
        return this.adminService.generateUserApiKey(userId);
    }
    async revokeUserApiKey(req, userId) {
        this.checkAdminRole(req.user);
        await this.adminService.revokeUserApiKey(userId);
    }
    async deleteUser(req, userId) {
        this.checkAdminRole(req.user);
        await this.adminService.deleteUser(userId);
    }
    async getUserStatsById(req, userId) {
        this.checkAdminRole(req.user);
        return this.adminService.getUserStatsById(userId);
    }
    async getAllTransactions(req, skip, take, limit, offset, status, type, userId) {
        this.checkAdminRole(req.user);
        const finalTake = take !== undefined ? take : limit;
        const finalSkip = skip !== undefined ? skip : offset;
        return this.adminService.getAllTransactions({
            skip: finalSkip,
            take: finalTake,
            status,
            type,
            userId,
        });
    }
    async updateTransactionStatus(req, transactionId, data) {
        this.checkAdminRole(req.user);
        return this.adminService.updateTransactionStatus(transactionId, data.status, data.errorMessage);
    }
    async getAuditLogs(req, skip, take, userId, action, resource, startDate, endDate) {
        this.checkAdminRole(req.user);
        return this.adminService.getAuditLogs({
            skip,
            take,
            userId,
            action,
            resource,
            startDate,
            endDate,
        });
    }
    async getSystemStats(req) {
        this.checkAdminRole(req.user);
        return this.adminService.getSystemStats();
    }
    async getUserStats(req) {
        this.checkAdminRole(req.user);
        return this.adminService.getUserStats();
    }
    async getAuditStats(req, startDate, endDate) {
        this.checkAdminRole(req.user);
        return this.adminService.getAuditStats(startDate, endDate);
    }
    async getDashboardStats(req) {
        this.checkAdminRole(req.user);
        return this.adminService.getDashboardStats();
    }
    async getDashboardData(req, limit = 5) {
        this.checkAdminRole(req.user);
        return this.adminService.getDashboardData(limit);
    }
    async getAllUsersWithLimits(req, skip, take, isFirstDay, isKycVerified, isHighRiskUser) {
        this.checkAdminRole(req.user);
        return this.adminService.getAllUsersWithLimits({
            skip,
            take,
            isFirstDay,
            isKycVerified,
            isHighRiskUser,
        });
    }
    async getUserLimits(req, userId) {
        this.checkAdminRole(req.user);
        return this.adminService.getUserLimits(userId);
    }
    async updateUserLimits(req, userId, updateLimitsDto) {
        this.checkAdminRole(req.user);
        const adminId = req.user.sub || req.user.id;
        return this.adminService.updateUserLimits(userId, updateLimitsDto, adminId);
    }
    async resetUserFirstDay(req, userId) {
        this.checkAdminRole(req.user);
        const adminId = req.user.sub || req.user.id;
        return this.adminService.resetUserFirstDay(userId, adminId);
    }
    async applyKycLimits(req, userId) {
        this.checkAdminRole(req.user);
        const adminId = req.user.sub || req.user.id;
        return this.adminService.applyKycLimits(userId, adminId);
    }
    async updateEulenToken(req, data) {
        this.checkAdminRole(req.user);
        return this.adminService.updateEulenToken(data.token);
    }
    async getTransactionCleanupStats(req) {
        this.checkAdminRole(req.user);
        return this.transactionCleanupService.getTransactionStats();
    }
    async manualTransactionCleanup(req) {
        this.checkAdminRole(req.user);
        const expiredCount = await this.transactionCleanupService.manualCleanup();
        return {
            message: 'Manual transaction cleanup completed',
            expiredCount,
            timestamp: new Date().toISOString(),
        };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('users'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all users (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'skip', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'take', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isActive', type: Boolean, required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Users retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('skip')),
    __param(2, (0, common_1.Query)('take')),
    __param(3, (0, common_1.Query)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, Boolean]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user by ID (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUserById", null);
__decorate([
    (0, common_1.Put)('users/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user status (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User status updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Boolean]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserStatus", null);
__decorate([
    (0, common_1.Patch)('users/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Post)('users/:id/generate-api-key'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate API key for user (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'API key generated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'User already has an API key' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "generateUserApiKey", null);
__decorate([
    (0, common_1.Delete)('users/:id/apikey'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke user API key (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'API key revoked' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "revokeUserApiKey", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete user (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'User deleted' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required or user has pending transactions' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('users/:id/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get statistics for a specific user (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User statistics retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUserStatsById", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all transactions (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'skip', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'take', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: Number, required: false, description: 'Alias for take' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', type: Number, required: false, description: 'Alias for skip' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: client_1.TransactionStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'type', enum: client_1.TransactionType, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'userId', type: String, required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transactions retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('skip')),
    __param(2, (0, common_1.Query)('take')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __param(5, (0, common_1.Query)('status')),
    __param(6, (0, common_1.Query)('type')),
    __param(7, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllTransactions", null);
__decorate([
    (0, common_1.Put)('transactions/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update transaction status (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction status updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Transaction not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateTransactionStatus", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, swagger_1.ApiOperation)({ summary: 'Get audit logs (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'skip', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'take', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'userId', type: String, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'action', type: String, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'resource', type: String, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', type: Date, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', type: Date, required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Audit logs retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('skip')),
    __param(2, (0, common_1.Query)('take')),
    __param(3, (0, common_1.Query)('userId')),
    __param(4, (0, common_1.Query)('action')),
    __param(5, (0, common_1.Query)('resource')),
    __param(6, (0, common_1.Query)('startDate')),
    __param(7, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String, Date,
        Date]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get system statistics (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistics retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSystemStats", null);
__decorate([
    (0, common_1.Get)('stats/users'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user statistics (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User statistics retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUserStats", null);
__decorate([
    (0, common_1.Get)('stats/audit'),
    (0, swagger_1.ApiOperation)({ summary: 'Get audit statistics (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', type: Date, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', type: Date, required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Audit statistics retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Date,
        Date]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAuditStats", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get dashboard statistics (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Dashboard statistics retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('dashboard/data'),
    (0, swagger_1.ApiOperation)({ summary: 'Get dashboard data (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: Number, required: false, description: 'Limit for recent transactions' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Dashboard data retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDashboardData", null);
__decorate([
    (0, common_1.Get)('users/limits'),
    (0, swagger_1.ApiTags)('Admin - User Limits'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all users with their transaction limits (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'skip', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'take', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isFirstDay', type: Boolean, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isKycVerified', type: Boolean, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isHighRiskUser', type: Boolean, required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Users with limits retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('skip')),
    __param(2, (0, common_1.Query)('take')),
    __param(3, (0, common_1.Query)('isFirstDay')),
    __param(4, (0, common_1.Query)('isKycVerified')),
    __param(5, (0, common_1.Query)('isHighRiskUser')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, Boolean, Boolean, Boolean]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllUsersWithLimits", null);
__decorate([
    (0, common_1.Get)('users/:id/limits'),
    (0, swagger_1.ApiTags)('Admin - User Limits'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user limits and usage (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User limits retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUserLimits", null);
__decorate([
    (0, common_1.Put)('users/:id/limits'),
    (0, swagger_1.ApiTags)('Admin - User Limits'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user transaction limits (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User limits updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserLimits", null);
__decorate([
    (0, common_1.Post)('users/:id/limits/reset-first-day'),
    (0, swagger_1.ApiTags)('Admin - User Limits'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset user first day status (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'First day status reset' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resetUserFirstDay", null);
__decorate([
    (0, common_1.Post)('users/:id/limits/apply-kyc-limits'),
    (0, swagger_1.ApiTags)('Admin - User Limits'),
    (0, swagger_1.ApiOperation)({ summary: 'Apply KYC verified limits to user (Admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'KYC limits applied' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "applyKycLimits", null);
__decorate([
    (0, common_1.Put)('system/eulen-token'),
    (0, swagger_1.ApiTags)('Admin - System Configuration'),
    (0, swagger_1.ApiOperation)({ summary: 'Update Eulen API JWT token (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Eulen token updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid token format' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateEulenToken", null);
__decorate([
    (0, common_1.Get)('transactions/cleanup/stats'),
    (0, swagger_1.ApiTags)('Admin - Transaction Cleanup'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction cleanup statistics (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction cleanup statistics' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTransactionCleanupStats", null);
__decorate([
    (0, common_1.Post)('transactions/cleanup/manual'),
    (0, swagger_1.ApiTags)('Admin - Transaction Cleanup'),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger transaction cleanup (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Manual cleanup completed' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Admin access required' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "manualTransactionCleanup", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        transaction_cleanup_service_1.TransactionCleanupService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map