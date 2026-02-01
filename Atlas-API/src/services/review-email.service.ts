import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus } from '@prisma/client';
import { EmailService } from './email.service';

@Injectable()
export class ReviewEmailService {
	private readonly logger = new Logger(ReviewEmailService.name);
	private isRunning = false;

	// Minimum time (in milliseconds) a transaction must be in IN_REVIEW before sending email
	// 2 minutes = prevents false alerts for transactions that quickly pass through review
	private readonly REVIEW_THRESHOLD_MS = 2 * 60 * 1000;

	constructor(
		private readonly prisma: PrismaService,
		private readonly emailService: EmailService,
	) {}

	/**
	 * Check for transactions that have been in IN_REVIEW status for more than 2 minutes
	 * and send review emails for those that haven't received one yet.
	 * Runs every minute.
	 */
	@Cron(CronExpression.EVERY_MINUTE)
	async checkAndSendReviewEmails() {
		// Prevent concurrent executions
		if (this.isRunning) {
			return;
		}

		this.isRunning = true;

		try {
			// Calculate the threshold time (2 minutes ago)
			const thresholdTime = new Date(Date.now() - this.REVIEW_THRESHOLD_MS);

			// Find transactions that:
			// 1. Are currently in IN_REVIEW status
			// 2. Have been in that status for more than 2 minutes (updatedAt < threshold)
			// 3. Haven't had a review email sent yet (check metadata)
			const reviewTransactions = await this.prisma.transaction.findMany({
				where: {
					status: TransactionStatus.IN_REVIEW,
					updatedAt: {
						lte: thresholdTime,
					},
				},
				include: {
					user: {
						select: {
							id: true,
							email: true,
							username: true,
							notifyReviewSales: true,
						},
					},
				},
				take: 50, // Limit to prevent overload
			});

			if (reviewTransactions.length === 0) {
				return;
			}

			this.logger.log(
				`📧 Found ${reviewTransactions.length} transaction(s) in IN_REVIEW for more than 2 minutes`,
			);

			let emailsSent = 0;
			let emailsSkipped = 0;

			for (const transaction of reviewTransactions) {
				try {
					// Parse metadata to check if email was already sent
					const metadata = transaction.metadata
						? JSON.parse(transaction.metadata)
						: {};

					// Skip if review email was already sent
					if (metadata.reviewEmailSent) {
						emailsSkipped++;
						continue;
					}

					// Skip if user has disabled review notifications
					if (!transaction.user?.notifyReviewSales) {
						this.logger.log(
							`⏭️ Skipping review email for ${transaction.id} - user disabled notifications`,
						);
						emailsSkipped++;
						continue;
					}

					// Send the review email
					await this.emailService.sendReviewSaleEmail(
						transaction.user.email,
						transaction.user.username,
						{
							productName: transaction.description || 'Pagamento PIX',
							amount: transaction.amount,
							buyerName: transaction.buyerName || metadata.webhookEvent?.payerName,
							transactionId: transaction.id,
							paymentMethod: 'PIX',
							createdAt: transaction.createdAt,
						},
					);

					// Mark email as sent in metadata
					await this.prisma.transaction.update({
						where: { id: transaction.id },
						data: {
							metadata: JSON.stringify({
								...metadata,
								reviewEmailSent: true,
								reviewEmailSentAt: new Date().toISOString(),
							}),
						},
					});

					this.logger.log(
						`📧 REVIEW EMAIL SENT: ${transaction.id} to ${transaction.user.email}`,
					);
					emailsSent++;
				} catch (error) {
					this.logger.error(
						`Failed to process review email for transaction ${transaction.id}:`,
						error,
					);
				}
			}

			if (emailsSent > 0 || emailsSkipped > 0) {
				this.logger.log(
					`📊 Review email check complete: ${emailsSent} sent, ${emailsSkipped} skipped`,
				);
			}
		} catch (error) {
			this.logger.error('Error checking review emails:', error);
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Manual trigger for testing or admin use
	 */
	async manualCheck(): Promise<{ checked: number; sent: number; skipped: number }> {
		this.logger.log('🔧 Manual review email check triggered');

		const thresholdTime = new Date(Date.now() - this.REVIEW_THRESHOLD_MS);

		const reviewTransactions = await this.prisma.transaction.findMany({
			where: {
				status: TransactionStatus.IN_REVIEW,
				updatedAt: {
					lte: thresholdTime,
				},
			},
			include: {
				user: {
					select: {
						id: true,
						email: true,
						username: true,
						notifyReviewSales: true,
					},
				},
			},
		});

		let sent = 0;
		let skipped = 0;

		for (const transaction of reviewTransactions) {
			const metadata = transaction.metadata
				? JSON.parse(transaction.metadata)
				: {};

			if (metadata.reviewEmailSent || !transaction.user?.notifyReviewSales) {
				skipped++;
				continue;
			}

			try {
				await this.emailService.sendReviewSaleEmail(
					transaction.user.email,
					transaction.user.username,
					{
						productName: transaction.description || 'Pagamento PIX',
						amount: transaction.amount,
						buyerName: transaction.buyerName || metadata.webhookEvent?.payerName,
						transactionId: transaction.id,
						paymentMethod: 'PIX',
						createdAt: transaction.createdAt,
					},
				);

				await this.prisma.transaction.update({
					where: { id: transaction.id },
					data: {
						metadata: JSON.stringify({
							...metadata,
							reviewEmailSent: true,
							reviewEmailSentAt: new Date().toISOString(),
						}),
					},
				});

				sent++;
			} catch (error) {
				this.logger.error(
					`Failed to send review email for ${transaction.id}:`,
					error,
				);
			}
		}

		return {
			checked: reviewTransactions.length,
			sent,
			skipped,
		};
	}
}
