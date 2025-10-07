import { Injectable } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AbstractBaseRepository } from './base.repository';

@Injectable()
export class AuditLogRepository extends AbstractBaseRepository<AuditLog> {
	protected model: any;

	constructor(protected readonly prisma: PrismaService) {
		super(prisma);
		this.model = this.prisma.auditLog;
	}

	async createLog(params: {
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
	}): Promise<AuditLog> {
		const { requestBody, responseBody, ...data } = params;

		return this.prisma.auditLog.create({
			data: {
				...data,
				userId: data.userId || null, // Allow null userId for system actions
				requestBody: requestBody ? JSON.stringify(requestBody) : null,
				responseBody: responseBody ? JSON.stringify(responseBody) : null,
			},
		});
	}

	async findByUserId(
		userId: string,
		params?: {
			skip?: number;
			take?: number;
			action?: string;
			startDate?: Date;
			endDate?: Date;
		},
	): Promise<AuditLog[]> {
		const { skip, take, action, startDate, endDate } = params || {};

		return this.prisma.auditLog.findMany({
			skip,
			take,
			where: {
				userId,
				...(action && { action }),
				...(startDate || endDate
					? {
							createdAt: {
								...(startDate && { gte: startDate }),
								...(endDate && { lte: endDate }),
							},
						}
					: {}),
			},
			orderBy: { createdAt: 'desc' },
			include: {
				user: true,
				transaction: true,
			},
		});
	}

	async findByTransactionId(transactionId: string): Promise<AuditLog[]> {
		return this.prisma.auditLog.findMany({
			where: { transactionId },
			orderBy: { createdAt: 'asc' },
			include: {
				user: true,
			},
		});
	}

	async findByResource(
		resource: string,
		resourceId?: string,
		params?: {
			skip?: number;
			take?: number;
		},
	): Promise<AuditLog[]> {
		const { skip, take } = params || {};

		return this.prisma.auditLog.findMany({
			skip,
			take,
			where: {
				resource,
				...(resourceId && { resourceId }),
			},
			orderBy: { createdAt: 'desc' },
			include: {
				user: true,
				transaction: true,
			},
		});
	}

	async getActionStats(
		startDate?: Date,
		endDate?: Date,
	): Promise<{ action: string; count: number }[]> {
		const where =
			startDate || endDate
				? {
						createdAt: {
							...(startDate && { gte: startDate }),
							...(endDate && { lte: endDate }),
						},
					}
				: {};

		const result = await this.prisma.auditLog.groupBy({
			by: ['action'],
			where,
			_count: {
				action: true,
			},
			orderBy: {
				_count: {
					action: 'desc',
				},
			},
		});

		return result.map((item) => ({
			action: item.action,
			count: item._count.action,
		}));
	}
}
