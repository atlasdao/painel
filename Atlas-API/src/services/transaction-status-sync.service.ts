import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus } from '@prisma/client';
import { EulenClientService } from './eulen-client.service';

@Injectable()
export class TransactionStatusSyncService {
	private readonly logger = new Logger(TransactionStatusSyncService.name);
	private isRunning = false;

	constructor(
		private readonly prisma: PrismaService,
		private readonly eulenClient: EulenClientService,
	) {}

	/**
	 * Check all PENDING/PROCESSING transactions with Eulen API
	 * Runs every minute to catch transactions that webhook missed
	 * This serves as a fallback mechanism for webhook failures
	 */
	@Cron(CronExpression.EVERY_MINUTE)
	async syncPendingTransactions() {
		// Prevent concurrent executions
		if (this.isRunning) {
			this.logger.debug('Previous sync still running, skipping this interval');
			return;
		}

		this.isRunning = true;

		try {
			// Find all PENDING, PROCESSING, or IN_REVIEW transactions from last 2 hours
			// 2 hours = generous window for blockchain confirmations
			const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000);

			const pendingTransactions = await this.prisma.transaction.findMany({
				where: {
					status: {
						in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING, TransactionStatus.IN_REVIEW],
					},
					externalId: {
						not: null,
					},
					createdAt: {
						gte: cutoffTime,
					},
				},
				select: {
					id: true,
					externalId: true,
					status: true,
					amount: true,
					userId: true,
					createdAt: true,
				},
				orderBy: {
					createdAt: 'asc', // Check oldest first
				},
				take: 50, // Limit to prevent API overload
			});

			if (pendingTransactions.length === 0) {
				// Only log every 5 minutes to avoid spam
				const now = new Date();
				if (now.getMinutes() % 5 === 0) {
					this.logger.log('✅ No pending transactions to sync (all up to date)');
				}
				return;
			}

			this.logger.log(
				`🔄 Syncing ${pendingTransactions.length} pending transaction(s) with Eulen API`,
			);

			let updated = 0;
			let errors = 0;

			for (const transaction of pendingTransactions) {
				try {
					await this.checkAndUpdateTransaction(transaction);
					updated++;

					// Small delay to avoid overwhelming Eulen API
					await new Promise(resolve => setTimeout(resolve, 500));
				} catch (error) {
					errors++;
					this.logger.error(
						`Failed to sync transaction ${transaction.id}: ${error.message}`,
					);
				}
			}

			this.logger.log(
				`📊 Sync complete: ${updated} checked, ${errors} errors`,
			);
		} catch (error) {
			this.logger.error('Error during transaction sync:', error);
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Check single transaction status with Eulen and update if changed
	 */
	private async checkAndUpdateTransaction(transaction: {
		id: string;
		externalId: string | null;
		status: TransactionStatus;
		amount: number;
		userId: string;
		createdAt: Date;
	}): Promise<void> {
		if (!transaction.externalId) {
			return;
		}

		try {
			// Query Eulen API for status
			const eulenStatus = await this.eulenClient.getDepositStatus(
				transaction.externalId,
			);

			const eulenStatusString = eulenStatus.response?.status;

			if (!eulenStatusString) {
				this.logger.warn(
					`No status returned from Eulen for transaction ${transaction.id}`,
				);
				return;
			}

			// Map Eulen status to our status
			let newStatus: TransactionStatus | null = null;
			let payerInfo: any = null;

			switch (eulenStatusString) {
				case 'depix_sent':
					newStatus = TransactionStatus.COMPLETED;
					payerInfo = {
						payerEUID: eulenStatus.response.payerEUID,
						payerName: eulenStatus.response.payerName,
						payerTaxNumber: eulenStatus.response.payerTaxNumber,
						bankTxId: eulenStatus.response.bankTxId,
						blockchainTxID: eulenStatus.response.blockchainTxID,
					};
					break;

				case 'paid':
					newStatus = TransactionStatus.PROCESSING;
					break;

				case 'under_review':
					newStatus = TransactionStatus.IN_REVIEW;
					break;

				case 'failed':
				case 'canceled':
				case 'refunded':
					newStatus = TransactionStatus.FAILED;
					break;

				case 'expired':
					newStatus = TransactionStatus.EXPIRED;
					break;

				case 'pending':
					// Status hasn't changed, no update needed
					return;

				default:
					this.logger.warn(
						`Unknown Eulen status "${eulenStatusString}" for transaction ${transaction.id}`,
					);
					return;
			}

			// Only update if status actually changed
			if (newStatus && newStatus !== transaction.status) {
				const currentMetadata = await this.prisma.transaction
					.findUnique({
						where: { id: transaction.id },
						select: { metadata: true },
					})
					.then((tx) => (tx?.metadata ? JSON.parse(tx.metadata) : {}));

				await this.prisma.transaction.update({
					where: { id: transaction.id },
					data: {
						status: newStatus,
						processedAt: new Date(),
						metadata: JSON.stringify({
							...currentMetadata,
							...payerInfo,
							syncedAt: new Date().toISOString(),
							syncedVia: 'cron-job',
							eulenStatus: eulenStatusString,
						}),
					},
				});

				this.logger.log(
					`✅ Updated transaction ${transaction.id}: ${transaction.status} → ${newStatus} (Amount: R$ ${transaction.amount.toFixed(2)})`,
				);

				// If completed, log payer info for audit
				if (newStatus === TransactionStatus.COMPLETED && payerInfo) {
					this.logger.log(
						`   👤 Payer: ${payerInfo.payerName} (${payerInfo.payerTaxNumber})`,
					);
					this.logger.log(`   🏦 Bank TX: ${payerInfo.bankTxId}`);
					this.logger.log(
						`   🔗 Blockchain TX: ${payerInfo.blockchainTxID}`,
					);
				}
			}
		} catch (error) {
			// Log but don't throw - continue with other transactions
			this.logger.error(
				`Error checking transaction ${transaction.id} with Eulen: ${error.message}`,
			);
		}
	}

	/**
	 * Manual trigger for testing or admin use
	 */
	async manualSync(): Promise<{ checked: number; updated: number; errors: number }> {
		this.logger.log('🔧 Manual sync triggered');

		const pendingTransactions = await this.prisma.transaction.findMany({
			where: {
				status: {
					in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING, TransactionStatus.IN_REVIEW],
				},
				externalId: {
					not: null,
				},
				createdAt: {
					gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
				},
			},
			select: {
				id: true,
				externalId: true,
				status: true,
				amount: true,
				userId: true,
				createdAt: true,
			},
		});

		let updated = 0;
		let errors = 0;

		for (const transaction of pendingTransactions) {
			try {
				await this.checkAndUpdateTransaction(transaction);
				updated++;
			} catch (error) {
				errors++;
			}
		}

		return {
			checked: pendingTransactions.length,
			updated,
			errors,
		};
	}
}
