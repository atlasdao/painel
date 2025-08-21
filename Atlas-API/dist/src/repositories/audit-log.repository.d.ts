import { AuditLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AbstractBaseRepository } from './base.repository';
export declare class AuditLogRepository extends AbstractBaseRepository<AuditLog> {
    protected readonly prisma: PrismaService;
    protected model: any;
    constructor(prisma: PrismaService);
    createLog(params: {
        userId?: string;
        transactionId?: string;
        action: string;
        resource: string;
        resourceId?: string;
        ipAddress?: string;
        userAgent?: string;
        requestBody?: any;
        responseBody?: any;
        statusCode?: number;
        duration?: number;
    }): Promise<AuditLog>;
    findByUserId(userId: string, params?: {
        skip?: number;
        take?: number;
        action?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<AuditLog[]>;
    findByTransactionId(transactionId: string): Promise<AuditLog[]>;
    findByResource(resource: string, resourceId?: string, params?: {
        skip?: number;
        take?: number;
    }): Promise<AuditLog[]>;
    getActionStats(startDate?: Date, endDate?: Date): Promise<{
        action: string;
        count: number;
    }[]>;
}
