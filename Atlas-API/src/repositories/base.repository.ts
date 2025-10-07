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

export abstract class AbstractBaseRepository<T> implements BaseRepository<T> {
  protected abstract model: any;

  constructor(protected readonly prisma: PrismaService) {}

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
  }): Promise<T[]> {
    const { skip, take, where, orderBy } = params || {};
    return this.model.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  async findOne(where: any): Promise<T | null> {
    return this.model.findFirst({ where });
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({ where: { id } });
  }

  async create(data: any): Promise<T> {
    return this.model.create({ data });
  }

  async update(id: string, data: any): Promise<T> {
    return this.model.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<T> {
    return this.model.delete({ where: { id } });
  }

  async count(where?: any): Promise<number> {
    return this.model.count({ where });
  }
}