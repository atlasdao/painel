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
exports.AuditLogRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const base_repository_1 = require("./base.repository");
let AuditLogRepository = class AuditLogRepository extends base_repository_1.AbstractBaseRepository {
    prisma;
    model;
    constructor(prisma) {
        super(prisma);
        this.prisma = prisma;
        this.model = this.prisma.auditLog;
    }
    async createLog(params) {
        const { requestBody, responseBody, ...data } = params;
        return this.prisma.auditLog.create({
            data: {
                ...data,
                userId: data.userId || null,
                requestBody: requestBody ? JSON.stringify(requestBody) : null,
                responseBody: responseBody ? JSON.stringify(responseBody) : null,
            },
        });
    }
    async findByUserId(userId, params) {
        const { skip, take, action, startDate, endDate } = params || {};
        return this.prisma.auditLog.findMany({
            skip,
            take,
            where: {
                userId,
                ...(action && { action }),
                ...(startDate || endDate ? {
                    createdAt: {
                        ...(startDate && { gte: startDate }),
                        ...(endDate && { lte: endDate }),
                    },
                } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: true,
                transaction: true,
            },
        });
    }
    async findByTransactionId(transactionId) {
        return this.prisma.auditLog.findMany({
            where: { transactionId },
            orderBy: { createdAt: 'asc' },
            include: {
                user: true,
            },
        });
    }
    async findByResource(resource, resourceId, params) {
        const { skip, take } = params || {};
        return this.prisma.auditLog.findMany({
            skip,
            take,
            where: {
                resource,
                ...(resourceId && { resourceId }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: true,
                transaction: true,
            },
        });
    }
    async getActionStats(startDate, endDate) {
        const where = startDate || endDate ? {
            createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
            },
        } : {};
        const result = await this.prisma.auditLog.groupBy({
            by: ['action'],
            where,
            _count: {
                action: true,
            },
            orderBy: {
                _count: {
                    action: 'desc',
                },
            },
        });
        return result.map(item => ({
            action: item.action,
            count: item._count.action,
        }));
    }
};
exports.AuditLogRepository = AuditLogRepository;
exports.AuditLogRepository = AuditLogRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditLogRepository);
//# sourceMappingURL=audit-log.repository.js.map