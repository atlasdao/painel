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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const user_repository_1 = require("../repositories/user.repository");
const user_limit_repository_1 = require("../repositories/user-limit.repository");
const limit_validation_service_1 = require("../services/limit-validation.service");
const transaction_repository_1 = require("../repositories/transaction.repository");
const audit_log_repository_1 = require("../repositories/audit-log.repository");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AdminService = class AdminService {
    userRepository;
    userLimitRepository;
    limitValidationService;
    transactionRepository;
    auditLogRepository;
    prisma;
    constructor(userRepository, userLimitRepository, limitValidationService, transactionRepository, auditLogRepository, prisma) {
        this.userRepository = userRepository;
        this.userLimitRepository = userLimitRepository;
        this.limitValidationService = limitValidationService;
        this.transactionRepository = transactionRepository;
        this.auditLogRepository = auditLogRepository;
        this.prisma = prisma;
    }
    async getAllUsers(params) {
        if (params?.isActive !== undefined) {
            return this.userRepository.findActiveUsers(params);
        }
        return this.userRepository.findAll(params);
    }
    async getUserById(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateUserStatus(userId, isActive) {
        const user = await this.getUserById(userId);
        return this.userRepository.update(userId, { isActive });
    }
    async updateUser(userId, data) {
        const user = await this.getUserById(userId);
        return this.userRepository.update(userId, data);
    }
    async generateUserApiKey(userId) {
        const user = await this.getUserById(userId);
        if (user.apiKey) {
            throw new common_1.ConflictException('User already has an API key');
        }
        const apiKey = `atlas_${Buffer.from(require('crypto').randomBytes(32)).toString('base64url')}`;
        await this.userRepository.update(userId, { apiKey });
        await this.prisma.apiKeyRequest.create({
            data: {
                userId,
                usageReason: 'Generated directly by admin',
                serviceUrl: 'Internal',
                estimatedVolume: 'N/A',
                usageType: 'SINGLE_CPF',
                status: 'APPROVED',
                generatedApiKey: apiKey,
                approvedAt: new Date(),
                approvedBy: 'Admin',
            },
        });
        return { apiKey };
    }
    async revokeUserApiKey(userId) {
        const user = await this.getUserById(userId);
        const apiKeyRequest = await this.prisma.apiKeyRequest.findFirst({
            where: {
                userId,
                status: 'APPROVED',
                generatedApiKey: { not: null },
            },
        });
        if (apiKeyRequest) {
            await this.prisma.apiKeyRequest.update({
                where: { id: apiKeyRequest.id },
                data: {
                    status: 'REVOKED',
                    updatedAt: new Date(),
                },
            });
        }
        await this.userRepository.update(userId, { apiKey: null });
    }
    async deleteUser(userId) {
        const user = await this.getUserById(userId);
        const pendingTransactions = await this.transactionRepository.findByUserId(userId, {
            status: client_1.TransactionStatus.PENDING,
        });
        if (pendingTransactions && pendingTransactions.length > 0) {
            throw new common_1.ForbiddenException('Cannot delete user with pending transactions');
        }
        await this.userRepository.delete(userId);
    }
    async getUserStats() {
        const [total, active] = await Promise.all([
            this.userRepository.count(),
            this.userRepository.count({ isActive: true }),
        ]);
        const allUsers = await this.userRepository.findAll();
        const usersWithApiKeys = allUsers.filter(u => u.apiKey).length;
        return {
            totalUsers: total,
            activeUsers: active,
            inactiveUsers: total - active,
            usersWithApiKeys,
        };
    }
    async getUserStatsById(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const transactions = await this.transactionRepository.findByUserId(userId);
        const pendingTransactions = transactions.filter(t => t.status === 'PENDING' || t.status === 'PROCESSING').length;
        const completedTransactions = transactions.filter(t => t.status === 'COMPLETED').length;
        const totalVolume = transactions
            .filter(t => t.status === 'COMPLETED')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        return {
            totalTransactions: transactions.length,
            totalVolume,
            pendingTransactions,
            completedTransactions,
        };
    }
    async getSystemStats() {
        const userStats = await this.getUserStats();
        const transactionStats = await this.transactionRepository.getTransactionStats();
        return {
            users: userStats,
            transactions: transactionStats,
            revenue: {
                total: transactionStats.totalAmount,
                pending: 0,
                completed: transactionStats.totalAmount,
            },
        };
    }
    async getAuditLogs(params) {
        if (params?.userId) {
            return this.auditLogRepository.findByUserId(params.userId, params);
        }
        if (params?.resource) {
            return this.auditLogRepository.findByResource(params.resource, undefined, params);
        }
        return this.auditLogRepository.findAll(params);
    }
    async getAuditStats(startDate, endDate) {
        return this.auditLogRepository.getActionStats(startDate, endDate);
    }
    async getAllTransactions(params) {
        if (params?.userId) {
            return this.transactionRepository.findByUserId(params.userId, params);
        }
        return this.transactionRepository.findAll(params);
    }
    async updateTransactionStatus(transactionId, status, errorMessage) {
        const transaction = await this.transactionRepository.findById(transactionId);
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        return this.transactionRepository.updateStatus(transactionId, status, errorMessage);
    }
    async getDashboardData(limit = 5) {
        const [stats, recentTransactions, recentUsers, auditStats] = await Promise.all([
            this.getSystemStats(),
            this.transactionRepository.findAll({ take: limit }),
            this.userRepository.findAll({ take: limit }),
            this.auditLogRepository.getActionStats(),
        ]);
        return {
            stats,
            recentTransactions,
            recentUsers,
            auditStats,
            timestamp: new Date(),
        };
    }
    async getDashboardStats() {
        const [totalUsers, activeUsers, newUsersToday] = await Promise.all([
            this.userRepository.count(),
            this.userRepository.count({ isActive: true }),
            this.userRepository.countNewUsersToday(),
        ]);
        const [totalTransactions, todayTransactions, pendingTransactions, completedTransactions, failedTransactions, expiredTransactions, totalVolume, todayVolume,] = await Promise.all([
            this.transactionRepository.count(),
            this.transactionRepository.countToday(),
            this.transactionRepository.count({ status: client_1.TransactionStatus.PENDING }),
            this.transactionRepository.count({ status: client_1.TransactionStatus.COMPLETED }),
            this.transactionRepository.count({ status: client_1.TransactionStatus.FAILED }),
            this.transactionRepository.count({ status: client_1.TransactionStatus.EXPIRED }),
            this.transactionRepository.sumAmount({ status: client_1.TransactionStatus.COMPLETED }),
            this.transactionRepository.sumAmountToday({ status: client_1.TransactionStatus.COMPLETED }),
        ]);
        const successRate = totalTransactions > 0
            ? Math.round((completedTransactions / totalTransactions) * 100)
            : 0;
        const usersWithMultipleTransactions = await this.transactionRepository.countUsersWithMultipleTransactions();
        const retentionRate = activeUsers > 0
            ? Math.round((usersWithMultipleTransactions / activeUsers) * 100)
            : 0;
        return {
            totalUsers,
            activeUsers,
            newUsersToday: newUsersToday || 0,
            retentionRate,
            totalTransactions,
            todayTransactions: todayTransactions || 0,
            pendingTransactions,
            completedTransactions,
            failedTransactions: failedTransactions + expiredTransactions,
            totalVolume: totalVolume || 0,
            todayVolume: todayVolume || 0,
            successRate,
        };
    }
    async getAllUsersWithLimits(params) {
        return this.userLimitRepository.getAllUsersWithLimits(params);
    }
    async getUserLimits(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.limitValidationService.getUserLimitsSummary(userId);
    }
    async updateUserLimits(userId, updates, adminId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.auditLogRepository.createLog({
            userId: adminId,
            action: 'UPDATE_USER_LIMITS',
            resource: 'user_limits',
            resourceId: userId,
            requestBody: updates,
        });
        return this.userLimitRepository.updateUserLimits(userId, updates, adminId);
    }
    async resetUserFirstDay(userId, adminId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.auditLogRepository.createLog({
            userId: adminId,
            action: 'RESET_USER_FIRST_DAY',
            resource: 'user_limits',
            resourceId: userId,
        });
        return this.userLimitRepository.updateUserLimits(userId, {
            isFirstDay: true,
            dailyDepositLimit: 500.00,
            dailyWithdrawLimit: 500.00,
            dailyTransferLimit: 500.00,
            notes: 'First day status reset by admin',
        }, adminId);
    }
    async applyKycLimits(userId, adminId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.auditLogRepository.createLog({
            userId: adminId,
            action: 'APPLY_KYC_LIMITS',
            resource: 'user_limits',
            resourceId: userId,
        });
        return this.userLimitRepository.updateUserLimits(userId, {
            isKycVerified: true,
            dailyDepositLimit: 10000.00,
            dailyWithdrawLimit: 10000.00,
            dailyTransferLimit: 10000.00,
            maxDepositPerTx: 10000.00,
            maxWithdrawPerTx: 10000.00,
            maxTransferPerTx: 10000.00,
            monthlyDepositLimit: 100000.00,
            monthlyWithdrawLimit: 100000.00,
            monthlyTransferLimit: 100000.00,
            notes: 'KYC verified limits applied by admin',
        }, adminId);
    }
    async updateEulenToken(token) {
        if (!token || !token.trim()) {
            throw new Error('Token cannot be empty');
        }
        if (!token.startsWith('eyJ')) {
            throw new Error('Invalid JWT token format');
        }
        try {
            await this.prisma.systemSettings.upsert({
                where: { key: 'EULEN_API_TOKEN' },
                update: {
                    value: token.trim(),
                    updatedAt: new Date(),
                },
                create: {
                    key: 'EULEN_API_TOKEN',
                    value: token.trim(),
                },
            });
            return { message: 'Token Eulen atualizado com sucesso!' };
        }
        catch (error) {
            console.error('Error updating Eulen token:', error);
            throw new Error('Erro ao salvar token no banco de dados');
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_repository_1.UserRepository,
        user_limit_repository_1.UserLimitRepository,
        limit_validation_service_1.LimitValidationService,
        transaction_repository_1.TransactionRepository,
        audit_log_repository_1.AuditLogRepository,
        prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map