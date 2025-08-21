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
var TransactionCleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionCleanupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let TransactionCleanupService = TransactionCleanupService_1 = class TransactionCleanupService {
    prisma;
    logger = new common_1.Logger(TransactionCleanupService_1.name);
    TRANSACTION_TIMEOUT = 28 * 60 * 1000;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkPendingTransactions() {
        try {
            const cutoffTime = new Date(Date.now() - this.TRANSACTION_TIMEOUT);
            const expiredTransactions = await this.prisma.transaction.findMany({
                where: {
                    status: client_1.TransactionStatus.PENDING,
                    createdAt: {
                        lt: cutoffTime,
                    },
                },
            });
            if (expiredTransactions.length === 0) {
                const now = new Date();
                if (now.getMinutes() % 5 === 0) {
                    this.logger.log('No expired transactions found (checked every minute)');
                }
                return;
            }
            this.logger.log(`Found ${expiredTransactions.length} expired transactions to cancel`);
            const updateResult = await this.prisma.transaction.updateMany({
                where: {
                    status: client_1.TransactionStatus.PENDING,
                    createdAt: {
                        lt: cutoffTime,
                    },
                },
                data: {
                    status: client_1.TransactionStatus.EXPIRED,
                    errorMessage: 'Transaction expired after 28 minutes',
                    processedAt: new Date(),
                },
            });
            this.logger.log(`Successfully expired ${updateResult.count} transactions`);
            expiredTransactions.forEach(transaction => {
                this.logger.log(`Expired transaction: ${transaction.id} (User: ${transaction.userId}, Amount: ${transaction.amount}, Age: ${Math.floor((Date.now() - transaction.createdAt.getTime()) / 1000 / 60)} minutes)`);
            });
        }
        catch (error) {
            this.logger.error('Error during transaction cleanup:', error);
        }
    }
    async cleanupExpiredTransactions() {
        this.logger.log('Running comprehensive cleanup check (every 5 minutes)...');
        try {
            const cutoffTime = new Date(Date.now() - this.TRANSACTION_TIMEOUT);
            const expiredCount = await this.prisma.transaction.count({
                where: {
                    status: client_1.TransactionStatus.PENDING,
                    createdAt: {
                        lt: cutoffTime,
                    },
                },
            });
            if (expiredCount > 0) {
                this.logger.warn(`Found ${expiredCount} pending transactions that should have been expired - running additional cleanup`);
                const updateResult = await this.prisma.transaction.updateMany({
                    where: {
                        status: client_1.TransactionStatus.PENDING,
                        createdAt: {
                            lt: cutoffTime,
                        },
                    },
                    data: {
                        status: client_1.TransactionStatus.EXPIRED,
                        errorMessage: 'Transaction expired after 28 minutes (backup cleanup)',
                        processedAt: new Date(),
                    },
                });
                this.logger.log(`Backup cleanup processed ${updateResult.count} transactions`);
            }
            else {
                this.logger.log('Comprehensive cleanup check: all transactions properly managed');
            }
        }
        catch (error) {
            this.logger.error('Error during comprehensive cleanup:', error);
        }
    }
    async manualCleanup() {
        this.logger.log('Manual cleanup triggered');
        const cutoffTime = new Date(Date.now() - this.TRANSACTION_TIMEOUT);
        const result = await this.prisma.transaction.updateMany({
            where: {
                status: client_1.TransactionStatus.PENDING,
                createdAt: {
                    lt: cutoffTime,
                },
            },
            data: {
                status: client_1.TransactionStatus.EXPIRED,
                errorMessage: 'Transaction expired after 28 minutes (manual cleanup)',
                processedAt: new Date(),
            },
        });
        this.logger.log(`Manual cleanup completed: ${result.count} transactions expired`);
        return result.count;
    }
    async getTransactionStats() {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - this.TRANSACTION_TIMEOUT);
        const [total, expired, recent, totalExpired] = await Promise.all([
            this.prisma.transaction.count({
                where: { status: client_1.TransactionStatus.PENDING },
            }),
            this.prisma.transaction.count({
                where: {
                    status: client_1.TransactionStatus.PENDING,
                    createdAt: { lt: cutoffTime },
                },
            }),
            this.prisma.transaction.count({
                where: {
                    status: client_1.TransactionStatus.PENDING,
                    createdAt: { gte: cutoffTime },
                },
            }),
            this.prisma.transaction.count({
                where: { status: client_1.TransactionStatus.EXPIRED },
            }),
        ]);
        return {
            totalPending: total,
            expiredReady: expired,
            recentPending: recent,
            totalExpired,
            cutoffTime,
            timeoutMinutes: this.TRANSACTION_TIMEOUT / (60 * 1000),
            monitoringFrequency: 'Every minute with 5-minute backup',
        };
    }
};
exports.TransactionCleanupService = TransactionCleanupService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TransactionCleanupService.prototype, "checkPendingTransactions", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TransactionCleanupService.prototype, "cleanupExpiredTransactions", null);
exports.TransactionCleanupService = TransactionCleanupService = TransactionCleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransactionCleanupService);
//# sourceMappingURL=transaction-cleanup.service.js.map