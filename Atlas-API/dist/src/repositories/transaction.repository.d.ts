import { Transaction, Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AbstractBaseRepository } from './base.repository';
export declare class TransactionRepository extends AbstractBaseRepository<Transaction> {
    protected readonly prisma: PrismaService;
    protected model: any;
    constructor(prisma: PrismaService);
    findAll(params?: {
        skip?: number;
        take?: number;
        where?: any;
        orderBy?: any;
    }): Promise<Transaction[]>;
    findByExternalId(externalId: string): Promise<Transaction | null>;
    findByUserId(userId: string, params?: {
        skip?: number;
        take?: number;
        status?: TransactionStatus;
        type?: TransactionType;
    }): Promise<Transaction[]>;
    updateStatus(id: string, status: TransactionStatus, errorMessage?: string): Promise<Transaction>;
    findPendingTransactions(limit?: number): Promise<Transaction[]>;
    getTransactionStats(userId?: string): Promise<{
        total: number;
        pending: number;
        completed: number;
        failed: number;
        totalAmount: number;
    }>;
    createWithWebhook(data: Prisma.TransactionCreateInput, webhookUrl?: string): Promise<Transaction>;
    countToday(): Promise<number>;
    sumAmount(params?: {
        status?: TransactionStatus;
        userId?: string;
    }): Promise<number>;
    sumAmountToday(params?: {
        status?: TransactionStatus;
        userId?: string;
    }): Promise<number>;
    countUsersWithMultipleTransactions(): Promise<number>;
}
