import { ConfigService } from '@nestjs/config';
import { RateLimiterService } from './rate-limiter.service';
import { PrismaService } from '../prisma/prisma.service';
interface DepositResponse {
    response: {
        id: string;
        qrCopyPaste: string;
        qrImageUrl: string;
    };
    async: boolean;
}
export declare class EulenClientService {
    private readonly configService;
    private readonly rateLimiter;
    private readonly prisma;
    private readonly logger;
    private readonly client;
    constructor(configService: ConfigService, rateLimiter: RateLimiterService, prisma: PrismaService);
    private getEulenToken;
    private generateNonce;
    private handleApiError;
    ping(): Promise<any>;
    createDeposit(data: {
        amount: number;
        pixKey: string;
        description?: string;
        userFullName?: string;
        userTaxNumber?: string;
    }): Promise<DepositResponse>;
    getDepositStatus(transactionId: string): Promise<any>;
    createWithdraw(data: {
        amount: number;
        pixKey: string;
        description?: string;
    }): Promise<any>;
    getWithdrawStatus(transactionId: string): Promise<any>;
    getBalance(): Promise<any>;
    getTransactions(params?: {
        limit?: number;
        offset?: number;
        startDate?: string;
        endDate?: string;
    }): Promise<any>;
    generatePixQRCode(data: {
        amount: number;
        depixAddress: string;
        description?: string;
    }): Promise<any>;
    validatePixKey(pixKey: string): Promise<any>;
}
export {};
