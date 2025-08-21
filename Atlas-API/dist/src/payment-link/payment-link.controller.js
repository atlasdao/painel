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
exports.PaymentLinkController = void 0;
const common_1 = require("@nestjs/common");
const payment_link_service_1 = require("./payment-link.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const payment_link_dto_1 = require("./dto/payment-link.dto");
const swagger_1 = require("@nestjs/swagger");
let PaymentLinkController = class PaymentLinkController {
    paymentLinkService;
    constructor(paymentLinkService) {
        this.paymentLinkService = paymentLinkService;
    }
    async createPaymentLink(req, dto) {
        const userId = req.user?.id || req.user?.sub;
        if (!userId) {
            throw new common_1.HttpException('User not authenticated', common_1.HttpStatus.UNAUTHORIZED);
        }
        return this.paymentLinkService.create(userId, dto);
    }
    async getMyPaymentLinks(req) {
        const userId = req.user?.id || req.user?.sub;
        if (!userId) {
            throw new common_1.HttpException('User not authenticated', common_1.HttpStatus.UNAUTHORIZED);
        }
        return this.paymentLinkService.findByUserId(userId);
    }
    async deletePaymentLink(req, id) {
        const userId = req.user?.id || req.user?.sub;
        if (!userId) {
            throw new common_1.HttpException('User not authenticated', common_1.HttpStatus.UNAUTHORIZED);
        }
        await this.paymentLinkService.delete(id, userId);
        return { message: 'Payment link deleted successfully' };
    }
};
exports.PaymentLinkController = PaymentLinkController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new payment link' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Payment link created successfully' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, payment_link_dto_1.CreatePaymentLinkDto]),
    __metadata("design:returntype", Promise)
], PaymentLinkController.prototype, "createPaymentLink", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all payment links for current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns all payment links' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentLinkController.prototype, "getMyPaymentLinks", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a payment link' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment link deleted successfully' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentLinkController.prototype, "deletePaymentLink", null);
exports.PaymentLinkController = PaymentLinkController = __decorate([
    (0, swagger_1.ApiTags)('Payment Links'),
    (0, common_1.Controller)('payment-links'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [payment_link_service_1.PaymentLinkService])
], PaymentLinkController);
//# sourceMappingURL=payment-link.controller.js.map