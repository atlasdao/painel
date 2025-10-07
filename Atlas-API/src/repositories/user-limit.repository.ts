import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserLimit, Prisma } from '@prisma/client';
import { AbstractBaseRepository } from './base.repository';

@Injectable()
export class UserLimitRepository extends AbstractBaseRepository<UserLimit> {
	protected model: any;

	constructor(prisma: PrismaService) {
		super(prisma);
		this.model = prisma.userLimit;
	}

	/**
	 * Get or create default limits for a user
	 */
	async getOrCreateUserLimits(userId: string): Promise<UserLimit> {
		let limits = await this.prisma.userLimit.findUnique({
			where: { userId },
		});

		if (!limits) {
			// Create default limits for new user
			limits = await this.prisma.userLimit.create({
				data: {
					userId,
					dailyDepositLimit: 500.0, // R$ 500 first day
					dailyWithdrawLimit: 500.0,
					dailyTransferLimit: 500.0,
					maxDepositPerTx: 5000.0, // R$ 5000 per transaction
					maxWithdrawPerTx: 5000.0,
					maxTransferPerTx: 5000.0,
					monthlyDepositLimit: 50000.0, // R$ 50k monthly
					monthlyWithdrawLimit: 50000.0,
					monthlyTransferLimit: 50000.0,
					isFirstDay: true,
					isKycVerified: false,
					isHighRiskUser: false,
				},
			});
		}

		return limits;
	}

	/**
	 * Update user limits (admin only)
	 */
	async updateUserLimits(
		userId: string,
		updates: Partial<
			Omit<UserLimit, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
		>,
		adminId: string,
	): Promise<UserLimit> {
		return this.prisma.userLimit.upsert({
			where: { userId },
			update: {
				...updates,
				lastLimitUpdate: new Date(),
				updatedByAdminId: adminId,
			},
			create: {
				userId,
				...updates,
				lastLimitUpdate: new Date(),
				updatedByAdminId: adminId,
			},
		});
	}

	/**
	 * Get user's current usage for today
	 */
	async getUserDailyUsage(userId: string): Promise<{
		depositToday: number;
		withdrawToday: number;
		transferToday: number;
	}> {
		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date();
		endOfDay.setHours(23, 59, 59, 999);

		const transactions = await this.prisma.transaction.findMany({
			where: {
				userId,
				createdAt: {
					gte: startOfDay,
					lte: endOfDay,
				},
				status: {
					in: ['COMPLETED', 'PROCESSING'], // Count completed and processing
				},
			},
			select: {
				type: true,
				amount: true,
			},
		});

		return {
			depositToday: transactions
				.filter((t) => t.type === 'DEPOSIT')
				.reduce((sum, t) => sum + t.amount, 0),
			withdrawToday: transactions
				.filter((t) => t.type === 'WITHDRAW')
				.reduce((sum, t) => sum + t.amount, 0),
			transferToday: transactions
				.filter((t) => t.type === 'TRANSFER')
				.reduce((sum, t) => sum + t.amount, 0),
		};
	}

	/**
	 * Get user's current usage for this month
	 */
	async getUserMonthlyUsage(userId: string): Promise<{
		depositThisMonth: number;
		withdrawThisMonth: number;
		transferThisMonth: number;
	}> {
		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);

		const endOfMonth = new Date();
		endOfMonth.setMonth(endOfMonth.getMonth() + 1);
		endOfMonth.setDate(0);
		endOfMonth.setHours(23, 59, 59, 999);

		const transactions = await this.prisma.transaction.findMany({
			where: {
				userId,
				createdAt: {
					gte: startOfMonth,
					lte: endOfMonth,
				},
				status: {
					in: ['COMPLETED', 'PROCESSING'],
				},
			},
			select: {
				type: true,
				amount: true,
			},
		});

		return {
			depositThisMonth: transactions
				.filter((t) => t.type === 'DEPOSIT')
				.reduce((sum, t) => sum + t.amount, 0),
			withdrawThisMonth: transactions
				.filter((t) => t.type === 'WITHDRAW')
				.reduce((sum, t) => sum + t.amount, 0),
			transferThisMonth: transactions
				.filter((t) => t.type === 'TRANSFER')
				.reduce((sum, t) => sum + t.amount, 0),
		};
	}

	/**
	 * Mark user as no longer first day (after first successful transaction)
	 */
	async markUserAsNotFirstDay(userId: string): Promise<void> {
		await this.prisma.userLimit.update({
			where: { userId },
			data: {
				isFirstDay: false,
				// Increase daily limits after first day
				dailyDepositLimit: 5000.0,
				dailyWithdrawLimit: 5000.0,
				dailyTransferLimit: 5000.0,
			},
		});
	}

	/**
	 * Get all users with their limits (admin only)
	 */
	async getAllUsersWithLimits(params?: {
		skip?: number;
		take?: number;
		isFirstDay?: boolean;
		isKycVerified?: boolean;
		isHighRiskUser?: boolean;
	}): Promise<{
		users: (UserLimit & {
			user: { email: string; username: string; createdAt: Date };
		})[];
		total: number;
	}> {
		const where: Prisma.UserLimitWhereInput = {};

		if (params?.isFirstDay !== undefined) {
			where.isFirstDay = params.isFirstDay;
		}
		if (params?.isKycVerified !== undefined) {
			where.isKycVerified = params.isKycVerified;
		}
		if (params?.isHighRiskUser !== undefined) {
			where.isHighRiskUser = params.isHighRiskUser;
		}

		const [users, total] = await Promise.all([
			this.prisma.userLimit.findMany({
				where,
				include: {
					user: {
						select: {
							email: true,
							username: true,
							createdAt: true,
						},
					},
				},
				skip: params?.skip || 0,
				take: params?.take || 50,
				orderBy: {
					createdAt: 'desc',
				},
			}),
			this.prisma.userLimit.count({ where }),
		]);

		return { users, total };
	}
}
