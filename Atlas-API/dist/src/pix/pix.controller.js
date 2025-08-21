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
exports.PixController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const pix_service_1 = require("./pix.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const eulen_dto_1 = require("../eulen/dto/eulen.dto");
const client_1 = require("@prisma/client");
let PixController = class PixController {
    pixService;
    constructor(pixService) {
        this.pixService = pixService;
    }
    async testEulenLogs() {
        return this.pixService.pingEulenAPI();
    }
    async createDeposit(req, depositDto) {
        const userId = req.user.sub || req.user.id;
        return this.pixService.createDeposit(userId, depositDto);
    }
    async createWithdraw(req, withdrawDto) {
        const userId = req.user.sub || req.user.id;
        return this.pixService.createWithdraw(userId, withdrawDto);
    }
    async createTransfer(req, transferDto) {
        const userId = req.user.sub || req.user.id;
        return this.pixService.createTransfer(userId, transferDto);
    }
    async getTransactions(req, filters) {
        const userId = req.user.sub || req.user.id;
        if (filters.limit !== undefined && filters.take === undefined) {
            filters.take = filters.limit;
        }
        if (filters.offset !== undefined && filters.skip === undefined) {
            filters.skip = filters.offset;
        }
        return this.pixService.getUserTransactions(userId, filters);
    }
    async getTransaction(req, transactionId) {
        const userId = req.user.sub || req.user.id;
        return this.pixService.getTransactionStatus(userId, transactionId);
    }
    async getTransactionStatus(req, transactionId) {
        const userId = req.user.sub || req.user.id;
        return this.pixService.getTransactionStatus(userId, transactionId);
    }
    async generateQRCode(req, data) {
        const userId = req.user.sub || req.user.id;
        return this.pixService.generatePixQRCode(userId, data);
    }
    async validatePixKey(pixKey) {
        return this.pixService.validatePixKey(pixKey);
    }
    async getBalance(req) {
        const userId = req.user.sub || req.user.id;
        return this.pixService.getBalance(userId);
    }
    async checkDepositStatus(req, transactionId) {
        const userId = req.user.sub || req.user.id;
        return this.pixService.checkDepositStatus(userId, transactionId);
    }
    async ping() {
        return this.pixService.pingEulenAPI();
    }
    async getUserLimits(req) {
        const userId = req.user.sub || req.user.id;
        return this.pixService.getUserLimits(userId);
    }
};
exports.PixController = PixController;
__decorate([
    (0, common_1.Get)('test-eulen-logs'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Test Eulen API logs (temporary endpoint)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PixController.prototype, "testEulenLogs", null);
__decorate([
    (0, common_1.Post)('deposit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a PIX deposit transaction' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Deposit created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, eulen_dto_1.DepositDto]),
    __metadata("design:returntype", Promise)
], PixController.prototype, "createDeposit", null);
__decorate([
    (0, common_1.Post)('withdraw'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a PIX withdrawal transaction' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Withdrawal created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient balance' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, eulen_dto_1.WithdrawDto]),
    __metadata("design:returntype", Promise)
], PixController.prototype, "createWithdraw", null);
__decorate([
    (0, common_1.Post)('transfer'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a PIX transfer transaction' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Transfer created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient balance' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, eulen_dto_1.TransferDto]),
    __metadata("design:returntype", Promise)
], PixController.prototype, "createTransfer", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user transactions with filters' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: client_1.TransactionStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'type', enum: client_1.TransactionType, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'skip', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'take', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: Number, required: false, description: 'Alias for take' }),
    (0, swagger_1.ApiQuery)({ name: 'offset', type: Number, required: false, description: 'Alias for skip' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transactions retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, eulen_dto_1.TransactionFilterDto]),
    __metadata("design:returntype", Promise)
], PixController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)('transactions/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction details by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction details retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Transaction not found' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PixController.prototype, "getTransaction", null);
__decorate([
    (0, common_1.Get)('transactions/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Check transaction status' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction status retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Transaction not found' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PixController.prototype, "getTransactionStatus", null);
__decorate([
    (0, common_1.Post)('qrcode'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Generate PIX QR Code for payment' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'QR Code generated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PixController.prototype, "generateQRCode", null);
__decorate([
    (0, common_1.Post)('validate-key'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Validate a PIX key' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'PIX key validation result' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid PIX key format' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Body)('pixKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PixController.prototype, "validatePixKey", null);
__decorate([
    (0, common_1.Get)('balance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user balance' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Balance retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PixController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)('deposit/:transactionId/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Check deposit status' }),
    (0, swagger_1.ApiParam)({ name: 'transactionId', description: 'Transaction ID to check status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Deposit status retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Transaction not found' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('transactionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PixController.prototype, "checkDepositStatus", null);
__decorate([
    (0, common_1.Get)('ping'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiTags)('Eulen Health'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ping Eulen API health check',
        description: 'Check connectivity and health status of the underlying Eulen API. Returns Eulen API response with JWT token debug info.'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Eulen API is healthy and responding' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - invalid JWT or API key' }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'Eulen API is unavailable or not responding' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PixController.prototype, "ping", null);
__decorate([
    (0, common_1.Get)('limits'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiTags)('User Management'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get user transaction limits and usage',
        description: 'Retrieve current transaction limits, daily/monthly usage, and compliance status for the authenticated user.'
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User limits and usage retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PixController.prototype, "getUserLimits", null);
exports.PixController = PixController = __decorate([
    (0, swagger_1.ApiTags)('PIX Operations'),
    (0, common_1.Controller)('pix'),
    __metadata("design:paramtypes", [pix_service_1.PixService])
], PixController);
//# sourceMappingURL=pix.controller.js.map