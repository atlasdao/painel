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
exports.AccountValidationController = void 0;
const common_1 = require("@nestjs/common");
const account_validation_service_1 = require("./account-validation.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const admin_guard_1 = require("../auth/guards/admin.guard");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateValidationPaymentDto {
    depixAddress;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateValidationPaymentDto.prototype, "depixAddress", void 0);
class AdjustUserLimitsDto {
    dailyLimit;
    tier;
    adminNotes;
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AdjustUserLimitsDto.prototype, "dailyLimit", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AdjustUserLimitsDto.prototype, "tier", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AdjustUserLimitsDto.prototype, "adminNotes", void 0);
class ValidationSettingsDto {
    validationEnabled;
    validationAmount;
    initialDailyLimit;
    limitTiers;
    thresholdTiers;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ValidationSettingsDto.prototype, "validationEnabled", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ValidationSettingsDto.prototype, "validationAmount", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ValidationSettingsDto.prototype, "initialDailyLimit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ValidationSettingsDto.prototype, "limitTiers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ValidationSettingsDto.prototype, "thresholdTiers", void 0);
let AccountValidationController = class AccountValidationController {
    accountValidationService;
    constructor(accountValidationService) {
        this.accountValidationService = accountValidationService;
    }
    async getValidationStatus(req) {
        if (!req.user || !req.user.id) {
            throw new common_1.BadRequestException('User not authenticated or user ID not found in request');
        }
        return this.accountValidationService.checkValidationStatus(req.user.id);
    }
    async getValidationRequirements() {
        return this.accountValidationService.getValidationRequirements();
    }
    async createValidationPayment(req, dto) {
        if (!req.user || !req.user.id) {
            throw new common_1.BadRequestException('User not authenticated or user ID not found in request');
        }
        return this.accountValidationService.createValidationPayment(req.user.id, dto.depixAddress);
    }
    async getUserLimits(req) {
        if (!req.user || !req.user.id) {
            throw new common_1.BadRequestException('User not authenticated or user ID not found in request');
        }
        return this.accountValidationService.getUserLimitsAndReputation(req.user.id);
    }
    async getDebugValidationStatus(req) {
        if (!req.user || !req.user.id) {
            throw new common_1.BadRequestException('User not authenticated or user ID not found in request');
        }
        return this.accountValidationService.getDetailedValidationStatus(req.user.id);
    }
    async manualValidationCheck(req) {
        if (!req.user || !req.user.id) {
            throw new common_1.BadRequestException('User not authenticated or user ID not found in request');
        }
        return this.accountValidationService.manualValidationCheck(req.user.id);
    }
    async adjustUserLimits(userId, dto) {
        await this.accountValidationService.adjustUserLimits(userId, dto.dailyLimit, dto.tier, dto.adminNotes);
        return { success: true, message: 'User limits adjusted successfully' };
    }
    async getValidationSettings() {
        return this.accountValidationService.getValidationSettings();
    }
    async updateValidationSettings(dto) {
        await this.accountValidationService.updateValidationSettings(dto);
        return { success: true, message: 'Validation settings updated successfully' };
    }
};
exports.AccountValidationController = AccountValidationController;
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Check account validation status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns validation status' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AccountValidationController.prototype, "getValidationStatus", null);
__decorate([
    (0, common_1.Get)('requirements'),
    (0, swagger_1.ApiOperation)({ summary: 'Get validation requirements' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns validation requirements' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AccountValidationController.prototype, "getValidationRequirements", null);
__decorate([
    (0, common_1.Post)('create-payment'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Create validation payment' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Validation payment created' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateValidationPaymentDto]),
    __metadata("design:returntype", Promise)
], AccountValidationController.prototype, "createValidationPayment", null);
__decorate([
    (0, common_1.Get)('limits'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get user limits and reputation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns user limits and reputation' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AccountValidationController.prototype, "getUserLimits", null);
__decorate([
    (0, common_1.Get)('debug-status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Debug validation status with detailed info' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns detailed validation debug info' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AccountValidationController.prototype, "getDebugValidationStatus", null);
__decorate([
    (0, common_1.Post)('manual-check'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Manually trigger validation check' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Manual validation check triggered' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AccountValidationController.prototype, "manualValidationCheck", null);
__decorate([
    (0, common_1.Put)('user/:userId/limits'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Adjust user limits (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User limits adjusted' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AdjustUserLimitsDto]),
    __metadata("design:returntype", Promise)
], AccountValidationController.prototype, "adjustUserLimits", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get validation settings (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns validation settings' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AccountValidationController.prototype, "getValidationSettings", null);
__decorate([
    (0, common_1.Put)('settings'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update validation settings (Admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Validation settings updated' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ValidationSettingsDto]),
    __metadata("design:returntype", Promise)
], AccountValidationController.prototype, "updateValidationSettings", null);
exports.AccountValidationController = AccountValidationController = __decorate([
    (0, swagger_1.ApiTags)('Account Validation'),
    (0, common_1.Controller)({ path: 'account-validation', version: '1' }),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [account_validation_service_1.AccountValidationService])
], AccountValidationController);
//# sourceMappingURL=account-validation.controller.js.map