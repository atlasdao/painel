import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyRequestDto, ApproveApiKeyRequestDto, RejectApiKeyRequestDto, FilterApiKeyRequestsDto } from '../common/dto/api-key-request.dto';
export declare class ApiKeyRequestService {
    private prisma;
    constructor(prisma: PrismaService);
    createRequest(userId: string, dto: CreateApiKeyRequestDto): Promise<{
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
    getUserRequests(userId: string): Promise<({
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
    getUserActiveApiKeys(userId: string): Promise<({
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
    getAllRequests(filter?: FilterApiKeyRequestsDto): Promise<({
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
    approveRequest(requestId: string, adminId: string, dto: ApproveApiKeyRequestDto): Promise<{
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
    rejectRequest(requestId: string, adminId: string, dto: RejectApiKeyRequestDto): Promise<{
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
    revokeApiKey(requestId: string, adminId: string, reason: string): Promise<{
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
    private generateApiKey;
}
