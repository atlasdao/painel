import { ApiKeyRequestService } from './api-key-request.service';
import { CreateApiKeyRequestDto, ApproveApiKeyRequestDto, RejectApiKeyRequestDto, FilterApiKeyRequestsDto } from '../common/dto/api-key-request.dto';
export declare class ApiKeyRequestController {
    private readonly apiKeyRequestService;
    constructor(apiKeyRequestService: ApiKeyRequestService);
    createRequest(req: any, dto: CreateApiKeyRequestDto): Promise<{
        user: {
            id: string;
            email: string;
            username: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ApiKeyRequestStatus;
        userId: string;
        usageReason: string;
        serviceUrl: string;
        estimatedVolume: string;
        usageType: import("@prisma/client").$Enums.ApiKeyUsageType;
        approvedBy: string | null;
        approvalNotes: string | null;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        generatedApiKey: string | null;
        apiKeyExpiresAt: Date | null;
    }>;
    getMyRequests(req: any): Promise<({
        user: {
            id: string;
            email: string;
            username: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ApiKeyRequestStatus;
        userId: string;
        usageReason: string;
        serviceUrl: string;
        estimatedVolume: string;
        usageType: import("@prisma/client").$Enums.ApiKeyUsageType;
        approvedBy: string | null;
        approvalNotes: string | null;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        generatedApiKey: string | null;
        apiKeyExpiresAt: Date | null;
    })[]>;
    getMyApiKeys(req: any): Promise<({
        user: {
            id: string;
            email: string;
            username: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ApiKeyRequestStatus;
        userId: string;
        usageReason: string;
        serviceUrl: string;
        estimatedVolume: string;
        usageType: import("@prisma/client").$Enums.ApiKeyUsageType;
        approvedBy: string | null;
        approvalNotes: string | null;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        generatedApiKey: string | null;
        apiKeyExpiresAt: Date | null;
    })[]>;
    getAllRequests(filter: FilterApiKeyRequestsDto): Promise<({
        user: {
            id: string;
            email: string;
            username: string;
            role: import("@prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ApiKeyRequestStatus;
        userId: string;
        usageReason: string;
        serviceUrl: string;
        estimatedVolume: string;
        usageType: import("@prisma/client").$Enums.ApiKeyUsageType;
        approvedBy: string | null;
        approvalNotes: string | null;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        generatedApiKey: string | null;
        apiKeyExpiresAt: Date | null;
    })[]>;
    getRequestById(id: string): Promise<{
        user: {
            id: string;
            email: string;
            username: string;
            role: import("@prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ApiKeyRequestStatus;
        userId: string;
        usageReason: string;
        serviceUrl: string;
        estimatedVolume: string;
        usageType: import("@prisma/client").$Enums.ApiKeyUsageType;
        approvedBy: string | null;
        approvalNotes: string | null;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        generatedApiKey: string | null;
        apiKeyExpiresAt: Date | null;
    }>;
    approveRequest(id: string, req: any, dto: ApproveApiKeyRequestDto): Promise<{
        apiKey: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ApiKeyRequestStatus;
        userId: string;
        usageReason: string;
        serviceUrl: string;
        estimatedVolume: string;
        usageType: import("@prisma/client").$Enums.ApiKeyUsageType;
        approvedBy: string | null;
        approvalNotes: string | null;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        generatedApiKey: string | null;
        apiKeyExpiresAt: Date | null;
    }>;
    rejectRequest(id: string, req: any, dto: RejectApiKeyRequestDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ApiKeyRequestStatus;
        userId: string;
        usageReason: string;
        serviceUrl: string;
        estimatedVolume: string;
        usageType: import("@prisma/client").$Enums.ApiKeyUsageType;
        approvedBy: string | null;
        approvalNotes: string | null;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        generatedApiKey: string | null;
        apiKeyExpiresAt: Date | null;
    }>;
    revokeApiKey(id: string, req: any, reason: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ApiKeyRequestStatus;
        userId: string;
        usageReason: string;
        serviceUrl: string;
        estimatedVolume: string;
        usageType: import("@prisma/client").$Enums.ApiKeyUsageType;
        approvedBy: string | null;
        approvalNotes: string | null;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        generatedApiKey: string | null;
        apiKeyExpiresAt: Date | null;
    }>;
}
