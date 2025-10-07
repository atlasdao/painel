import {
	Injectable,
	Logger,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import {
	WebhookDepositEventDto,
	WebhookEventResponseDto,
	PixPaymentWebhookDto,
} from '../common/dto/webhook.dto';
import { TransactionStatus } from '@prisma/client';
import { BotSyncService } from '../common/services/bot-sync.service';

@Injectable()
export class WebhookService {
	private readonly logger = new Logger(WebhookService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly transactionRepository: TransactionRepository,
		private readonly auditLogRepository: AuditLogRepository,
		private readonly botSyncService: BotSyncService,
	) {}

	async processDepositWebhook(
		eventData: WebhookDepositEventDto,
	): Promise<WebhookEventResponseDto> {
		this.logger.log(
			`🔔 WEBHOOK RECEIVED: Processing deposit event for qrId: ${eventData.qrId}`,
		);

		try {
			// Find transaction by external ID (qrId from Eulen)
			const transaction = await this.prisma.transaction.findFirst({
				where: {
					externalId: eventData.qrId,
					type: 'DEPOSIT',
				},
				include: {
					user: true,
				},
			});

			if (!transaction) {
				this.logger.warn(
					`⚠️ WEBHOOK: Transaction not found for qrId: ${eventData.qrId}`,
				);
				throw new NotFoundException(
					`Transaction not found for qrId: ${eventData.qrId}`,
				);
			}

			this.logger.log(
				`📍 WEBHOOK: Found transaction ${transaction.id} for user ${transaction.userId}`,
			);

			// Map Eulen status to our transaction status
			const previousStatus = transaction.status;
			const newStatus = this.mapEulenStatusToTransactionStatus(
				eventData.status,
			);

			this.logger.log(
				`🔄 WEBHOOK: Status mapping - Eulen: "${eventData.status}" → Atlas: "${newStatus}"`,
			);

			// Only update if status actually changed
			if (previousStatus === newStatus) {
				this.logger.log(
					`✅ WEBHOOK: Status unchanged (${newStatus}) - no update needed`,
				);
				return {
					success: true,
					message: 'Webhook received but status unchanged',
					transactionId: transaction.id,
					previousStatus,
					newStatus,
				};
			}

			// Prepare metadata with webhook event data
			const existingMetadata = transaction.metadata
				? JSON.parse(transaction.metadata)
				: {};
			const updatedMetadata = {
				...existingMetadata,
				webhookEvent: {
					bankTxId: eventData.bankTxId,
					blockchainTxID: eventData.blockchainTxID,
					customerMessage: eventData.customerMessage,
					payerName: eventData.payerName,
					payerEUID: eventData.payerEUID,
					payerTaxNumber: eventData.payerTaxNumber,
					expiration: eventData.expiration,
					pixKey: eventData.pixKey,
					valueInCents: eventData.valueInCents,
					eulenStatus: eventData.status,
					webhookReceivedAt: new Date().toISOString(),
				},
			};

			// Update transaction status and metadata
			const updatedTransaction = await this.prisma.transaction.update({
				where: { id: transaction.id },
				data: {
					status: newStatus,
					metadata: JSON.stringify(updatedMetadata),
					processedAt:
						newStatus === TransactionStatus.COMPLETED
							? new Date()
							: transaction.processedAt,
					errorMessage:
						newStatus === TransactionStatus.FAILED
							? `Webhook: ${eventData.status}`
							: null,
					updatedAt: new Date(),
				},
			});

			this.logger.log(
				`✅ WEBHOOK: Transaction ${transaction.id} status updated: ${previousStatus} → ${newStatus}`,
			);

			// Create audit log for webhook processing
			await this.auditLogRepository.createLog({
				action: 'WEBHOOK_DEPOSIT_EVENT',
				resource: 'transaction',
				resourceId: transaction.id,
				requestBody: eventData,
				responseBody: {
					transactionId: transaction.id,
					previousStatus,
					newStatus,
					success: true,
				},
			});

			// Log additional details for completed transactions
			if (newStatus === TransactionStatus.COMPLETED) {
				this.logger.log(`💰 DEPOSIT COMPLETED: Transaction ${transaction.id}`);
				this.logger.log(
					`  💳 Amount: R$ ${(transaction.amount / 100).toFixed(2)}`,
				);
				this.logger.log(
					`  👤 Payer: ${eventData.payerName} (${eventData.payerTaxNumber})`,
				);
				this.logger.log(`  🔗 Blockchain TX: ${eventData.blockchainTxID}`);
				this.logger.log(`  🏦 Bank TX: ${eventData.bankTxId}`);

				if (eventData.customerMessage) {
					this.logger.log(`  💬 Message: "${eventData.customerMessage}"`);
				}

				// Sync transaction completion to bot database
				try {
					await this.botSyncService.syncTransactionToBot(
						transaction.userId,
						transaction.amount / 100, // Convert from centavos to reais
						'DEPOSIT'
					);
					this.logger.log(`🔗 BOT SYNC: Transaction synced to bot for user ${transaction.userId}`);
				} catch (error) {
					this.logger.error(`Failed to sync transaction to bot:`, error);
					// Don't fail the webhook processing if bot sync fails
				}

				// Check if this transaction is associated with a payment link
				try {
					this.logger.log(`  📊 Checking for payment link metadata...`);
					const metadata = JSON.parse(transaction.metadata || '{}');
					this.logger.log(`  📊 Transaction metadata: ${JSON.stringify(metadata)}`);

					if (metadata.paymentLinkId) {
						this.logger.log(
							`  🔗 Payment Link detected: ${metadata.paymentLinkId}`,
						);

						// Update payment link counters
						await this.updatePaymentLinkCounters(
							metadata.paymentLinkId,
							transaction.id,
							transaction.amount,
						);
					} else {
						this.logger.log(`  ℹ️ No paymentLinkId found in metadata`);
					}
				} catch (error) {
					this.logger.error(
						`Failed to update payment link counters: ${error.message}`,
					);
				}
			}

			return {
				success: true,
				message: 'Webhook processed successfully',
				transactionId: transaction.id,
				previousStatus,
				newStatus,
			};
		} catch (error) {
			this.logger.error(
				`❌ WEBHOOK ERROR: Failed to process deposit event`,
				error,
			);

			// Still log the webhook attempt for debugging
			await this.auditLogRepository.createLog({
				action: 'WEBHOOK_DEPOSIT_EVENT_ERROR',
				resource: 'webhook',
				requestBody: eventData,
				responseBody: {
					error: error.message,
					stack: error.stack,
				},
			});

			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException
			) {
				throw error;
			}

			throw new BadRequestException('Failed to process webhook event');
		}
	}

	/**
	 * Maps Eulen status values to our TransactionStatus enum
	 */
	private mapEulenStatusToTransactionStatus(
		eulenStatus: string,
	): TransactionStatus {
		const statusMap: Record<string, TransactionStatus> = {
			pending: TransactionStatus.PENDING,
			paid: TransactionStatus.PROCESSING,
			depix_sent: TransactionStatus.COMPLETED,
			failed: TransactionStatus.FAILED,
			expired: TransactionStatus.EXPIRED,
			cancelled: TransactionStatus.FAILED, // Treat cancelled as failed
		};

		return statusMap[eulenStatus.toLowerCase()] || TransactionStatus.PENDING;
	}

	/**
	 * Get webhook processing statistics
	 */
	async getWebhookStats(startDate?: Date, endDate?: Date) {
		const whereClause: any = {
			action: {
				in: ['WEBHOOK_DEPOSIT_EVENT', 'WEBHOOK_DEPOSIT_EVENT_ERROR'],
			},
		};

		if (startDate && endDate) {
			whereClause.createdAt = {
				gte: startDate,
				lte: endDate,
			};
		}

		const logs = await this.prisma.auditLog.findMany({
			where: whereClause,
			orderBy: { createdAt: 'desc' },
		});

		const successfulWebhooks = logs.filter(
			(log) => log.action === 'WEBHOOK_DEPOSIT_EVENT',
		).length;
		const failedWebhooks = logs.filter(
			(log) => log.action === 'WEBHOOK_DEPOSIT_EVENT_ERROR',
		).length;

		return {
			totalWebhooks: logs.length,
			successfulWebhooks,
			failedWebhooks,
			successRate:
				logs.length > 0
					? Math.round((successfulWebhooks / logs.length) * 100)
					: 0,
			recentLogs: logs.slice(0, 10), // Last 10 webhook events
		};
	}

	/**
	 * Update payment link counters when a payment is completed
	 */
	private async updatePaymentLinkCounters(
		paymentLinkId: string,
		transactionId: string,
		amount: number,
	) {
		try {
			// Update payment link statistics directly
			await this.prisma.paymentLink.update({
				where: { id: paymentLinkId },
				data: {
					lastPaymentId: transactionId,
					totalPayments: { increment: 1 },
					totalAmount: { increment: amount },
					currentQrCode: null, // Clear QR code to force regeneration
					qrCodeGeneratedAt: null,
				},
			});

			this.logger.log(
				`✅ Payment link ${paymentLinkId} counters updated successfully`,
			);
		} catch (error) {
			this.logger.error(
				`Failed to update payment link ${paymentLinkId}: ${error.message}`,
			);
			throw error;
		}
	}

	/**
	 * Process bot level update webhook
	 */
	async processBotLevelUpdate(eventData: any): Promise<WebhookEventResponseDto> {
		this.logger.log(
			`🤖 BOT WEBHOOK: Processing level update for user ${eventData.userId}`,
		);

		try {
			const { userId, newLevel, botTelegramId } = eventData;

			// Validate required fields
			if (!userId || !newLevel || !botTelegramId) {
				throw new BadRequestException('Missing required fields: userId, newLevel, botTelegramId');
			}

			// Sync user level from bot
			await this.botSyncService.syncUserLevelFromBot(userId, newLevel);

			// Log audit entry
			await this.auditLogRepository.create({
				userId,
				action: 'BOT_LEVEL_UPDATE',
				resource: 'UserLevel',
				resourceId: userId,
				requestBody: JSON.stringify(eventData),
				statusCode: 200,
			});

			this.logger.log(
				`✅ BOT WEBHOOK: Level update processed successfully for user ${userId}`,
			);

			return {
				success: true,
				message: 'Bot level update processed successfully',
				transactionId: undefined,
				previousStatus: undefined,
				newStatus: undefined,
			};
		} catch (error) {
			this.logger.error(`❌ BOT WEBHOOK ERROR: Failed to process level update`, error);
			throw error;
		}
	}

	/**
	 * Process bot transaction sync webhook
	 */
	async processBotTransactionSync(eventData: any): Promise<WebhookEventResponseDto> {
		this.logger.log(
			`🤖 BOT WEBHOOK: Processing transaction sync for user ${eventData.userId}`,
		);

		try {
			const { userId, amount, type, botTelegramId } = eventData;

			// Validate required fields
			if (!userId || !amount || !type || !botTelegramId) {
				throw new BadRequestException('Missing required fields: userId, amount, type, botTelegramId');
			}

			// Sync transaction to bot
			await this.botSyncService.syncTransactionToBot(userId, amount, type);

			// Log audit entry
			await this.auditLogRepository.create({
				userId,
				action: 'BOT_TRANSACTION_SYNC',
				resource: 'Transaction',
				resourceId: userId,
				requestBody: JSON.stringify(eventData),
				statusCode: 200,
			});

			this.logger.log(
				`✅ BOT WEBHOOK: Transaction sync processed successfully for user ${userId}`,
			);

			return {
				success: true,
				message: 'Bot transaction sync processed successfully',
				transactionId: undefined,
				previousStatus: undefined,
				newStatus: undefined,
			};
		} catch (error) {
			this.logger.error(`❌ BOT WEBHOOK ERROR: Failed to process transaction sync`, error);
			throw error;
		}
	}

	/**
	 * Process bot user linking webhook
	 */
	async processBotUserLink(eventData: any): Promise<WebhookEventResponseDto> {
		this.logger.log(
			`🤖 BOT WEBHOOK: Processing user link for EUID ${eventData.euid}`,
		);

		try {
			const { euid, botTelegramId, painelUserId } = eventData;

			// Validate required fields
			if (!euid || !botTelegramId) {
				throw new BadRequestException('Missing required fields: euid, botTelegramId');
			}

			let linkResult = false;

			if (painelUserId) {
				// Manual linking with provided painel user ID
				linkResult = await this.botSyncService.linkUserManually(painelUserId, botTelegramId);
			} else {
				// Automatic linking - trigger sync process
				await this.botSyncService.performBidirectionalSync();
				linkResult = true;
			}

			// Log audit entry
			await this.auditLogRepository.create({
				action: 'BOT_USER_LINK',
				resource: 'User',
				resourceId: painelUserId || euid,
				requestBody: JSON.stringify(eventData),
				statusCode: linkResult ? 200 : 400,
			});

			this.logger.log(
				`✅ BOT WEBHOOK: User linking processed successfully for EUID ${euid}`,
			);

			return {
				success: linkResult,
				message: linkResult ? 'Bot user linking processed successfully' : 'User linking failed',
				transactionId: undefined,
				previousStatus: undefined,
				newStatus: undefined,
			};
		} catch (error) {
			this.logger.error(`❌ BOT WEBHOOK ERROR: Failed to process user link`, error);
			throw error;
		}
	}

	/**
	 * Get bot integration status
	 */
	async getBotStatus() {
		this.logger.log('🤖 BOT WEBHOOK: Getting bot integration status');

		try {
			const status = await this.botSyncService.getSyncStatus();

			return {
				success: true,
				message: 'Bot status retrieved successfully',
				data: status,
			};
		} catch (error) {
			this.logger.error(`❌ BOT WEBHOOK ERROR: Failed to get bot status`, error);
			return {
				success: false,
				message: 'Failed to get bot status',
				error: error.message,
			};
		}
	}

	/**
	 * Process PIX payment webhook
	 */
	async processPixPaymentWebhook(
		eventData: PixPaymentWebhookDto,
	): Promise<WebhookEventResponseDto> {
		this.logger.log(
			`🔔 PIX WEBHOOK: Processing payment for EUID ${eventData.userEUID}, amount: R$ ${eventData.amount}`,
		);

		try {
			// Find user by EUID
			const user = await this.prisma.user.findFirst({
				where: {
					botExternalId: eventData.userEUID,
				},
			});

			if (!user) {
				this.logger.warn(
					`⚠️ PIX WEBHOOK: User not found for EUID: ${eventData.userEUID}`,
				);
				throw new NotFoundException(
					`Usuário não encontrado para EUID: ${eventData.userEUID}`,
				);
			}

			this.logger.log(
				`📍 PIX WEBHOOK: Found user ${user.id} (${user.email}) for EUID ${eventData.userEUID}`,
			);

			// Check if this is a validation payment
			if (eventData.isValidationPayment && eventData.status === 'COMPLETED') {
				this.logger.log(`✅ PIX WEBHOOK: Processing account validation payment`);

				// Update user account validation status
				await this.prisma.user.update({
					where: { id: user.id },
					data: {
						isAccountValidated: true,
						validatedAt: new Date(),
						updatedAt: new Date(),
					},
				});

				this.logger.log(
					`✅ PIX WEBHOOK: Account validated for user ${user.id}`,
				);
			}

			// Create transaction record for the payment
			const transactionData = {
				userId: user.id,
				amount: Math.round(eventData.amount * 100), // Convert to centavos
				type: 'DEPOSIT' as const,
				status: this.mapPixStatusToTransactionStatus(eventData.status),
				externalId: eventData.txId,
				description: eventData.description || 'Pagamento PIX recebido',
				metadata: JSON.stringify({
					pixPayment: {
						endToEndId: eventData.endToEndId,
						txId: eventData.txId,
						currency: eventData.currency,
						timestamp: eventData.timestamp,
						payer: eventData.payer,
						payee: eventData.payee,
						method: eventData.method,
						liquidAddress: eventData.liquidAddress,
						isValidationPayment: eventData.isValidationPayment,
						originalQRCode: eventData.originalQRCode,
						bankMetadata: eventData.bankMetadata,
						webhookReceivedAt: new Date().toISOString(),
					},
				}),
				processedAt: eventData.status === 'COMPLETED' ? new Date() : null,
			};

			const transaction = await this.prisma.transaction.create({
				data: transactionData,
			});

			this.logger.log(
				`✅ PIX WEBHOOK: Transaction ${transaction.id} created for user ${user.id}`,
			);

			// Create audit log for PIX webhook processing
			await this.auditLogRepository.createLog({
				action: 'WEBHOOK_PIX_PAYMENT',
				resource: 'transaction',
				resourceId: transaction.id,
				requestBody: eventData,
				responseBody: {
					transactionId: transaction.id,
					userId: user.id,
					status: transaction.status,
					accountValidated: eventData.isValidationPayment,
					success: true,
				},
			});

			// Sync to bot if payment completed
			if (eventData.status === 'COMPLETED') {
				try {
					await this.botSyncService.syncTransactionToBot(
						user.id,
						eventData.amount, // Already in BRL
						'DEPOSIT'
					);
					this.logger.log(`🔗 BOT SYNC: PIX payment synced to bot for user ${user.id}`);
				} catch (error) {
					this.logger.error(`Failed to sync PIX payment to bot:`, error);
					// Don't fail the webhook processing if bot sync fails
				}
			}

			// Log payment details
			this.logger.log(`💰 PIX PAYMENT PROCESSED: Transaction ${transaction.id}`);
			this.logger.log(
				`  💳 Amount: R$ ${eventData.amount.toFixed(2)}`,
			);
			this.logger.log(
				`  👤 Payer: ${eventData.payer.name} (CPF: ${eventData.payer.cpf})`,
			);
			this.logger.log(`  🔗 End-to-End ID: ${eventData.endToEndId}`);
			this.logger.log(`  🏦 Transaction ID: ${eventData.txId}`);
			this.logger.log(`  🔑 EUID: ${eventData.userEUID}`);
			if (eventData.isValidationPayment) {
				this.logger.log(`  ✅ Account validation: COMPLETED`);
			}

			return {
				success: true,
				message: 'PIX payment webhook processed successfully',
				transactionId: transaction.id,
				previousStatus: undefined,
				newStatus: transaction.status,
			};
		} catch (error) {
			this.logger.error(
				`❌ PIX WEBHOOK ERROR: Failed to process payment`,
				error,
			);

			// Still log the webhook attempt for debugging
			await this.auditLogRepository.createLog({
				action: 'WEBHOOK_PIX_PAYMENT_ERROR',
				resource: 'webhook',
				requestBody: eventData,
				responseBody: {
					error: error.message,
					stack: error.stack,
				},
			});

			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException
			) {
				throw error;
			}

			throw new BadRequestException('Failed to process PIX payment webhook');
		}
	}

	/**
	 * Maps PIX status values to our TransactionStatus enum
	 */
	private mapPixStatusToTransactionStatus(
		pixStatus: string,
	): TransactionStatus {
		const statusMap: Record<string, TransactionStatus> = {
			'COMPLETED': TransactionStatus.COMPLETED,
			'PENDING': TransactionStatus.PENDING,
			'PROCESSING': TransactionStatus.PROCESSING,
			'FAILED': TransactionStatus.FAILED,
			'CANCELLED': TransactionStatus.FAILED,
			'EXPIRED': TransactionStatus.EXPIRED,
		};

		return statusMap[pixStatus.toUpperCase()] || TransactionStatus.PENDING;
	}
}
