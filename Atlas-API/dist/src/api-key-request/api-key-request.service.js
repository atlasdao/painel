"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyRequestService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const crypto = __importStar(require("crypto"));
let ApiKeyRequestService = class ApiKeyRequestService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createRequest(userId, dto) {
        const existingRequest = await this.prisma.apiKeyRequest.findFirst({
            where: {
                userId,
                status: client_1.ApiKeyRequestStatus.PENDING,
                serviceUrl: dto.serviceUrl,
            },
        });
        if (existingRequest) {
            throw new common_1.ConflictException('Você já tem uma solicitação pendente para este serviço');
        }
        return await this.prisma.apiKeyRequest.create({
            data: {
                userId,
                usageReason: dto.usageReason,
                serviceUrl: dto.serviceUrl,
                estimatedVolume: dto.estimatedVolume,
                usageType: dto.usageType,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                    },
                },
            },
        });
    }
    async getUserRequests(userId) {
        return await this.prisma.apiKeyRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                    },
                },
            },
        });
    }
    async getUserActiveApiKeys(userId) {
        return await this.prisma.apiKeyRequest.findMany({
            where: {
                userId,
                status: client_1.ApiKeyRequestStatus.APPROVED,
                generatedApiKey: { not: null }
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                    },
                },
            },
        });
    }
    async getAllRequests(filter) {
        const where = {};
        if (filter?.status) {
            where.status = filter.status;
        }
        if (filter?.userId) {
            where.userId = filter.userId;
        }
        return await this.prisma.apiKeyRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        role: true,
                    },
                },
            },
        });
    }
    async getRequestById(id) {
        const request = await this.prisma.apiKeyRequest.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        role: true,
                    },
                },
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('API key request not found');
        }
        return request;
    }
    async approveRequest(requestId, adminId, dto) {
        const request = await this.prisma.apiKeyRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('API key request not found');
        }
        if (request.status !== client_1.ApiKeyRequestStatus.PENDING) {
            throw new common_1.BadRequestException(`Request is already ${request.status.toLowerCase()}`);
        }
        const apiKey = this.generateApiKey();
        const [updatedRequest, updatedUser] = await this.prisma.$transaction([
            this.prisma.apiKeyRequest.update({
                where: { id: requestId },
                data: {
                    status: client_1.ApiKeyRequestStatus.APPROVED,
                    approvedBy: adminId,
                    approvalNotes: dto.approvalNotes,
                    approvedAt: new Date(),
                    generatedApiKey: apiKey,
                    apiKeyExpiresAt: dto.apiKeyExpiresAt,
                },
            }),
            this.prisma.user.update({
                where: { id: request.userId },
                data: { apiKey },
            }),
        ]);
        return {
            ...updatedRequest,
            apiKey,
        };
    }
    async rejectRequest(requestId, adminId, dto) {
        const request = await this.prisma.apiKeyRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new common_1.NotFoundException('API key request not found');
        }
        if (request.status !== client_1.ApiKeyRequestStatus.PENDING) {
            throw new common_1.BadRequestException(`Request is already ${request.status.toLowerCase()}`);
        }
        return await this.prisma.apiKeyRequest.update({
            where: { id: requestId },
            data: {
                status: client_1.ApiKeyRequestStatus.REJECTED,
                approvedBy: adminId,
                approvalNotes: dto.approvalNotes,
                rejectedAt: new Date(),
            },
        });
    }
    async revokeApiKey(requestId, adminId, reason) {
        const request = await this.prisma.apiKeyRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('API key request not found');
        }
        if (request.status !== client_1.ApiKeyRequestStatus.APPROVED) {
            throw new common_1.BadRequestException('Can only revoke approved API keys');
        }
        const [updatedRequest, updatedUser] = await this.prisma.$transaction([
            this.prisma.apiKeyRequest.update({
                where: { id: requestId },
                data: {
                    status: client_1.ApiKeyRequestStatus.REVOKED,
                    approvalNotes: reason,
                },
            }),
            this.prisma.user.update({
                where: { id: request.userId },
                data: { apiKey: null },
            }),
        ]);
        return updatedRequest;
    }
    generateApiKey() {
        const prefix = 'atlas_';
        const randomBytes = crypto.randomBytes(32).toString('hex');
        return `${prefix}${randomBytes}`;
    }
};
exports.ApiKeyRequestService = ApiKeyRequestService;
exports.ApiKeyRequestService = ApiKeyRequestService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ApiKeyRequestService);
//# sourceMappingURL=api-key-request.service.js.map