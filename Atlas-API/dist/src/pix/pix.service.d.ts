import { EulenClientService } from '../services/eulen-client.service';
import { LimitValidationService } from '../services/limit-validation.service';
import { LiquidValidationService } from '../services/liquid-validation.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { PrismaService } from '../prisma/prisma.service';
import { DepositDto, WithdrawDto, TransferDto, TransactionResponseDto } from '../eulen/dto/eulen.dto';
import { TransactionType, TransactionStatus } from '@prisma/client';
export declare class PixService {
    private readonly eulenClient;
    private readonly limitValidationService;
    private readonly liquidValidation;
    private readonly transactionRepository;
    private readonly auditLogRepository;
    private readonly prisma;
    private readonly logger;
    constructor(eulenClient: EulenClientService, limitValidationService: LimitValidationService, liquidValidation: LiquidValidationService, transactionRepository: TransactionRepository, auditLogRepository: AuditLogRepository, prisma: PrismaService);
    createDeposit(userId: string, depositDto: DepositDto): Promise<TransactionResponseDto>;
    createWithdraw(userId: string, withdrawDto: WithdrawDto): Promise<TransactionResponseDto>;
    createTransfer(userId: string, transferDto: TransferDto): Promise<TransactionResponseDto>;
    getTransactionStatus(userId: string, transactionId: string): Promise<TransactionResponseDto>;
    getUserTransactions(userId: string, filters?: {
        status?: TransactionStatus;
        type?: TransactionType;
        skip?: number;
        take?: number;
    }): Promise<TransactionResponseDto[]>;
    generatePixQRCode(userId: string, data: {
        amount: number;
        depixAddress: string;
        description?: string;
        expirationMinutes?: number;
        payerCpfCnpj?: string;
    }): Promise<{
        qrCode: string;
        qrCodeImage: string;
        transactionId: string;
    }>;
    validatePixKey(pixKey: string): Promise<{
        valid: boolean;
        keyType?: string;
        ownerName?: string;
    }>;
    getBalance(userId: string): Promise<{
        available: number;
        pending: number;
        total: number;
    }>;
    checkDepositStatus(userId: string, transactionId: string): Promise<any>;
    pingEulenAPI(): Promise<{
        status: string;
        timestamp: Date;
        eulenStatus?: any;
    }>;
    getUserLimits(userId: string): Promise<any>;
    private getStatusMessage;
    private mapTransactionToResponse;
    private mapEulenStatus;
}
