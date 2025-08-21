import { User, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AbstractBaseRepository } from './base.repository';
export declare class UserRepository extends AbstractBaseRepository<User> {
    protected readonly prisma: PrismaService;
    protected model: any;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    findByApiKey(apiKey: string): Promise<User | null>;
    createWithRoles(data: Prisma.UserCreateInput, roleIds: string[]): Promise<User>;
    updateLastLogin(id: string): Promise<User>;
    findActiveUsers(params?: {
        skip?: number;
        take?: number;
        orderBy?: Prisma.UserOrderByWithRelationInput;
    }): Promise<User[]>;
    findById(id: string): Promise<User | null>;
    findAll(params?: {
        skip?: number;
        take?: number;
        orderBy?: Prisma.UserOrderByWithRelationInput;
    }): Promise<User[]>;
    countNewUsersToday(): Promise<number>;
}
