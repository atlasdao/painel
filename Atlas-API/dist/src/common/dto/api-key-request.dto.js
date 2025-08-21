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
exports.ApiKeyRequestResponseDto = exports.FilterApiKeyRequestsDto = exports.RejectApiKeyRequestDto = exports.ApproveApiKeyRequestDto = exports.CreateApiKeyRequestDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateApiKeyRequestDto {
    usageReason;
    serviceUrl;
    estimatedVolume;
    usageType;
}
exports.CreateApiKeyRequestDto = CreateApiKeyRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Reason for requesting API access',
        example: 'Integrating PIX payments into my e-commerce platform'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateApiKeyRequestDto.prototype, "usageReason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'URL of the service that will use the API',
        example: 'https://mystore.com'
    }),
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateApiKeyRequestDto.prototype, "serviceUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Estimated monthly payment volume',
        example: '100-500 transactions per month'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateApiKeyRequestDto.prototype, "estimatedVolume", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Type of API usage - single CPF/CNPJ or multiple',
        enum: client_1.ApiKeyUsageType,
        example: client_1.ApiKeyUsageType.SINGLE_CPF
    }),
    (0, class_validator_1.IsEnum)(client_1.ApiKeyUsageType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateApiKeyRequestDto.prototype, "usageType", void 0);
class ApproveApiKeyRequestDto {
    approvalNotes;
    apiKeyExpiresAt;
}
exports.ApproveApiKeyRequestDto = ApproveApiKeyRequestDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Admin notes about the approval',
        example: 'Verified business legitimacy, approved for production use'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ApproveApiKeyRequestDto.prototype, "approvalNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'API key expiration date (optional)',
        example: '2025-12-31T23:59:59Z'
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], ApproveApiKeyRequestDto.prototype, "apiKeyExpiresAt", void 0);
class RejectApiKeyRequestDto {
    approvalNotes;
}
exports.RejectApiKeyRequestDto = RejectApiKeyRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Reason for rejection',
        example: 'Insufficient business information provided'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RejectApiKeyRequestDto.prototype, "approvalNotes", void 0);
class FilterApiKeyRequestsDto {
    status;
    userId;
}
exports.FilterApiKeyRequestsDto = FilterApiKeyRequestsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: client_1.ApiKeyRequestStatus,
        description: 'Filter by request status'
    }),
    (0, class_validator_1.IsEnum)(client_1.ApiKeyRequestStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterApiKeyRequestsDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by user ID'
    }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterApiKeyRequestsDto.prototype, "userId", void 0);
class ApiKeyRequestResponseDto {
    id;
    userId;
    usageReason;
    serviceUrl;
    estimatedVolume;
    usageType;
    status;
    approvedBy;
    approvalNotes;
    approvedAt;
    rejectedAt;
    createdAt;
    updatedAt;
    user;
}
exports.ApiKeyRequestResponseDto = ApiKeyRequestResponseDto;
//# sourceMappingURL=api-key-request.dto.js.map