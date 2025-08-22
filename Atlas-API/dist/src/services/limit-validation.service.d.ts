import { UserLimitRepository } from '../repositories/user-limit.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';
export interface LimitValidationResult {
    allowed: boolean;
    reason?: string;
    currentUsage?: {
        daily: number;
        monthly: number;
    };
    limits?: {
        dailyLimit: number;
        monthlyLimit: number;
        perTransactionLimit: number;
    };
}
export declare class LimitValidationService {
    private readonly userLimitRepository;
    private readonly prisma;
    constructor(userLimitRepository: UserLimitRepository, prisma: PrismaService);
    validateTransactionLimits(userId: string, transactionType: TransactionType, amount: number): Promise<LimitValidationResult>;
    validateAndThrow(userId: string, transactionType: TransactionType, amount: number): Promise<void>;
    getUserLimitsSummary(userId: string): Promise<{
        limits: any;
        dailyUsage: any;
        monthlyUsage: any;
        isFirstDay: boolean;
        isKycVerified: boolean;
        isHighRiskUser: boolean;
    }>;
    processSuccessfulTransaction(userId: string, transactionType: TransactionType): Promise<void>;
    validateWithdrawLimit(userId: string, amount: number): Promise<void>;
    private isAccountValidationRequired;
}
