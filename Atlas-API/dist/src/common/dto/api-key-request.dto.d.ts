import { ApiKeyRequestStatus, ApiKeyUsageType } from '@prisma/client';
export declare class CreateApiKeyRequestDto {
    usageReason: string;
    serviceUrl: string;
    estimatedVolume: string;
    usageType: ApiKeyUsageType;
}
export declare class ApproveApiKeyRequestDto {
    approvalNotes?: string;
    apiKeyExpiresAt?: Date;
}
export declare class RejectApiKeyRequestDto {
    approvalNotes: string;
}
export declare class FilterApiKeyRequestsDto {
    status?: ApiKeyRequestStatus;
    userId?: string;
}
export declare class ApiKeyRequestResponseDto {
    id: string;
    userId: string;
    usageReason: string;
    serviceUrl: string;
    estimatedVolume: string;
    usageType: ApiKeyUsageType;
    status: ApiKeyRequestStatus;
    approvedBy?: string;
    approvalNotes?: string;
    approvedAt?: Date;
    rejectedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    user?: {
        id: string;
        email: string;
        username: string;
    };
}
