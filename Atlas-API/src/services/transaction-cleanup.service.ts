import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class TransactionCleanupService {
	private readonly logger = new Logger(TransactionCleanupService.name);

	// 29 minutes 50 seconds in milliseconds
	private readonly TRANSACTION_TIMEOUT = (29 * 60 + 50) * 1000;

	constructor(private readonly prisma: PrismaService) {}

	@Cron(CronExpression.EVERY_MINUTE)
	async checkPendingTransactions() {
		try {
			// Calculate the cutoff time (29 minutes 50 seconds ago)
			const cutoffTime = new Date(Date.now() - this.TRANSACTION_TIMEOUT);

			// Find expired pending transactions
			const expiredTransactions = await this.prisma.transaction.findMany({
				where: {
					status: TransactionStatus.PENDING,
					createdAt: {
						lt: cutoffTime, // Less than cutoff time (older than 29 minutes 50 seconds)
					},
				},
			});

			if (expiredTransactions.length === 0) {
				// Only log every 5 minutes to avoid spam
				const now = new Date();
				if (now.getMinutes() % 5 === 0) {
					this.logger.log(
						'No expired transactions found (checked every minute)',
					);
				}
				return;
			}

			this.logger.log(
				`Found ${expiredTransactions.length} expired transactions to cancel`,
			);

			// Update expired transactions to EXPIRED status
			const updateResult = await this.prisma.transaction.updateMany({
				where: {
					status: TransactionStatus.PENDING,
					createdAt: {
						lt: cutoffTime,
					},
				},
				data: {
					status: TransactionStatus.EXPIRED,
					errorMessage: 'Transação expirou após 29 minutos e 50 segundos',
					processedAt: new Date(),
				},
			});

			this.logger.log(
				`Successfully expired ${updateResult.count} transactions`,
			);

			// Log details of expired transactions for monitoring
			expiredTransactions.forEach((transaction) => {
				this.logger.log(
					`Expired transaction: ${transaction.id} (User: ${transaction.userId}, Amount: ${transaction.amount}, Age: ${Math.floor(
						(Date.now() - transaction.createdAt.getTime()) / 1000 / 60,
					)} minutes)`,
				);
			});
		} catch (error) {
			this.logger.error('Error during transaction cleanup:', error);
		}
	}

	@Cron(CronExpression.EVERY_5_MINUTES)
	async cleanupExpiredTransactions() {
		this.logger.log('Running comprehensive cleanup check (every 5 minutes)...');

		try {
			// This is a comprehensive check that runs every 5 minutes as a backup
			// The main work is done by checkPendingTransactions() every minute
			const cutoffTime = new Date(Date.now() - this.TRANSACTION_TIMEOUT);

			const expiredCount = await this.prisma.transaction.count({
				where: {
					status: TransactionStatus.PENDING,
					createdAt: {
						lt: cutoffTime,
					},
				},
			});

			if (expiredCount > 0) {
				this.logger.warn(
					`Found ${expiredCount} pending transactions that should have been expired - running additional cleanup`,
				);

				const updateResult = await this.prisma.transaction.updateMany({
					where: {
						status: TransactionStatus.PENDING,
						createdAt: {
							lt: cutoffTime,
						},
					},
					data: {
						status: TransactionStatus.EXPIRED,
						errorMessage:
							'Transação expirou após 29 minutos e 50 segundos (limpeza de backup)',
						processedAt: new Date(),
					},
				});

				this.logger.log(
					`Backup cleanup processed ${updateResult.count} transactions`,
				);
			} else {
				this.logger.log(
					'Comprehensive cleanup check: all transactions properly managed',
				);
			}
		} catch (error) {
			this.logger.error('Error during comprehensive cleanup:', error);
		}
	}

	// Note: Validation processing is handled directly by the AccountValidationService
	// to avoid circular dependencies

	// Manual cleanup method for testing or administrative purposes
	async manualCleanup(): Promise<number> {
		this.logger.log('Manual cleanup triggered');

		const cutoffTime = new Date(Date.now() - this.TRANSACTION_TIMEOUT);

		const result = await this.prisma.transaction.updateMany({
			where: {
				status: TransactionStatus.PENDING,
				createdAt: {
					lt: cutoffTime,
				},
			},
			data: {
				status: TransactionStatus.EXPIRED,
				errorMessage: 'Transação expirou após 29 minutos e 50 segundos (limpeza manual)',
				processedAt: new Date(),
			},
		});

		this.logger.log(
			`Manual cleanup completed: ${result.count} transactions expired`,
		);
		return result.count;
	}

	// Get statistics about pending transactions
	async getTransactionStats() {
		const now = new Date();
		const cutoffTime = new Date(now.getTime() - this.TRANSACTION_TIMEOUT);

		const [total, expired, recent, totalExpired] = await Promise.all([
			// Total pending transactions
			this.prisma.transaction.count({
				where: { status: TransactionStatus.PENDING },
			}),

			// Expired but not yet cleaned up (should be 0 with minute-level monitoring)
			this.prisma.transaction.count({
				where: {
					status: TransactionStatus.PENDING,
					createdAt: { lt: cutoffTime },
				},
			}),

			// Recent transactions (within 29 minutes 50 seconds)
			this.prisma.transaction.count({
				where: {
					status: TransactionStatus.PENDING,
					createdAt: { gte: cutoffTime },
				},
			}),

			// Total expired transactions (for monitoring)
			this.prisma.transaction.count({
				where: { status: TransactionStatus.EXPIRED },
			}),
		]);

		return {
			totalPending: total,
			expiredReady: expired,
			recentPending: recent,
			totalExpired,
			cutoffTime,
			timeoutMinutes: this.TRANSACTION_TIMEOUT / (60 * 1000),
			monitoringFrequency: 'Every minute with 5-minute backup',
		};
	}
}
