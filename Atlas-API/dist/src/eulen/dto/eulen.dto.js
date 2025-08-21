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
exports.PaginatedResponseDto = exports.TransactionFilterDto = exports.PaginationDto = exports.TransactionStatusDto = exports.TransactionResponseDto = exports.TransferDto = exports.WithdrawDto = exports.DepositDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class DepositDto {
    amount;
    pixKey;
    pixKeyType;
    description;
    externalId;
    webhookUrl;
}
exports.DepositDto = DepositDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction amount in BRL',
        example: 100.50,
        minimum: 0.01,
    }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0.01),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], DepositDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'PIX key for the transaction',
        example: 'user@example.com',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], DepositDto.prototype, "pixKey", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'PIX key type',
        enum: client_1.PixKeyType,
        example: client_1.PixKeyType.EMAIL,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.PixKeyType),
    __metadata("design:type", String)
], DepositDto.prototype, "pixKeyType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Transaction description',
        example: 'Payment for services',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], DepositDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'External transaction ID',
        example: 'EXT-123456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DepositDto.prototype, "externalId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Webhook URL for transaction updates',
        example: 'https://example.com/webhook',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], DepositDto.prototype, "webhookUrl", void 0);
class WithdrawDto extends DepositDto {
}
exports.WithdrawDto = WithdrawDto;
class TransferDto extends DepositDto {
    destinationPixKey;
}
exports.TransferDto = TransferDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Destination PIX key',
        example: 'destination@example.com',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], TransferDto.prototype, "destinationPixKey", void 0);
class TransactionResponseDto {
    id;
    type;
    status;
    amount;
    pixKey;
    pixKeyType;
    externalId;
    description;
    metadata;
    errorMessage;
    currency;
    createdAt;
    updatedAt;
    processedAt;
}
exports.TransactionResponseDto = TransactionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction ID',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction type',
        enum: client_1.TransactionType,
        example: client_1.TransactionType.DEPOSIT,
    }),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction status',
        enum: client_1.TransactionStatus,
        example: client_1.TransactionStatus.PENDING,
    }),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction amount',
        example: 100.50,
    }),
    __metadata("design:type", Number)
], TransactionResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'PIX key',
        example: 'user@example.com',
    }),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "pixKey", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'PIX key type',
        enum: client_1.PixKeyType,
        example: client_1.PixKeyType.EMAIL,
    }),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "pixKeyType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'External transaction ID',
        example: 'EXT-123456',
    }),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "externalId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Transaction description',
        example: 'Payment for services',
    }),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Transaction metadata',
        example: '{"qrCode": true, "depixAddress": "VJL..."}',
    }),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Error message if transaction failed',
        example: 'Insufficient funds',
    }),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "errorMessage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Currency code',
        example: 'BRL',
    }),
    __metadata("design:type", String)
], TransactionResponseDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Creation timestamp',
        example: new Date(),
    }),
    __metadata("design:type", Date)
], TransactionResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Last update timestamp',
        example: new Date(),
    }),
    __metadata("design:type", Date)
], TransactionResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Processing completion timestamp',
        example: new Date(),
    }),
    __metadata("design:type", Date)
], TransactionResponseDto.prototype, "processedAt", void 0);
class TransactionStatusDto {
    transactionId;
}
exports.TransactionStatusDto = TransactionStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction ID to query',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TransactionStatusDto.prototype, "transactionId", void 0);
class PaginationDto {
    skip = 0;
    take = 10;
    limit;
    offset;
}
exports.PaginationDto = PaginationDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Number of items to skip',
        example: 0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], PaginationDto.prototype, "skip", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Number of items to take',
        example: 10,
        minimum: 1,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], PaginationDto.prototype, "take", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Number of items to return (alias for take)',
        example: 10,
        minimum: 1,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], PaginationDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Number of items to skip (alias for skip)',
        example: 0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], PaginationDto.prototype, "offset", void 0);
class TransactionFilterDto extends PaginationDto {
    status;
    type;
    startDate;
    endDate;
}
exports.TransactionFilterDto = TransactionFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by transaction status',
        enum: client_1.TransactionStatus,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TransactionStatus),
    __metadata("design:type", String)
], TransactionFilterDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by transaction type',
        enum: client_1.TransactionType,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TransactionType),
    __metadata("design:type", String)
], TransactionFilterDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by start date',
        example: '2024-01-01',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], TransactionFilterDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by end date',
        example: '2024-12-31',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], TransactionFilterDto.prototype, "endDate", void 0);
class PaginatedResponseDto {
    data;
    total;
    skip;
    take;
    hasMore;
}
exports.PaginatedResponseDto = PaginatedResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Array of items',
        isArray: true,
    }),
    __metadata("design:type", Array)
], PaginatedResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total number of items',
        example: 100,
    }),
    __metadata("design:type", Number)
], PaginatedResponseDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of items skipped',
        example: 0,
    }),
    __metadata("design:type", Number)
], PaginatedResponseDto.prototype, "skip", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of items taken',
        example: 10,
    }),
    __metadata("design:type", Number)
], PaginatedResponseDto.prototype, "take", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether there are more items',
        example: true,
    }),
    __metadata("design:type", Boolean)
], PaginatedResponseDto.prototype, "hasMore", void 0);
//# sourceMappingURL=eulen.dto.js.map