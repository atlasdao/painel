import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { BaseRepository, PaginatedResult } from './base.repository';

export interface QueryOptions {
	page?: number;
	pageSize?: number;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
	filters?: Record<string, any>;
	search?: string;
	searchFields?: string[];
}

export abstract class BaseService<T, CreateDto, UpdateDto> {
	protected abstract readonly logger: Logger;
	protected abstract readonly entityName: string;

	constructor(
		protected readonly repository: BaseRepository<T, CreateDto, UpdateDto>,
	) {}

	async create(createDto: CreateDto): Promise<T> {
		try {
			await this.validateCreate(createDto);
			const entity = await this.beforeCreate(createDto);
			const created = await this.repository.create(entity);
			return await this.afterCreate(created);
		} catch (error) {
			this.handleError(`Failed to create ${this.entityName}`, error);
		}
	}

	async findAll(options?: QueryOptions): Promise<T[] | PaginatedResult<T>> {
		try {
			const queryOptions = this.buildQueryOptions(options);

			if (options?.page) {
				return await this.repository.findAllPaginated(
					options.page,
					options.pageSize || 10,
					queryOptions,
				);
			}

			return await this.repository.findAll(queryOptions);
		} catch (error) {
			this.handleError(`Failed to find ${this.entityName} records`, error);
		}
	}

	async findOne(id: string): Promise<T> {
		try {
			const entity = await this.repository.findOne(id);
			if (!entity) {
				throw new NotFoundException(
					`${this.entityName} with ID ${id} not found`,
				);
			}
			return entity;
		} catch (error) {
			this.handleError(`Failed to find ${this.entityName}`, error);
		}
	}

	async update(id: string, updateDto: UpdateDto): Promise<T> {
		try {
			await this.validateUpdate(id, updateDto);
			const exists = await this.repository.exists(id);
			if (!exists) {
				throw new NotFoundException(
					`${this.entityName} with ID ${id} not found`,
				);
			}

			const data = await this.beforeUpdate(id, updateDto);
			const updated = await this.repository.update(id, data);
			return await this.afterUpdate(updated);
		} catch (error) {
			this.handleError(`Failed to update ${this.entityName}`, error);
		}
	}

	async remove(id: string): Promise<T> {
		try {
			const exists = await this.repository.exists(id);
			if (!exists) {
				throw new NotFoundException(
					`${this.entityName} with ID ${id} not found`,
				);
			}

			await this.beforeDelete(id);
			const deleted = await this.repository.delete(id);
			await this.afterDelete(deleted);
			return deleted;
		} catch (error) {
			this.handleError(`Failed to delete ${this.entityName}`, error);
		}
	}

	async count(filters?: Record<string, any>): Promise<number> {
		try {
			const where = this.buildWhereClause(filters);
			return await this.repository.count(where);
		} catch (error) {
			this.handleError(`Failed to count ${this.entityName} records`, error);
		}
	}

	async exists(id: string): Promise<boolean> {
		try {
			return await this.repository.exists(id);
		} catch (error) {
			this.handleError(
				`Failed to check existence of ${this.entityName}`,
				error,
			);
		}
	}

	protected async validateCreate(createDto: CreateDto): Promise<void> {
		// Override in child classes for custom validation
	}

	protected async validateUpdate(
		id: string,
		updateDto: UpdateDto,
	): Promise<void> {
		// Override in child classes for custom validation
	}

	protected async beforeCreate(createDto: CreateDto): Promise<any> {
		return createDto;
	}

	protected async afterCreate(entity: T): Promise<T> {
		return entity;
	}

	protected async beforeUpdate(id: string, updateDto: UpdateDto): Promise<any> {
		return updateDto;
	}

	protected async afterUpdate(entity: T): Promise<T> {
		return entity;
	}

	protected async beforeDelete(id: string): Promise<void> {
		// Override in child classes for custom logic
	}

	protected async afterDelete(entity: T): Promise<void> {
		// Override in child classes for custom logic
	}

	protected buildQueryOptions(options?: QueryOptions): any {
		if (!options) return {};

		const queryOptions: any = {};

		// Build where clause
		queryOptions.where = this.buildWhereClause(
			options.filters,
			options.search,
			options.searchFields,
		);

		// Build orderBy
		if (options.sortBy) {
			queryOptions.orderBy = {
				[options.sortBy]: options.sortOrder || 'asc',
			};
		}

		return queryOptions;
	}

	protected buildWhereClause(
		filters?: Record<string, any>,
		search?: string,
		searchFields?: string[],
	): any {
		const where: any = {};

		// Apply filters
		if (filters) {
			Object.entries(filters).forEach(([key, value]) => {
				if (value !== undefined && value !== null && value !== '') {
					where[key] = value;
				}
			});
		}

		// Apply search
		if (search && searchFields && searchFields.length > 0) {
			where.OR = searchFields.map((field) => ({
				[field]: {
					contains: search,
					mode: 'insensitive',
				},
			}));
		}

		return Object.keys(where).length > 0 ? where : undefined;
	}

	protected handleError(message: string, error: any): never {
		this.logger.error(message, error);

		if (
			error instanceof NotFoundException ||
			error instanceof BadRequestException
		) {
			throw error;
		}

		if (error?.code === 'P2002') {
			throw new BadRequestException(
				`${this.entityName} already exists with these unique values`,
			);
		}

		if (error?.code === 'P2025') {
			throw new NotFoundException(`${this.entityName} not found`);
		}

		throw new BadRequestException(message);
	}
}
