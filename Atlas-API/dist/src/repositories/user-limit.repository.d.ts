import { PrismaService } from '../prisma/prisma.service';
import { UserLimit } from '@prisma/client';
import { AbstractBaseRepository } from './base.repository';
export declare class UserLimitRepository extends AbstractBaseRepository<UserLimit> {
    protected model: any;
    constructor(prisma: PrismaService);
    getOrCreateUserLimits(userId: string): Promise<UserLimit>;
    updateUserLimits(userId: string, updates: Partial<Omit<UserLimit, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>, adminId: string): Promise<UserLimit>;
    getUserDailyUsage(userId: string): Promise<{
        depositToday: number;
        withdrawToday: number;
        transferToday: number;
    }>;
    getUserMonthlyUsage(userId: string): Promise<{
        depositThisMonth: number;
        withdrawThisMonth: number;
        transferThisMonth: number;
    }>;
    markUserAsNotFirstDay(userId: string): Promise<void>;
    getAllUsersWithLimits(params?: {
        skip?: number;
        take?: number;
        isFirstDay?: boolean;
        isKycVerified?: boolean;
        isHighRiskUser?: boolean;
    }): Promise<{
        users: (UserLimit & {
            user: {
                email: string;
                username: string;
                createdAt: Date;
            };
        })[];
        total: number;
    }>;
}
