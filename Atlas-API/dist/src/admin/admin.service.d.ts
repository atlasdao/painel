import { UserRepository } from '../repositories/user.repository';
import { UserLimitRepository } from '../repositories/user-limit.repository';
import { LimitValidationService } from '../services/limit-validation.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
export declare class AdminService {
    private readonly userRepository;
    private readonly userLimitRepository;
    private readonly limitValidationService;
    private readonly transactionRepository;
    private readonly auditLogRepository;
    private readonly prisma;
    constructor(userRepository: UserRepository, userLimitRepository: UserLimitRepository, limitValidationService: LimitValidationService, transactionRepository: TransactionRepository, auditLogRepository: AuditLogRepository, prisma: PrismaService);
    getAllUsers(params?: {
        skip?: number;
        take?: number;
        isActive?: boolean;
    }): Promise<User[]>;
    getUserById(userId: string): Promise<User>;
    createUser(data: {
        username: string;
        email: string;
        password: string;
        role: any;
    }): Promise<User>;
    updateUserStatus(userId: string, isActive: boolean): Promise<User>;
    updateUser(userId: string, data: any): Promise<User>;
    generateUserApiKey(userId: string): Promise<{
        apiKey: string;
    }>;
    revokeUserApiKey(userId: string): Promise<void>;
    deleteUser(userId: string): Promise<void>;
    getUserStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        inactiveUsers: number;
        usersWithApiKeys: number;
    }>;
    getUserStatsById(userId: string): Promise<{
        totalTransactions: number;
        totalVolume: number;
        pendingTransactions: number;
        completedTransactions: number;
    }>;
    getSystemStats(): Promise<{
        users: any;
        transactions: any;
        revenue: any;
    }>;
    getAuditLogs(params?: {
        userId?: string;
        action?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
        skip?: number;
        take?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        requestBody: string | null;
        userId: string | null;
        action: string;
        resource: string;
        resourceId: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        responseBody: string | null;
        statusCode: number | null;
        duration: number | null;
        transactionId: string | null;
    }[]>;
    getAuditStats(startDate?: Date, endDate?: Date): Promise<{
        action: string;
        count: number;
    }[]>;
    getAllTransactions(params?: {
        skip?: number;
        take?: number;
        status?: any;
        type?: any;
        userId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        status: import("@prisma/client").$Enums.TransactionStatus;
        amount: number;
        currency: string;
        pixKey: string | null;
        pixKeyType: import("@prisma/client").$Enums.PixKeyType | null;
        externalId: string | null;
        metadata: string | null;
        errorMessage: string | null;
        processedAt: Date | null;
        userId: string;
    }[]>;
    updateTransactionStatus(transactionId: string, status: any, errorMessage?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        status: import("@prisma/client").$Enums.TransactionStatus;
        amount: number;
        currency: string;
        pixKey: string | null;
        pixKeyType: import("@prisma/client").$Enums.PixKeyType | null;
        externalId: string | null;
        metadata: string | null;
        errorMessage: string | null;
        processedAt: Date | null;
        userId: string;
    }>;
    toggleCommerceMode(userId: string, enable: boolean): Promise<{
        id: string;
        email: string;
        username: string;
        commerceMode: boolean;
        commerceModeActivatedAt: Date | null;
        paymentLinksEnabled: boolean;
    }>;
    togglePaymentLinks(userId: string, enable: boolean): Promise<{
        id: string;
        email: string;
        username: string;
        commerceMode: boolean;
        paymentLinksEnabled: boolean;
    }>;
    getDashboardData(limit?: number): Promise<{
        stats: {
            users: any;
            transactions: any;
            revenue: any;
        };
        recentTransactions: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            type: import("@prisma/client").$Enums.TransactionType;
            status: import("@prisma/client").$Enums.TransactionStatus;
            amount: number;
            currency: string;
            pixKey: string | null;
            pixKeyType: import("@prisma/client").$Enums.PixKeyType | null;
            externalId: string | null;
            metadata: string | null;
            errorMessage: string | null;
            processedAt: Date | null;
            userId: string;
        }[];
        recentUsers: {
            id: string;
            email: string;
            username: string;
            password: string;
            apiKey: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            isActive: boolean;
            passwordResetCode: string | null;
            passwordResetExpires: Date | null;
            passwordResetAttempts: number;
            isAccountValidated: boolean;
            validationPaymentId: string | null;
            validatedAt: Date | null;
            commerceMode: boolean;
            commerceModeActivatedAt: Date | null;
            paymentLinksEnabled: boolean;
            apiDailyLimit: number;
            apiMonthlyLimit: number;
            createdAt: Date;
            updatedAt: Date;
            lastLoginAt: Date | null;
        }[];
        auditStats: {
            action: string;
            count: number;
        }[];
        timestamp: Date;
    }>;
    getDashboardStats(): Promise<any>;
    getAllUsersWithLimits(params?: {
        skip?: number;
        take?: number;
        isFirstDay?: boolean;
        isKycVerified?: boolean;
        isHighRiskUser?: boolean;
    }): Promise<{
        users: (import("@prisma/client").UserLimit & {
            user: {
                email: string;
                username: string;
                createdAt: Date;
            };
        })[];
        total: number;
    }>;
    getUserLimits(userId: string): Promise<{
        limits: any;
        dailyUsage: any;
        monthlyUsage: any;
        isFirstDay: boolean;
        isKycVerified: boolean;
        isHighRiskUser: boolean;
    }>;
    updateUserLimits(userId: string, updates: {
        dailyDepositLimit?: number;
        dailyWithdrawLimit?: number;
        dailyTransferLimit?: number;
        maxDepositPerTx?: number;
        maxWithdrawPerTx?: number;
        maxTransferPerTx?: number;
        monthlyDepositLimit?: number;
        monthlyWithdrawLimit?: number;
        monthlyTransferLimit?: number;
        isKycVerified?: boolean;
        isHighRiskUser?: boolean;
        notes?: string;
    }, adminId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        dailyDepositLimit: number;
        dailyWithdrawLimit: number;
        dailyTransferLimit: number;
        maxDepositPerTx: number;
        maxWithdrawPerTx: number;
        maxTransferPerTx: number;
        monthlyDepositLimit: number;
        monthlyWithdrawLimit: number;
        monthlyTransferLimit: number;
        isFirstDay: boolean;
        isKycVerified: boolean;
        isHighRiskUser: boolean;
        lastLimitUpdate: Date;
        updatedByAdminId: string | null;
        notes: string | null;
    }>;
    resetUserFirstDay(userId: string, adminId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        dailyDepositLimit: number;
        dailyWithdrawLimit: number;
        dailyTransferLimit: number;
        maxDepositPerTx: number;
        maxWithdrawPerTx: number;
        maxTransferPerTx: number;
        monthlyDepositLimit: number;
        monthlyWithdrawLimit: number;
        monthlyTransferLimit: number;
        isFirstDay: boolean;
        isKycVerified: boolean;
        isHighRiskUser: boolean;
        lastLimitUpdate: Date;
        updatedByAdminId: string | null;
        notes: string | null;
    }>;
    applyKycLimits(userId: string, adminId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        dailyDepositLimit: number;
        dailyWithdrawLimit: number;
        dailyTransferLimit: number;
        maxDepositPerTx: number;
        maxWithdrawPerTx: number;
        maxTransferPerTx: number;
        monthlyDepositLimit: number;
        monthlyWithdrawLimit: number;
        monthlyTransferLimit: number;
        isFirstDay: boolean;
        isKycVerified: boolean;
        isHighRiskUser: boolean;
        lastLimitUpdate: Date;
        updatedByAdminId: string | null;
        notes: string | null;
    }>;
    updateEulenToken(token: string): Promise<{
        message: string;
    }>;
}
