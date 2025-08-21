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
exports.PaymentLinkResponseDto = exports.CreatePaymentLinkDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreatePaymentLinkDto {
    amount;
    walletAddress;
    description;
    expiresAt;
}
exports.CreatePaymentLinkDto = CreatePaymentLinkDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount to be paid',
        example: 100.50
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreatePaymentLinkDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Wallet address to receive payment',
        example: 'VJL7NxqTjLLFSCqNcPjBvzUgXxMfVuXP7RG'
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentLinkDto.prototype, "walletAddress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Payment description',
        example: 'Product payment'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePaymentLinkDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Expiration date for the payment link',
        example: '2024-12-31T23:59:59Z'
    }),
    (0, class_validator_1.IsDate)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], CreatePaymentLinkDto.prototype, "expiresAt", void 0);
class PaymentLinkResponseDto {
    id;
    userId;
    shortCode;
    amount;
    walletAddress;
    description;
    currentQrCode;
    qrCodeGeneratedAt;
    lastPaymentId;
    totalPayments;
    totalAmount;
    isActive;
    expiresAt;
    createdAt;
    updatedAt;
}
exports.PaymentLinkResponseDto = PaymentLinkResponseDto;
//# sourceMappingURL=payment-link.dto.js.map