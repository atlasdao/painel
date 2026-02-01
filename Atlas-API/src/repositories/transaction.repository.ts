import { Injectable } from '@nestjs/common';
import {
	Transaction,
	Prisma,
	TransactionStatus,
	TransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AbstractBaseRepository } from './base.repository';

@Injectable()
export class TransactionRepository extends AbstractBaseRepository<Transaction> {
	protected model: any;

	constructor(protected readonly prisma: PrismaService) {
		super(prisma);
		this.model = this.prisma.transaction;
	}

	// Override findAll to include default ordering by createdAt desc
	async findAll(params?: {
		skip?: number;
		take?: number;
		where?: any;
		orderBy?: any;
		status?: TransactionStatus;
		type?: TransactionType;
		userId?: string;
		startDate?: Date;
		endDate?: Date;
	}): Promise<Transaction[]> {
		const { skip, take, where, orderBy, status, type, userId, startDate, endDate } = params || {};

		// Build date range filter
		const dateFilter: any = {};
		if (startDate || endDate) {
			dateFilter.createdAt = {};
			if (startDate) dateFilter.createdAt.gte = startDate;
			if (endDate) dateFilter.createdAt.lte = endDate;
		}

		// Build comprehensive where clause
		const comprehensiveWhere = {
			...where,
			...(status && { status }),
			...(type && { type }),
			...(userId && { userId }),
			...dateFilter,
		};

		return this.prisma.transaction.findMany({
			skip,
			take,
			where: comprehensiveWhere,
			orderBy: orderBy || { createdAt: 'desc' },
			include: {
				user: {
					select: {
						id: true,
						email: true,
						username: true,
					}
				},
			},
		});
	}

	async findByExternalId(externalId: string): Promise<Transaction | null> {
		return this.prisma.transaction.findUnique({
			where: { externalId },
			include: {
				user: true,
				webhookEvents: true,
			},
		});
	}

	async findByUserId(
		userId: string,
		params?: {
			skip?: number;
			take?: number;
			status?: TransactionStatus;
			type?: TransactionType;
			startDate?: Date;
			endDate?: Date;
		},
	): Promise<Transaction[]> {
		const { skip, take, status, type, startDate, endDate } = params || {};

		// Build date range filter - use processedAt for completed transactions, createdAt for others
		const dateFilter: any = {};
		if (startDate || endDate) {
			// For completed transactions, use processedAt which reflects when revenue was actually generated
			// For other statuses, use createdAt as processedAt may be null
			if (status === TransactionStatus.COMPLETED) {
				dateFilter.processedAt = {};
				if (startDate) dateFilter.processedAt.gte = startDate;
				if (endDate) dateFilter.processedAt.lte = endDate;
			} else {
				dateFilter.createdAt = {};
				if (startDate) dateFilter.createdAt.gte = startDate;
				if (endDate) dateFilter.createdAt.lte = endDate;
			}
		}

		return this.prisma.transaction.findMany({
			skip,
			take,
			where: {
				userId,
				...(status && { status }),
				...(type && { type }),
				...dateFilter,
			},
			orderBy: { createdAt: 'desc' },
			include: {
				user: true,
				webhookEvents: true,
			},
		});
	}

	async updateStatus(
		id: string,
		status: TransactionStatus,
		errorMessage?: string,
	): Promise<Transaction> {
		return this.prisma.transaction.update({
			where: { id },
			data: {
				status,
				...(errorMessage && { errorMessage }),
				...(status === 'COMPLETED' && { processedAt: new Date() }),
			},
		});
	}

	async findPendingTransactions(limit = 100): Promise<Transaction[]> {
		return this.prisma.transaction.findMany({
			where: {
				status: 'PENDING',
			},
			take: limit,
			orderBy: { createdAt: 'asc' },
			include: {
				user: true,
			},
		});
	}

	async getTransactionStats(userId?: string): Promise<{
		total: number;
		pending: number;
		completed: number;
		failed: number;
		totalAmount: number;
	}> {
		const where = userId ? { userId } : {};

		const [total, pending, completed, failed, amounts] = await Promise.all([
			this.prisma.transaction.count({ where }),
			this.prisma.transaction.count({ where: { ...where, status: 'PENDING' } }),
			this.prisma.transaction.count({
				where: { ...where, status: 'COMPLETED' },
			}),
			this.prisma.transaction.count({ where: { ...where, status: 'FAILED' } }),
			this.prisma.transaction.aggregate({
				where: { ...where, status: 'COMPLETED' },
				_sum: { amount: true },
			}),
		]);

		return {
			total,
			pending,
			completed,
			failed,
			totalAmount: amounts._sum.amount || 0,
		};
	}

	async createWithWebhook(
		data: Prisma.TransactionCreateInput,
		webhookUrl?: string,
	): Promise<Transaction> {
		if (webhookUrl) {
			return this.prisma.transaction.create({
				data: {
					...data,
					webhookEvents: {
						create: {
							url: webhookUrl,
							payload: JSON.stringify({ transactionId: data.externalId }),
						},
					},
				},
				include: {
					user: true,
					webhookEvents: true,
				},
			});
		}

		return this.prisma.transaction.create({
			data,
			include: {
				user: true,
			},
		});
	}

	async countToday(): Promise<number> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return this.prisma.transaction.count({
			where: {
				createdAt: {
					gte: today,
				},
			},
		});
	}

	async sumAmount(params?: {
		status?: TransactionStatus;
		userId?: string;
		createdAt?: {
			gte?: Date;
			lte?: Date;
		};
	}): Promise<number> {
		const where: any = {};
		if (params?.status) where.status = params.status;
		if (params?.userId) where.userId = params.userId;
		if (params?.createdAt) where.createdAt = params.createdAt;

		const result = await this.prisma.transaction.aggregate({
			where,
			_sum: {
				amount: true,
			},
		});

		return result._sum.amount || 0;
	}

	async sumAmountToday(params?: {
		status?: TransactionStatus;
		userId?: string;
	}): Promise<number> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const where: any = {
			createdAt: {
				gte: today,
			},
		};
		if (params?.status) where.status = params.status;
		if (params?.userId) where.userId = params.userId;

		const result = await this.prisma.transaction.aggregate({
			where,
			_sum: {
				amount: true,
			},
		});

		return result._sum.amount || 0;
	}

	async countUsersWithMultipleTransactions(): Promise<number> {
		const usersWithTransactions = await this.prisma.transaction.groupBy({
			by: ['userId'],
			_count: {
				userId: true,
			},
			having: {
				userId: {
					_count: {
						gt: 1,
					},
				},
			},
		});

		return usersWithTransactions.length;
	}
}
