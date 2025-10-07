import { PrismaService } from '../../prisma/prisma.service';
import { Logger } from '@nestjs/common';

export interface FindAllOptions {
	where?: any;
	orderBy?: any;
	skip?: number;
	take?: number;
	include?: any;
	select?: any;
}

export interface PaginatedResult<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	hasNext: boolean;
	hasPrevious: boolean;
}

export abstract class BaseRepository<T, CreateDto, UpdateDto> {
	protected abstract readonly logger: Logger;
	protected abstract readonly modelName: string;

	constructor(protected readonly prisma: PrismaService) {}

	protected get model() {
		return this.prisma[this.modelName];
	}

	async create(data: CreateDto): Promise<T> {
		try {
			const result = await this.model.create({ data });
			this.logger.log(`Created ${this.modelName} with id: ${result.id}`);
			return result;
		} catch (error) {
			this.logger.error(`Failed to create ${this.modelName}:`, error);
			throw error;
		}
	}

	async createMany(data: CreateDto[]): Promise<{ count: number }> {
		try {
			const result = await this.model.createMany({ data });
			this.logger.log(`Created ${result.count} ${this.modelName} records`);
			return result;
		} catch (error) {
			this.logger.error(`Failed to create multiple ${this.modelName}:`, error);
			throw error;
		}
	}

	async findAll(options?: FindAllOptions): Promise<T[]> {
		try {
			return await this.model.findMany(options);
		} catch (error) {
			this.logger.error(`Failed to find ${this.modelName} records:`, error);
			throw error;
		}
	}

	async findAllPaginated(
		page: number = 1,
		pageSize: number = 10,
		options?: Omit<FindAllOptions, 'skip' | 'take'>,
	): Promise<PaginatedResult<T>> {
		try {
			const skip = (page - 1) * pageSize;
			const [data, total] = await Promise.all([
				this.model.findMany({
					...options,
					skip,
					take: pageSize,
				}),
				this.model.count({ where: options?.where }),
			]);

			const totalPages = Math.ceil(total / pageSize);

			return {
				data,
				total,
				page,
				pageSize,
				totalPages,
				hasNext: page < totalPages,
				hasPrevious: page > 1,
			};
		} catch (error) {
			this.logger.error(`Failed to find paginated ${this.modelName}:`, error);
			throw error;
		}
	}

	async findOne(id: string, include?: any): Promise<T | null> {
		try {
			return await this.model.findUnique({
				where: { id },
				include,
			});
		} catch (error) {
			this.logger.error(
				`Failed to find ${this.modelName} with id ${id}:`,
				error,
			);
			throw error;
		}
	}

	async findByField(
		field: string,
		value: any,
		include?: any,
	): Promise<T | null> {
		try {
			return await this.model.findUnique({
				where: { [field]: value },
				include,
			});
		} catch (error) {
			this.logger.error(`Failed to find ${this.modelName} by ${field}:`, error);
			throw error;
		}
	}

	async findMany(
		where: any,
		options?: Omit<FindAllOptions, 'where'>,
	): Promise<T[]> {
		try {
			return await this.model.findMany({
				where,
				...options,
			});
		} catch (error) {
			this.logger.error(`Failed to find multiple ${this.modelName}:`, error);
			throw error;
		}
	}

	async update(id: string, data: UpdateDto): Promise<T> {
		try {
			const result = await this.model.update({
				where: { id },
				data,
			});
			this.logger.log(`Updated ${this.modelName} with id: ${id}`);
			return result;
		} catch (error) {
			this.logger.error(
				`Failed to update ${this.modelName} with id ${id}:`,
				error,
			);
			throw error;
		}
	}

	async updateMany(where: any, data: UpdateDto): Promise<{ count: number }> {
		try {
			const result = await this.model.updateMany({
				where,
				data,
			});
			this.logger.log(`Updated ${result.count} ${this.modelName} records`);
			return result;
		} catch (error) {
			this.logger.error(`Failed to update multiple ${this.modelName}:`, error);
			throw error;
		}
	}

	async delete(id: string): Promise<T> {
		try {
			const result = await this.model.delete({
				where: { id },
			});
			this.logger.log(`Deleted ${this.modelName} with id: ${id}`);
			return result;
		} catch (error) {
			this.logger.error(
				`Failed to delete ${this.modelName} with id ${id}:`,
				error,
			);
			throw error;
		}
	}

	async deleteMany(where: any): Promise<{ count: number }> {
		try {
			const result = await this.model.deleteMany({ where });
			this.logger.log(`Deleted ${result.count} ${this.modelName} records`);
			return result;
		} catch (error) {
			this.logger.error(`Failed to delete multiple ${this.modelName}:`, error);
			throw error;
		}
	}

	async exists(id: string): Promise<boolean> {
		try {
			const count = await this.model.count({
				where: { id },
			});
			return count > 0;
		} catch (error) {
			this.logger.error(
				`Failed to check existence of ${this.modelName} with id ${id}:`,
				error,
			);
			throw error;
		}
	}

	async count(where?: any): Promise<number> {
		try {
			return await this.model.count({ where });
		} catch (error) {
			this.logger.error(`Failed to count ${this.modelName}:`, error);
			throw error;
		}
	}

	async transaction<R>(fn: (tx: any) => Promise<R>): Promise<R> {
		try {
			return await this.prisma.$transaction(fn);
		} catch (error) {
			this.logger.error(`Transaction failed for ${this.modelName}:`, error);
			throw error;
		}
	}
}
