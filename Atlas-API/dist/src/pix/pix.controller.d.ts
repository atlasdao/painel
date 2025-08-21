import { PixService } from './pix.service';
import { DepositDto, WithdrawDto, TransferDto, TransactionResponseDto, TransactionFilterDto } from '../eulen/dto/eulen.dto';
export declare class PixController {
    private readonly pixService;
    constructor(pixService: PixService);
    testEulenLogs(): Promise<{
        status: string;
        timestamp: Date;
        eulenStatus?: any;
    }>;
    createDeposit(req: any, depositDto: DepositDto): Promise<TransactionResponseDto>;
    createWithdraw(req: any, withdrawDto: WithdrawDto): Promise<TransactionResponseDto>;
    createTransfer(req: any, transferDto: TransferDto): Promise<TransactionResponseDto>;
    getTransactions(req: any, filters: TransactionFilterDto): Promise<TransactionResponseDto[]>;
    getTransaction(req: any, transactionId: string): Promise<TransactionResponseDto>;
    getTransactionStatus(req: any, transactionId: string): Promise<TransactionResponseDto>;
    generateQRCode(req: any, data: {
        amount: number;
        depixAddress: string;
        description?: string;
        expirationMinutes?: number;
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
    getBalance(req: any): Promise<{
        available: number;
        pending: number;
        total: number;
    }>;
    checkDepositStatus(req: any, transactionId: string): Promise<any>;
    ping(): Promise<{
        status: string;
        timestamp: Date;
        eulenStatus?: any;
    }>;
    getUserLimits(req: any): Promise<any>;
}
