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
exports.ValidationErrorItem = exports.ValidationErrorDto = exports.ErrorResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class ErrorResponseDto {
    statusCode;
    message;
    error;
    timestamp;
    path;
    requestId;
}
exports.ErrorResponseDto = ErrorResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'HTTP status code',
        example: 400,
    }),
    __metadata("design:type", Number)
], ErrorResponseDto.prototype, "statusCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Error message',
        example: 'Bad Request',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Error type/name',
        example: 'BadRequestException',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "error", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Request timestamp',
        example: new Date().toISOString(),
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Request path',
        example: '/api/deposit',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "path", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Request ID for tracking',
        example: 'req_abc123xyz',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "requestId", void 0);
class ValidationErrorDto extends ErrorResponseDto {
    errors;
}
exports.ValidationErrorDto = ValidationErrorDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Validation errors',
        example: [
            {
                field: 'amount',
                message: 'amount must be a positive number',
            },
        ],
    }),
    __metadata("design:type", Array)
], ValidationErrorDto.prototype, "errors", void 0);
class ValidationErrorItem {
    field;
    message;
}
exports.ValidationErrorItem = ValidationErrorItem;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Field name with error',
        example: 'amount',
    }),
    __metadata("design:type", String)
], ValidationErrorItem.prototype, "field", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Error message',
        example: 'amount must be a positive number',
    }),
    __metadata("design:type", String)
], ValidationErrorItem.prototype, "message", void 0);
//# sourceMappingURL=error.dto.js.map