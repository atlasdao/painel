import { DepositDto, TransactionResponseDto } from './dto/eulen.dto';
export declare class EulenService {
    ping(): Promise<{
        status: string;
        timestamp: Date;
    }>;
    deposit(depositDto: DepositDto): Promise<TransactionResponseDto>;
    getDepositStatus(transactionId: string): Promise<TransactionResponseDto>;
}
