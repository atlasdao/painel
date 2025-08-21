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
var AccountValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountValidationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const pix_service_1 = require("../pix/pix.service");
const client_1 = require("@prisma/client");
let AccountValidationService = AccountValidationService_1 = class AccountValidationService {
    prisma;
    pixService;
    logger = new common_1.Logger(AccountValidationService_1.name);
    VALIDATION_AMOUNT = 1.00;
    INITIAL_DAILY_LIMIT = 6000;
    LIMIT_TIERS = [6000, 10000, 20000, 40000, 80000, 160000];
    THRESHOLD_TIERS = [50000, 150000, 400000, 1000000, 2500000, 5000000];
    constructor(prisma, pixService) {
        this.prisma = prisma;
        this.pixService = pixService;
    }
    async checkValidationStatus(userId) {
        console.log('AccountValidationService.checkValidationStatus called with userId:', userId, 'type:', typeof userId);
        if (!userId) {
            throw new Error('User ID is required for validation status check');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                isAccountValidated: true,
                validationPaymentId: true,
                validatedAt: true,
            },
        });
        if (!user) {
            throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (user.isAccountValidated) {
            return {
                isValidated: true,
                validationPaymentId: user.validationPaymentId || undefined,
                validatedAt: user.validatedAt || undefined,
            };
        }
        const pendingValidation = await this.prisma.transaction.findFirst({
            where: {
                userId,
                type: client_1.TransactionType.DEPOSIT,
                amount: this.VALIDATION_AMOUNT,
                status: client_1.TransactionStatus.PENDING,
                description: { contains: 'Validação de conta' },
            },
            orderBy: { createdAt: 'desc' },
        });
        return {
            isValidated: false,
            validationQrCode: pendingValidation?.metadata
                ? JSON.parse(pendingValidation.metadata).qrCode
                : undefined,
        };
    }
    async createValidationPayment(userId, depixAddress) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (user.isAccountValidated) {
            throw new common_1.HttpException('Account already validated', common_1.HttpStatus.BAD_REQUEST);
        }
        const existingValidation = await this.prisma.transaction.findFirst({
            where: {
                userId,
                type: client_1.TransactionType.DEPOSIT,
                amount: this.VALIDATION_AMOUNT,
                status: client_1.TransactionStatus.PENDING,
                description: { contains: 'Validação de conta' },
            },
        });
        if (existingValidation) {
            const metadata = existingValidation.metadata
                ? JSON.parse(existingValidation.metadata)
                : {};
            const storedQrCode = metadata.qrCode;
            const isValidQrCode = typeof storedQrCode === 'string' && storedQrCode.length > 10;
            if (isValidQrCode) {
                this.logger.log(`Returning existing validation transaction ${existingValidation.id} with valid QR code`);
                return {
                    transactionId: existingValidation.id,
                    qrCode: storedQrCode,
                    amount: this.VALIDATION_AMOUNT,
                };
            }
            else {
                this.logger.warn(`Existing validation transaction ${existingValidation.id} has invalid QR code data: ${typeof storedQrCode} - ${storedQrCode}. Creating new payment.`);
                await this.prisma.transaction.delete({ where: { id: existingValidation.id } });
            }
        }
        try {
            this.logger.log(`Creating validation payment for user ${userId} with depixAddress: ${depixAddress}`);
            const qrCodeData = await this.pixService.generatePixQRCode(userId, {
                amount: this.VALIDATION_AMOUNT,
                depixAddress,
                description: 'Validação de conta Atlas DAO',
            });
            this.logger.log(`QR Code data received: ${JSON.stringify(qrCodeData)}`);
            this.logger.log(`QR Code value: ${qrCodeData.qrCode}`);
            this.logger.log(`🔑 Eulen Transaction ID: ${qrCodeData.transactionId}`);
            if (qrCodeData.transactionId) {
                await this.prisma.transaction.update({
                    where: { id: qrCodeData.transactionId },
                    data: {
                        externalId: qrCodeData.transactionId,
                        metadata: JSON.stringify({
                            qrCode: qrCodeData.qrCode,
                            isValidation: true,
                            depixAddress,
                            eulenTransactionId: qrCodeData.transactionId,
                        }),
                    },
                });
                const transaction = await this.prisma.transaction.findUnique({
                    where: { id: qrCodeData.transactionId },
                });
                this.logger.log(`Validation payment created for user ${userId}`);
                return {
                    transactionId: qrCodeData.transactionId,
                    qrCode: qrCodeData.qrCode,
                    amount: this.VALIDATION_AMOUNT,
                };
            }
            else {
                throw new common_1.HttpException('Failed to create transaction', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
        catch (error) {
            this.logger.error('Failed to create validation payment:', error);
            throw new common_1.HttpException('Failed to create validation payment', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async processValidationPayment(transactionId) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { user: true },
        });
        if (!transaction) {
            throw new common_1.HttpException('Transaction not found', common_1.HttpStatus.NOT_FOUND);
        }
        const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
        if (!metadata.isValidation) {
            return;
        }
        if (transaction.status !== client_1.TransactionStatus.COMPLETED) {
            return;
        }
        await this.prisma.user.update({
            where: { id: transaction.userId },
            data: {
                isAccountValidated: true,
                validationPaymentId: transactionId,
                validatedAt: new Date(),
            },
        });
        await this.initializeUserReputation(transaction.userId);
        this.logger.log(`Account validated for user ${transaction.userId}`);
    }
    async processCompletedValidations() {
        try {
            const completedValidations = await this.prisma.transaction.findMany({
                where: {
                    status: client_1.TransactionStatus.COMPLETED,
                    metadata: {
                        contains: '"isValidation":true'
                    },
                    user: {
                        isAccountValidated: false
                    }
                },
                include: { user: true }
            });
            let processedCount = 0;
            for (const transaction of completedValidations) {
                try {
                    await this.processValidationPayment(transaction.id);
                    processedCount++;
                    this.logger.log(`Processed validation for transaction ${transaction.id}`);
                }
                catch (error) {
                    this.logger.error(`Failed to process validation for transaction ${transaction.id}:`, error);
                }
            }
            if (processedCount > 0) {
                this.logger.log(`Processed ${processedCount} validation transactions`);
            }
            return { processed: processedCount };
        }
        catch (error) {
            this.logger.error('Error processing completed validations:', error);
            return { processed: 0 };
        }
    }
    async cronProcessValidations() {
        try {
            const result = await this.processCompletedValidations();
            if (result.processed > 0) {
                this.logger.log(`Cron: Processed ${result.processed} validation transactions`);
            }
        }
        catch (error) {
            this.logger.error('Error in validation processing cron job:', error);
        }
    }
    async initializeUserReputation(userId) {
        const existingReputation = await this.prisma.userReputation.findUnique({
            where: { userId },
        });
        if (!existingReputation) {
            await this.prisma.userReputation.create({
                data: {
                    userId,
                    reputationScore: 50,
                    currentDailyLimit: this.INITIAL_DAILY_LIMIT,
                    nextLimitThreshold: this.THRESHOLD_TIERS[0],
                    limitTier: 1,
                },
            });
            this.logger.log(`User reputation initialized for user ${userId}`);
        }
    }
    async updateUserReputation(userId, transactionAmount, success) {
        let reputation = await this.prisma.userReputation.findUnique({
            where: { userId },
        });
        if (!reputation) {
            await this.initializeUserReputation(userId);
            reputation = await this.prisma.userReputation.findUnique({
                where: { userId },
            });
        }
        if (!reputation)
            return;
        const updates = {};
        if (success) {
            updates.totalApprovedVolume = reputation.totalApprovedVolume + transactionAmount;
            updates.totalApprovedCount = reputation.totalApprovedCount + 1;
            const successRate = (reputation.totalApprovedCount + 1) /
                ((reputation.totalApprovedCount + 1) + reputation.totalRejectedCount);
            updates.reputationScore = Math.min(100, successRate * 100);
            if (updates.totalApprovedVolume >= reputation.nextLimitThreshold) {
                const newTier = Math.min(reputation.limitTier + 1, this.LIMIT_TIERS.length);
                updates.limitTier = newTier;
                updates.currentDailyLimit = this.LIMIT_TIERS[newTier - 1];
                updates.nextLimitThreshold = this.THRESHOLD_TIERS[newTier - 1] || this.THRESHOLD_TIERS[this.THRESHOLD_TIERS.length - 1];
                this.logger.log(`User ${userId} upgraded to tier ${newTier} with limit R$ ${updates.currentDailyLimit}`);
            }
        }
        else {
            updates.totalRejectedCount = reputation.totalRejectedCount + 1;
            const successRate = reputation.totalApprovedCount /
                (reputation.totalApprovedCount + (reputation.totalRejectedCount + 1));
            updates.reputationScore = Math.max(0, successRate * 100);
        }
        await this.prisma.userReputation.update({
            where: { userId },
            data: updates,
        });
    }
    async getUserLimitsAndReputation(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                reputation: true,
            },
        });
        if (!user) {
            throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (!user.isAccountValidated) {
            return {
                isValidated: false,
                requiresValidation: true,
                validationAmount: this.VALIDATION_AMOUNT,
            };
        }
        const reputation = user.reputation || {
            reputationScore: 0,
            currentDailyLimit: 0,
            limitTier: 0,
            totalApprovedVolume: 0,
            totalApprovedCount: 0,
            totalRejectedCount: 0,
            nextLimitThreshold: this.THRESHOLD_TIERS[0],
        };
        return {
            isValidated: true,
            validatedAt: user.validatedAt,
            limits: {
                daily: reputation.currentDailyLimit,
                tier: reputation.limitTier,
                nextThreshold: reputation.nextLimitThreshold,
                progressToNextTier: (reputation.totalApprovedVolume / reputation.nextLimitThreshold) * 100,
            },
            reputation: {
                score: reputation.reputationScore,
                approvedVolume: reputation.totalApprovedVolume,
                approvedCount: reputation.totalApprovedCount,
                rejectedCount: reputation.totalRejectedCount,
            },
        };
    }
    async adjustUserLimits(userId, dailyLimit, tier, adminNotes) {
        const reputation = await this.prisma.userReputation.findUnique({
            where: { userId },
        });
        if (!reputation) {
            await this.initializeUserReputation(userId);
        }
        const updates = {};
        if (dailyLimit !== undefined) {
            updates.currentDailyLimit = dailyLimit;
        }
        if (tier !== undefined) {
            updates.limitTier = tier;
            if (!dailyLimit) {
                updates.currentDailyLimit = this.LIMIT_TIERS[Math.min(tier - 1, this.LIMIT_TIERS.length - 1)];
            }
            updates.nextLimitThreshold = this.THRESHOLD_TIERS[Math.min(tier - 1, this.THRESHOLD_TIERS.length - 1)];
        }
        await this.prisma.userReputation.update({
            where: { userId },
            data: updates,
        });
        this.logger.log(`User ${userId} limits adjusted by admin: ${JSON.stringify(updates)}`);
    }
    async getValidationRequirements() {
        return {
            amount: this.VALIDATION_AMOUNT,
            description: 'Pagamento único de R$ 1,00 para validar sua conta',
            benefits: [
                'Gerar depósitos ilimitados',
                'Acesso completo às funcionalidades',
                'Suporte prioritário',
                'Limites aumentados progressivamente',
            ],
        };
    }
    async getValidationSettings() {
        return {
            validationEnabled: true,
            validationAmount: this.VALIDATION_AMOUNT,
            initialDailyLimit: this.INITIAL_DAILY_LIMIT,
            limitTiers: this.LIMIT_TIERS,
            thresholdTiers: this.THRESHOLD_TIERS,
        };
    }
    async updateValidationSettings(settings) {
        this.logger.log(`Validation settings update requested: ${JSON.stringify(settings)}`);
        if (settings.limitTiers && settings.thresholdTiers) {
            if (settings.limitTiers.length !== settings.thresholdTiers.length) {
                throw new common_1.HttpException('Limit tiers and threshold tiers must have the same length', common_1.HttpStatus.BAD_REQUEST);
            }
            for (const tier of settings.limitTiers) {
                if (!tier || tier <= 0) {
                    throw new common_1.HttpException('All limit tiers must be positive numbers', common_1.HttpStatus.BAD_REQUEST);
                }
            }
            for (const threshold of settings.thresholdTiers) {
                if (!threshold || threshold <= 0) {
                    throw new common_1.HttpException('All threshold tiers must be positive numbers', common_1.HttpStatus.BAD_REQUEST);
                }
            }
        }
        if (settings.validationAmount !== undefined && settings.validationAmount <= 0) {
            throw new common_1.HttpException('Validation amount must be positive', common_1.HttpStatus.BAD_REQUEST);
        }
        if (settings.initialDailyLimit !== undefined && settings.initialDailyLimit <= 0) {
            throw new common_1.HttpException('Initial daily limit must be positive', common_1.HttpStatus.BAD_REQUEST);
        }
        if (settings.limitTiers) {
            this.LIMIT_TIERS = [...settings.limitTiers];
        }
        if (settings.thresholdTiers) {
            this.THRESHOLD_TIERS = [...settings.thresholdTiers];
        }
        if (settings.validationAmount !== undefined) {
            this.VALIDATION_AMOUNT = settings.validationAmount;
        }
        if (settings.initialDailyLimit !== undefined) {
            this.INITIAL_DAILY_LIMIT = settings.initialDailyLimit;
        }
        this.logger.log('Validation settings updated successfully');
    }
    async getDetailedValidationStatus(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                reputation: true,
            },
        });
        if (!user) {
            throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
        }
        const validationTransactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                type: client_1.TransactionType.DEPOSIT,
                amount: this.VALIDATION_AMOUNT,
                description: { contains: 'Validação de conta' },
            },
            orderBy: { createdAt: 'desc' },
        });
        const completedValidations = validationTransactions.filter(t => t.status === client_1.TransactionStatus.COMPLETED);
        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAccountValidated: user.isAccountValidated,
                validationPaymentId: user.validationPaymentId,
                validatedAt: user.validatedAt,
            },
            validationAmount: this.VALIDATION_AMOUNT,
            transactions: validationTransactions.map(t => ({
                id: t.id,
                status: t.status,
                amount: t.amount,
                createdAt: t.createdAt,
                processedAt: t.processedAt,
                metadata: t.metadata ? JSON.parse(t.metadata) : null,
                externalId: t.externalId,
            })),
            completedValidations: completedValidations.length,
            shouldBeValidated: completedValidations.length > 0 && !user.isAccountValidated,
            reputation: user.reputation,
            debug: {
                hasCompletedPayments: completedValidations.length > 0,
                accountValidated: user.isAccountValidated,
                mismatch: completedValidations.length > 0 && !user.isAccountValidated,
            },
        };
    }
    async manualValidationCheck(userId) {
        this.logger.log(`Manual validation check triggered for user ${userId}`);
        const result = await this.processCompletedValidations();
        const detailedStatus = await this.getDetailedValidationStatus(userId);
        return {
            ...detailedStatus,
            manualCheckResult: result,
            timestamp: new Date().toISOString(),
        };
    }
};
exports.AccountValidationService = AccountValidationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AccountValidationService.prototype, "cronProcessValidations", null);
exports.AccountValidationService = AccountValidationService = AccountValidationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pix_service_1.PixService])
], AccountValidationService);
//# sourceMappingURL=account-validation.service.js.map