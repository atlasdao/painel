import { TransactionStatus, TransactionType, PixKeyType } from '@prisma/client';
export declare class DepositDto {
    amount: number;
    pixKey: string;
    pixKeyType?: PixKeyType;
    description?: string;
    externalId?: string;
    webhookUrl?: string;
}
export declare class WithdrawDto extends DepositDto {
}
export declare class TransferDto extends DepositDto {
    destinationPixKey: string;
}
export declare class TransactionResponseDto {
    id: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    pixKey: string;
    pixKeyType?: PixKeyType;
    externalId?: string;
    description?: string;
    metadata?: string;
    errorMessage?: string;
    currency?: string;
    createdAt: Date;
    updatedAt: Date;
    processedAt?: Date;
}
export declare class TransactionStatusDto {
    transactionId: string;
}
export declare class PaginationDto {
    skip?: number;
    take?: number;
    limit?: number;
    offset?: number;
}
export declare class TransactionFilterDto extends PaginationDto {
    status?: TransactionStatus;
    type?: TransactionType;
    startDate?: Date;
    endDate?: Date;
}
export declare class PaginatedResponseDto<T> {
    data: T[];
    total: number;
    skip: number;
    take: number;
    hasMore: boolean;
}
