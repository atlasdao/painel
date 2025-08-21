import { PrismaService } from '../prisma/prisma.service';
declare class UpdateMedLimitsDto {
    dailyDepositLimit?: number;
    dailyWithdrawLimit?: number;
    monthlyDepositLimit?: number;
    monthlyWithdrawLimit?: number;
    maxTransactionAmount?: number;
    requiresKyc?: boolean;
    firstDayLimit?: number;
}
export declare class MedLimitsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMedLimits(): Promise<any>;
    updateMedLimits(dto: UpdateMedLimitsDto): Promise<{
        message: string;
        limits: UpdateMedLimitsDto;
    }>;
}
export {};
