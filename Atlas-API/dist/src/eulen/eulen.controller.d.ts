import { EulenService } from './eulen.service';
import { DepositDto, TransactionResponseDto } from './dto/eulen.dto';
export declare class EulenController {
    private readonly eulenService;
    constructor(eulenService: EulenService);
    ping(): Promise<{
        status: string;
        timestamp: Date;
    }>;
    deposit(depositDto: DepositDto): Promise<TransactionResponseDto>;
    getDepositStatus(transactionId: string): Promise<TransactionResponseDto>;
}
