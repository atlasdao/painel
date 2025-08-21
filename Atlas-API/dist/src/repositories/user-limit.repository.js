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
exports.UserLimitRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const base_repository_1 = require("./base.repository");
let UserLimitRepository = class UserLimitRepository extends base_repository_1.AbstractBaseRepository {
    model;
    constructor(prisma) {
        super(prisma);
        this.model = prisma.userLimit;
    }
    async getOrCreateUserLimits(userId) {
        let limits = await this.prisma.userLimit.findUnique({
            where: { userId },
        });
        if (!limits) {
            limits = await this.prisma.userLimit.create({
                data: {
                    userId,
                    dailyDepositLimit: 500.00,
                    dailyWithdrawLimit: 500.00,
                    dailyTransferLimit: 500.00,
                    maxDepositPerTx: 5000.00,
                    maxWithdrawPerTx: 5000.00,
                    maxTransferPerTx: 5000.00,
                    monthlyDepositLimit: 50000.00,
                    monthlyWithdrawLimit: 50000.00,
                    monthlyTransferLimit: 50000.00,
                    isFirstDay: true,
                    isKycVerified: false,
                    isHighRiskUser: false,
                },
            });
        }
        return limits;
    }
    async updateUserLimits(userId, updates, adminId) {
        return this.prisma.userLimit.upsert({
            where: { userId },
            update: {
                ...updates,
                lastLimitUpdate: new Date(),
                updatedByAdminId: adminId,
            },
            create: {
                userId,
                ...updates,
                lastLimitUpdate: new Date(),
                updatedByAdminId: adminId,
            },
        });
    }
    async getUserDailyUsage(userId) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: {
                    in: ['COMPLETED', 'PROCESSING'],
                },
            },
            select: {
                type: true,
                amount: true,
            },
        });
        return {
            depositToday: transactions
                .filter(t => t.type === 'DEPOSIT')
                .reduce((sum, t) => sum + t.amount, 0),
            withdrawToday: transactions
                .filter(t => t.type === 'WITHDRAW')
                .reduce((sum, t) => sum + t.amount, 0),
            transferToday: transactions
                .filter(t => t.type === 'TRANSFER')
                .reduce((sum, t) => sum + t.amount, 0),
        };
    }
    async getUserMonthlyUsage(userId) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);
        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
                status: {
                    in: ['COMPLETED', 'PROCESSING'],
                },
            },
            select: {
                type: true,
                amount: true,
            },
        });
        return {
            depositThisMonth: transactions
                .filter(t => t.type === 'DEPOSIT')
                .reduce((sum, t) => sum + t.amount, 0),
            withdrawThisMonth: transactions
                .filter(t => t.type === 'WITHDRAW')
                .reduce((sum, t) => sum + t.amount, 0),
            transferThisMonth: transactions
                .filter(t => t.type === 'TRANSFER')
                .reduce((sum, t) => sum + t.amount, 0),
        };
    }
    async markUserAsNotFirstDay(userId) {
        await this.prisma.userLimit.update({
            where: { userId },
            data: {
                isFirstDay: false,
                dailyDepositLimit: 5000.00,
                dailyWithdrawLimit: 5000.00,
                dailyTransferLimit: 5000.00,
            },
        });
    }
    async getAllUsersWithLimits(params) {
        const where = {};
        if (params?.isFirstDay !== undefined) {
            where.isFirstDay = params.isFirstDay;
        }
        if (params?.isKycVerified !== undefined) {
            where.isKycVerified = params.isKycVerified;
        }
        if (params?.isHighRiskUser !== undefined) {
            where.isHighRiskUser = params.isHighRiskUser;
        }
        const [users, total] = await Promise.all([
            this.prisma.userLimit.findMany({
                where,
                include: {
                    user: {
                        select: {
                            email: true,
                            username: true,
                            createdAt: true,
                        },
                    },
                },
                skip: params?.skip || 0,
                take: params?.take || 50,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.userLimit.count({ where }),
        ]);
        return { users, total };
    }
};
exports.UserLimitRepository = UserLimitRepository;
exports.UserLimitRepository = UserLimitRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserLimitRepository);
//# sourceMappingURL=user-limit.repository.js.map