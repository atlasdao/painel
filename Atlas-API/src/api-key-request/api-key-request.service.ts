import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyRequestStatus, User } from '@prisma/client';
import { CreateApiKeyRequestDto, ApproveApiKeyRequestDto, RejectApiKeyRequestDto, FilterApiKeyRequestsDto } from '../common/dto/api-key-request.dto';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyRequestService {
  constructor(private prisma: PrismaService) {}

  async createRequest(userId: string, dto: CreateApiKeyRequestDto) {
    // Check if user already has a pending request for the same service
    const existingRequest = await this.prisma.apiKeyRequest.findFirst({
      where: {
        userId,
        status: ApiKeyRequestStatus.PENDING,
        serviceUrl: dto.serviceUrl,
      },
    });

    if (existingRequest) {
      throw new ConflictException('Você já tem uma solicitação pendente para este serviço');
    }

    // Create the request
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

  async getUserRequests(userId: string) {
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

  async getUserActiveApiKeys(userId: string) {
    return await this.prisma.apiKeyRequest.findMany({
      where: { 
        userId,
        status: ApiKeyRequestStatus.APPROVED,
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

  async getAllRequests(filter?: FilterApiKeyRequestsDto) {
    const where: any = {};

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

  async getRequestById(id: string) {
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
      throw new NotFoundException('API key request not found');
    }

    return request;
  }

  async approveRequest(requestId: string, adminId: string, dto: ApproveApiKeyRequestDto) {
    const request = await this.prisma.apiKeyRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('API key request not found');
    }

    if (request.status !== ApiKeyRequestStatus.PENDING) {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    // Generate a secure API key
    const apiKey = this.generateApiKey();

    // Update the request and user in a transaction
    const [updatedRequest, updatedUser] = await this.prisma.$transaction([
      // Update request with approval
      this.prisma.apiKeyRequest.update({
        where: { id: requestId },
        data: {
          status: ApiKeyRequestStatus.APPROVED,
          approvedBy: adminId,
          approvalNotes: dto.approvalNotes,
          approvedAt: new Date(),
          generatedApiKey: apiKey,
          apiKeyExpiresAt: dto.apiKeyExpiresAt,
        },
      }),
      // Update user with the API key
      this.prisma.user.update({
        where: { id: request.userId },
        data: { apiKey },
      }),
    ]);

    return {
      ...updatedRequest,
      apiKey, // Include the API key in response for admin to share with user
    };
  }

  async rejectRequest(requestId: string, adminId: string, dto: RejectApiKeyRequestDto) {
    const request = await this.prisma.apiKeyRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('API key request not found');
    }

    if (request.status !== ApiKeyRequestStatus.PENDING) {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    return await this.prisma.apiKeyRequest.update({
      where: { id: requestId },
      data: {
        status: ApiKeyRequestStatus.REJECTED,
        approvedBy: adminId,
        approvalNotes: dto.approvalNotes,
        rejectedAt: new Date(),
      },
    });
  }

  async revokeApiKey(requestId: string, adminId: string, reason: string) {
    const request = await this.prisma.apiKeyRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('API key request not found');
    }

    if (request.status !== ApiKeyRequestStatus.APPROVED) {
      throw new BadRequestException('Can only revoke approved API keys');
    }

    // Update request and remove API key from user in a transaction
    const [updatedRequest, updatedUser] = await this.prisma.$transaction([
      this.prisma.apiKeyRequest.update({
        where: { id: requestId },
        data: {
          status: ApiKeyRequestStatus.REVOKED,
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

  private generateApiKey(): string {
    // Generate a secure API key with prefix for identification
    const prefix = 'atlas_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}${randomBytes}`;
  }
}