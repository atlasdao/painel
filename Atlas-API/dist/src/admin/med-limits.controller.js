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
exports.MedLimitsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const admin_guard_1 = require("../auth/guards/admin.guard");
const swagger_1 = require("@nestjs/swagger");
const prisma_service_1 = require("../prisma/prisma.service");
const class_validator_1 = require("class-validator");
class UpdateMedLimitsDto {
    dailyDepositLimit;
    dailyWithdrawLimit;
    monthlyDepositLimit;
    monthlyWithdrawLimit;
    maxTransactionAmount;
    requiresKyc;
    firstDayLimit;
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateMedLimitsDto.prototype, "dailyDepositLimit", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateMedLimitsDto.prototype, "dailyWithdrawLimit", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateMedLimitsDto.prototype, "monthlyDepositLimit", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateMedLimitsDto.prototype, "monthlyWithdrawLimit", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateMedLimitsDto.prototype, "maxTransactionAmount", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateMedLimitsDto.prototype, "requiresKyc", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateMedLimitsDto.prototype, "firstDayLimit", void 0);
let MedLimitsController = class MedLimitsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMedLimits() {
        const settings = await this.prisma.systemSettings.findFirst({
            where: { key: 'MED_LIMITS' },
        });
        if (settings && settings.value) {
            return JSON.parse(settings.value);
        }
        return {
            dailyDepositLimit: 1000,
            dailyWithdrawLimit: 1000,
            monthlyDepositLimit: 10000,
            monthlyWithdrawLimit: 10000,
            maxTransactionAmount: 5000,
            requiresKyc: false,
            firstDayLimit: 500,
        };
    }
    async updateMedLimits(dto) {
        try {
            console.log('MED Limits update requested:', JSON.stringify(dto));
            if (dto.dailyDepositLimit !== undefined && dto.dailyDepositLimit <= 0) {
                throw new common_1.HttpException('Daily deposit limit must be positive', common_1.HttpStatus.BAD_REQUEST);
            }
            if (dto.dailyWithdrawLimit !== undefined && dto.dailyWithdrawLimit <= 0) {
                throw new common_1.HttpException('Daily withdraw limit must be positive', common_1.HttpStatus.BAD_REQUEST);
            }
            if (dto.monthlyDepositLimit !== undefined && dto.monthlyDepositLimit <= 0) {
                throw new common_1.HttpException('Monthly deposit limit must be positive', common_1.HttpStatus.BAD_REQUEST);
            }
            if (dto.monthlyWithdrawLimit !== undefined && dto.monthlyWithdrawLimit <= 0) {
                throw new common_1.HttpException('Monthly withdraw limit must be positive', common_1.HttpStatus.BAD_REQUEST);
            }
            if (dto.maxTransactionAmount !== undefined && dto.maxTransactionAmount <= 0) {
                throw new common_1.HttpException('Max transaction amount must be positive', common_1.HttpStatus.BAD_REQUEST);
            }
            if (dto.firstDayLimit !== undefined && dto.firstDayLimit <= 0) {
                throw new common_1.HttpException('First day limit must be positive', common_1.HttpStatus.BAD_REQUEST);
            }
            await this.prisma.systemSettings.upsert({
                where: { key: 'MED_LIMITS' },
                update: {
                    value: JSON.stringify(dto),
                    updatedAt: new Date(),
                },
                create: {
                    key: 'MED_LIMITS',
                    value: JSON.stringify(dto),
                    description: 'MED regulatory limits configuration',
                },
            });
            console.log('MED Limits updated successfully');
            return {
                message: 'MED limits updated successfully',
                limits: dto,
            };
        }
        catch (error) {
            console.error('Error updating MED limits:', error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException(`Failed to update MED limits: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.MedLimitsController = MedLimitsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current MED limits configuration' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns MED limits' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MedLimitsController.prototype, "getMedLimits", null);
__decorate([
    (0, common_1.Put)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update MED limits configuration' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'MED limits updated successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UpdateMedLimitsDto]),
    __metadata("design:returntype", Promise)
], MedLimitsController.prototype, "updateMedLimits", null);
exports.MedLimitsController = MedLimitsController = __decorate([
    (0, swagger_1.ApiTags)('Admin - MED Limits'),
    (0, common_1.Controller)('admin/med-limits'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MedLimitsController);
//# sourceMappingURL=med-limits.controller.js.map