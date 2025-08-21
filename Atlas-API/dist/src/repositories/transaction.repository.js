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
exports.TransactionRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const base_repository_1 = require("./base.repository");
let TransactionRepository = class TransactionRepository extends base_repository_1.AbstractBaseRepository {
    prisma;
    model;
    constructor(prisma) {
        super(prisma);
        this.prisma = prisma;
        this.model = this.prisma.transaction;
    }
    async findAll(params) {
        const { skip, take, where, orderBy } = params || {};
        return this.prisma.transaction.findMany({
            skip,
            take,
            where,
            orderBy: orderBy || { createdAt: 'desc' },
            include: {
                user: true,
                webhookEvents: true,
            },
        });
    }
    async findByExternalId(externalId) {
        return this.prisma.transaction.findUnique({
            where: { externalId },
            include: {
                user: true,
                webhookEvents: true,
            },
        });
    }
    async findByUserId(userId, params) {
        const { skip, take, status, type } = params || {};
        return this.prisma.transaction.findMany({
            skip,
            take,
            where: {
                userId,
                ...(status && { status }),
                ...(type && { type }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: true,
                webhookEvents: true,
            },
        });
    }
    async updateStatus(id, status, errorMessage) {
        return this.prisma.transaction.update({
            where: { id },
            data: {
                status,
                ...(errorMessage && { errorMessage }),
                ...(status === 'COMPLETED' && { processedAt: new Date() }),
            },
        });
    }
    async findPendingTransactions(limit = 100) {
        return this.prisma.transaction.findMany({
            where: {
                status: 'PENDING',
            },
            take: limit,
            orderBy: { createdAt: 'asc' },
            include: {
                user: true,
            },
        });
    }
    async getTransactionStats(userId) {
        const where = userId ? { userId } : {};
        const [total, pending, completed, failed, amounts] = await Promise.all([
            this.prisma.transaction.count({ where }),
            this.prisma.transaction.count({ where: { ...where, status: 'PENDING' } }),
            this.prisma.transaction.count({ where: { ...where, status: 'COMPLETED' } }),
            this.prisma.transaction.count({ where: { ...where, status: 'FAILED' } }),
            this.prisma.transaction.aggregate({
                where: { ...where, status: 'COMPLETED' },
                _sum: { amount: true },
            }),
        ]);
        return {
            total,
            pending,
            completed,
            failed,
            totalAmount: amounts._sum.amount || 0,
        };
    }
    async createWithWebhook(data, webhookUrl) {
        if (webhookUrl) {
            return this.prisma.transaction.create({
                data: {
                    ...data,
                    webhookEvents: {
                        create: {
                            url: webhookUrl,
                            payload: JSON.stringify({ transactionId: data.externalId }),
                        },
                    },
                },
                include: {
                    user: true,
                    webhookEvents: true,
                },
            });
        }
        return this.prisma.transaction.create({
            data,
            include: {
                user: true,
            },
        });
    }
    async countToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.prisma.transaction.count({
            where: {
                createdAt: {
                    gte: today,
                },
            },
        });
    }
    async sumAmount(params) {
        const where = {};
        if (params?.status)
            where.status = params.status;
        if (params?.userId)
            where.userId = params.userId;
        const result = await this.prisma.transaction.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });
        return result._sum.amount || 0;
    }
    async sumAmountToday(params) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const where = {
            createdAt: {
                gte: today,
            },
        };
        if (params?.status)
            where.status = params.status;
        if (params?.userId)
            where.userId = params.userId;
        const result = await this.prisma.transaction.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });
        return result._sum.amount || 0;
    }
    async countUsersWithMultipleTransactions() {
        const usersWithTransactions = await this.prisma.transaction.groupBy({
            by: ['userId'],
            _count: {
                userId: true,
            },
            having: {
                userId: {
                    _count: {
                        gt: 1,
                    },
                },
            },
        });
        return usersWithTransactions.length;
    }
};
exports.TransactionRepository = TransactionRepository;
exports.TransactionRepository = TransactionRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransactionRepository);
//# sourceMappingURL=transaction.repository.js.map