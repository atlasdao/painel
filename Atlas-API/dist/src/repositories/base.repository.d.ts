import { PrismaService } from '../prisma/prisma.service';
export interface BaseRepository<T> {
    findAll(params?: {
        skip?: number;
        take?: number;
        where?: any;
        orderBy?: any;
    }): Promise<T[]>;
    findOne(where: any): Promise<T | null>;
    findById(id: string): Promise<T | null>;
    create(data: any): Promise<T>;
    update(id: string, data: any): Promise<T>;
    delete(id: string): Promise<T>;
    count(where?: any): Promise<number>;
}
export declare abstract class AbstractBaseRepository<T> implements BaseRepository<T> {
    protected readonly prisma: PrismaService;
    protected abstract model: any;
    constructor(prisma: PrismaService);
    findAll(params?: {
        skip?: number;
        take?: number;
        where?: any;
        orderBy?: any;
    }): Promise<T[]>;
    findOne(where: any): Promise<T | null>;
    findById(id: string): Promise<T | null>;
    create(data: any): Promise<T>;
    update(id: string, data: any): Promise<T>;
    delete(id: string): Promise<T>;
    count(where?: any): Promise<number>;
}
