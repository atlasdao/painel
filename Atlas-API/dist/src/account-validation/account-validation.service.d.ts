import { PrismaService } from '../prisma/prisma.service';
import { PixService } from '../pix/pix.service';
import { LiquidValidationService } from '../services/liquid-validation.service';
export declare class AccountValidationService {
    private readonly prisma;
    private readonly pixService;
    private readonly liquidValidation;
    private readonly logger;
    private readonly VALIDATION_AMOUNT;
    private readonly INITIAL_DAILY_LIMIT;
    private readonly LIMIT_TIERS;
    private readonly THRESHOLD_TIERS;
    constructor(prisma: PrismaService, pixService: PixService, liquidValidation: LiquidValidationService);
    private getValidationAmount;
    checkValidationStatus(userId: string): Promise<{
        isValidated: boolean;
        validationPaymentId?: string;
        validatedAt?: Date;
        validationQrCode?: string;
        requiresValidation?: boolean;
    }>;
    createValidationPayment(userId: string, depixAddress: string): Promise<{
        transactionId: string;
        qrCode: string;
        amount: number;
    }>;
    processValidationPayment(transactionId: string): Promise<void>;
    processCompletedValidations(): Promise<{
        processed: number;
    }>;
    cronProcessValidations(): Promise<void>;
    initializeUserReputation(userId: string): Promise<void>;
    updateUserReputation(userId: string, transactionAmount: number, success: boolean): Promise<void>;
    getUserLimitsAndReputation(userId: string): Promise<any>;
    adjustUserLimits(userId: string, dailyLimit?: number, tier?: number, adminNotes?: string): Promise<void>;
    getValidationRequirements(): Promise<{
        amount: number;
        description: string;
        benefits: string[];
    }>;
    getValidationSettings(): Promise<{
        validationEnabled: boolean;
        validationAmount: number;
        initialDailyLimit: number;
        limitTiers: number[];
        thresholdTiers: number[];
    }>;
    updateValidationSettings(settings: {
        validationEnabled?: boolean;
        validationAmount?: number;
        initialDailyLimit?: number;
        limitTiers?: number[];
        thresholdTiers?: number[];
    }): Promise<void>;
    isValidationEnabled(): Promise<boolean>;
    getDetailedValidationStatus(userId: string): Promise<any>;
    manualValidationCheck(userId: string): Promise<any>;
}
