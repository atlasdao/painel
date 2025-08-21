import { PrismaService } from '../prisma/prisma.service';
export declare class TransactionCleanupService {
    private readonly prisma;
    private readonly logger;
    private readonly TRANSACTION_TIMEOUT;
    constructor(prisma: PrismaService);
    checkPendingTransactions(): Promise<void>;
    cleanupExpiredTransactions(): Promise<void>;
    manualCleanup(): Promise<number>;
    getTransactionStats(): Promise<{
        totalPending: number;
        expiredReady: number;
        recentPending: number;
        totalExpired: number;
        cutoffTime: Date;
        timeoutMinutes: number;
        monitoringFrequency: string;
    }>;
}
