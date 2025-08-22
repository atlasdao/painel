import { AccountValidationService } from './account-validation.service';
declare class CreateValidationPaymentDto {
    depixAddress: string;
}
declare class AdjustUserLimitsDto {
    dailyLimit?: number;
    tier?: number;
    adminNotes?: string;
}
declare class ValidationSettingsDto {
    validationEnabled?: boolean;
    validationAmount?: number;
    initialDailyLimit?: number;
    limitTiers?: number[];
    thresholdTiers?: number[];
}
export declare class AccountValidationController {
    private readonly accountValidationService;
    constructor(accountValidationService: AccountValidationService);
    getValidationStatus(req: any): Promise<{
        isValidated: boolean;
        validationPaymentId?: string;
        validatedAt?: Date;
        validationQrCode?: string;
        requiresValidation?: boolean;
    }>;
    getValidationRequirements(): Promise<{
        amount: number;
        description: string;
        benefits: string[];
    }>;
    createValidationPayment(req: any, dto: CreateValidationPaymentDto): Promise<{
        transactionId: string;
        qrCode: string;
        amount: number;
    }>;
    getUserLimits(req: any): Promise<any>;
    getDebugValidationStatus(req: any): Promise<any>;
    manualValidationCheck(req: any): Promise<any>;
    adjustUserLimits(userId: string, dto: AdjustUserLimitsDto): Promise<{
        success: boolean;
        message: string;
    }>;
    getValidationSettings(): Promise<{
        validationEnabled: boolean;
        validationAmount: number;
        initialDailyLimit: number;
        limitTiers: number[];
        thresholdTiers: number[];
    }>;
    updateValidationSettings(dto: ValidationSettingsDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
