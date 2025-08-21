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
exports.LimitValidationService = void 0;
const common_1 = require("@nestjs/common");
const user_limit_repository_1 = require("../repositories/user-limit.repository");
const client_1 = require("@prisma/client");
let LimitValidationService = class LimitValidationService {
    userLimitRepository;
    constructor(userLimitRepository) {
        this.userLimitRepository = userLimitRepository;
    }
    async validateTransactionLimits(userId, transactionType, amount) {
        const userLimits = await this.userLimitRepository.getOrCreateUserLimits(userId);
        const dailyUsage = await this.userLimitRepository.getUserDailyUsage(userId);
        const monthlyUsage = await this.userLimitRepository.getUserMonthlyUsage(userId);
        let dailyLimit;
        let monthlyLimit;
        let perTxLimit;
        let currentDailyUsage;
        let currentMonthlyUsage;
        switch (transactionType) {
            case client_1.TransactionType.DEPOSIT:
                dailyLimit = userLimits.dailyDepositLimit;
                monthlyLimit = userLimits.monthlyDepositLimit;
                perTxLimit = userLimits.maxDepositPerTx;
                currentDailyUsage = dailyUsage.depositToday;
                currentMonthlyUsage = monthlyUsage.depositThisMonth;
                break;
            case client_1.TransactionType.WITHDRAW:
                dailyLimit = userLimits.dailyWithdrawLimit;
                monthlyLimit = userLimits.monthlyWithdrawLimit;
                perTxLimit = userLimits.maxWithdrawPerTx;
                currentDailyUsage = dailyUsage.withdrawToday;
                currentMonthlyUsage = monthlyUsage.withdrawThisMonth;
                break;
            case client_1.TransactionType.TRANSFER:
                dailyLimit = userLimits.dailyTransferLimit;
                monthlyLimit = userLimits.monthlyTransferLimit;
                perTxLimit = userLimits.maxTransferPerTx;
                currentDailyUsage = dailyUsage.transferToday;
                currentMonthlyUsage = monthlyUsage.transferThisMonth;
                break;
            default:
                return {
                    allowed: false,
                    reason: 'Tipo de transação não suportado',
                };
        }
        if (amount > perTxLimit) {
            return {
                allowed: false,
                reason: `Valor excede o limite por transação de R$ ${perTxLimit.toFixed(2)}`,
                limits: {
                    dailyLimit,
                    monthlyLimit,
                    perTransactionLimit: perTxLimit,
                },
            };
        }
        if (currentDailyUsage + amount > dailyLimit) {
            return {
                allowed: false,
                reason: `Valor excede o limite diário de R$ ${dailyLimit.toFixed(2)}. Já utilizado hoje: R$ ${currentDailyUsage.toFixed(2)}`,
                currentUsage: {
                    daily: currentDailyUsage,
                    monthly: currentMonthlyUsage,
                },
                limits: {
                    dailyLimit,
                    monthlyLimit,
                    perTransactionLimit: perTxLimit,
                },
            };
        }
        if (currentMonthlyUsage + amount > monthlyLimit) {
            return {
                allowed: false,
                reason: `Valor excede o limite mensal de R$ ${monthlyLimit.toFixed(2)}. Já utilizado este mês: R$ ${currentMonthlyUsage.toFixed(2)}`,
                currentUsage: {
                    daily: currentDailyUsage,
                    monthly: currentMonthlyUsage,
                },
                limits: {
                    dailyLimit,
                    monthlyLimit,
                    perTransactionLimit: perTxLimit,
                },
            };
        }
        if (userLimits.isFirstDay && transactionType === client_1.TransactionType.DEPOSIT) {
            if (amount > 500.00) {
                return {
                    allowed: false,
                    reason: 'No primeiro dia, o limite máximo é de R$ 500,00 (compliance MED)',
                    currentUsage: {
                        daily: currentDailyUsage,
                        monthly: currentMonthlyUsage,
                    },
                    limits: {
                        dailyLimit: 500.00,
                        monthlyLimit,
                        perTransactionLimit: perTxLimit,
                    },
                };
            }
        }
        if (userLimits.isHighRiskUser) {
            const reducedDailyLimit = dailyLimit * 0.5;
            const reducedMonthlyLimit = monthlyLimit * 0.5;
            const reducedPerTxLimit = perTxLimit * 0.5;
            if (amount > reducedPerTxLimit) {
                return {
                    allowed: false,
                    reason: `Usuário de alto risco: limite por transação reduzido para R$ ${reducedPerTxLimit.toFixed(2)}`,
                    limits: {
                        dailyLimit: reducedDailyLimit,
                        monthlyLimit: reducedMonthlyLimit,
                        perTransactionLimit: reducedPerTxLimit,
                    },
                };
            }
            if (currentDailyUsage + amount > reducedDailyLimit) {
                return {
                    allowed: false,
                    reason: `Usuário de alto risco: limite diário reduzido para R$ ${reducedDailyLimit.toFixed(2)}`,
                    currentUsage: {
                        daily: currentDailyUsage,
                        monthly: currentMonthlyUsage,
                    },
                    limits: {
                        dailyLimit: reducedDailyLimit,
                        monthlyLimit: reducedMonthlyLimit,
                        perTransactionLimit: reducedPerTxLimit,
                    },
                };
            }
        }
        return {
            allowed: true,
            currentUsage: {
                daily: currentDailyUsage,
                monthly: currentMonthlyUsage,
            },
            limits: {
                dailyLimit,
                monthlyLimit,
                perTransactionLimit: perTxLimit,
            },
        };
    }
    async validateAndThrow(userId, transactionType, amount) {
        const validation = await this.validateTransactionLimits(userId, transactionType, amount);
        if (!validation.allowed) {
            throw new common_1.ForbiddenException({
                message: validation.reason,
                currentUsage: validation.currentUsage,
                limits: validation.limits,
                code: 'LIMIT_EXCEEDED',
            });
        }
    }
    async getUserLimitsSummary(userId) {
        const userLimits = await this.userLimitRepository.getOrCreateUserLimits(userId);
        const dailyUsage = await this.userLimitRepository.getUserDailyUsage(userId);
        const monthlyUsage = await this.userLimitRepository.getUserMonthlyUsage(userId);
        return {
            limits: {
                daily: {
                    deposit: userLimits.dailyDepositLimit,
                    withdraw: userLimits.dailyWithdrawLimit,
                    transfer: userLimits.dailyTransferLimit,
                },
                monthly: {
                    deposit: userLimits.monthlyDepositLimit,
                    withdraw: userLimits.monthlyWithdrawLimit,
                    transfer: userLimits.monthlyTransferLimit,
                },
                perTransaction: {
                    deposit: userLimits.maxDepositPerTx,
                    withdraw: userLimits.maxWithdrawPerTx,
                    transfer: userLimits.maxTransferPerTx,
                },
            },
            dailyUsage,
            monthlyUsage,
            isFirstDay: userLimits.isFirstDay,
            isKycVerified: userLimits.isKycVerified,
            isHighRiskUser: userLimits.isHighRiskUser,
        };
    }
    async processSuccessfulTransaction(userId, transactionType) {
        const userLimits = await this.userLimitRepository.getOrCreateUserLimits(userId);
        if (userLimits.isFirstDay && transactionType === client_1.TransactionType.DEPOSIT) {
            await this.userLimitRepository.markUserAsNotFirstDay(userId);
        }
    }
};
exports.LimitValidationService = LimitValidationService;
exports.LimitValidationService = LimitValidationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_limit_repository_1.UserLimitRepository])
], LimitValidationService);
//# sourceMappingURL=limit-validation.service.js.map