import {
	Injectable,
	Logger,
	NotFoundException,
	BadRequestException,
	Inject,
	forwardRef,
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
import { PayerMatchStatus } from '@prisma/client';
import { BotSyncService } from '../common/services/bot-sync.service';
import { WebhookService as PaymentLinkWebhookService } from '../payment-link/webhook.service';
import { ExternalWebhookService } from '../external-api/external-webhook.service';
import { EmailService } from '../services/email.service';
import { IdentityVaultService } from '../identity-vault/identity-vault.service';

@Injectable()
export class WebhookService {
	private readonly logger = new Logger(WebhookService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly transactionRepository: TransactionRepository,
		private readonly auditLogRepository: AuditLogRepository,
		private readonly botSyncService: BotSyncService,
		@Inject(forwardRef(() => PaymentLinkWebhookService))
		private readonly paymentLinkWebhookService: PaymentLinkWebhookService,
		@Inject(forwardRef(() => ExternalWebhookService))
		private readonly externalWebhookService: ExternalWebhookService,
		private readonly emailService: EmailService,
		private readonly identityVaultService: IdentityVaultService,
	) {}

	/**
	 * Validate webhook secret using Basic Authorization
	 * Eulen sends: Authorization: Basic base64(secret:)
	 */
	async validateWebhookSecret(authHeader: string): Promise<boolean> {
		try {
			// Get webhook secret from database
			const setting = await this.prisma.systemSettings.findUnique({
				where: { key: 'EULEN_WEBHOOK_SECRET' },
			});

			if (!setting) {
				this.logger.error('❌ WEBHOOK SECRET: Not configured in database');
				return false;
			}

			const expectedSecret = setting.value;

			// Parse Basic Auth header
			// Format: "Basic base64(secret:)" or "Basic base64(:secret)"
			if (!authHeader.startsWith('Basic ')) {
				this.logger.error('❌ WEBHOOK AUTH: Not Basic authentication');
				return false;
			}

			// Eulen sends the secret in a non-standard way:
			// Instead of: Basic base64(secret:)
			// They send: Basic <plaintext-secret-first-48-chars>
			const receivedValue = authHeader.substring(6).trim();

			this.logger.log('🔍 WEBHOOK AUTH:');
			this.logger.log(`  Received value (first 30 chars): ${receivedValue.substring(0, 30)}...`);
			this.logger.log(`  Received length: ${receivedValue.length}`);
			this.logger.log(`  Expected secret (first 30 chars): ${expectedSecret.substring(0, 30)}...`);
			this.logger.log(`  Expected length: ${expectedSecret.length}`);

			// Eulen truncates secrets to 48 characters, so compare first 48 chars
			const isValid =
				receivedValue === expectedSecret.substring(0, 48) ||  // Eulen's truncated secret
				receivedValue === expectedSecret;                      // Full secret (just in case)

			this.logger.log(`  Match result: ${isValid}`);

			if (!isValid) {
				this.logger.error('❌ WEBHOOK AUTH: Secret mismatch');
			}

			return isValid;
		} catch (error) {
			this.logger.error('❌ WEBHOOK AUTH: Validation error', error);
			return false;
		}
	}

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
					merchantContact: {
						include: { identity: true },
					},
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
			let newStatus = this.mapEulenStatusToTransactionStatus(
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
			let identityResult: { matchStatus: PayerMatchStatus } | null = null;

			if (
				(newStatus === TransactionStatus.PROCESSING ||
					newStatus === TransactionStatus.COMPLETED) &&
				(eventData.payerEUID || eventData.payerTaxNumber || eventData.payerName)
			) {
				const session = existingMetadata.sessionToken
					? await this.prisma.paymentLinkSession.findUnique({
							where: { sessionToken: existingMetadata.sessionToken },
						})
					: null;

				identityResult =
					await this.identityVaultService.upsertMerchantContactFromPayment({
						merchantId: transaction.userId,
						transactionId: transaction.id,
						payerName: eventData.payerName,
						payerTaxNumber: eventData.payerTaxNumber,
						payerEuid: eventData.payerEUID,
						expectedTaxNumber: session?.payerTaxNumber,
						expectedEuid: transaction.merchantContact?.identity?.euid,
					});

				if (identityResult.matchStatus === PayerMatchStatus.MISMATCH) {
					newStatus = TransactionStatus.IN_REVIEW;
				}
			}

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
					payerMatchStatus: identityResult?.matchStatus,
					webhookReceivedAt: new Date().toISOString(),
				},
			};

			// Update transaction status and metadata
			const updatedTransaction = await this.prisma.transaction.update({
				where: { id: transaction.id },
				data: {
					status: newStatus,
					metadata: JSON.stringify(updatedMetadata),
					buyerName: eventData.payerName, // Save payer name to buyerName field
					processedAt:
						newStatus === TransactionStatus.COMPLETED
							? new Date()
							: transaction.processedAt,
					errorMessage:
						identityResult?.matchStatus === PayerMatchStatus.MISMATCH
							? 'Webhook: payer identity mismatch'
							: newStatus === TransactionStatus.FAILED
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

			// Send email notification when payment is confirmed
			// D+1 users: Send email on PROCESSING (payment received, waiting for settlement)
			// D+0 users: Send email on COMPLETED (instant settlement)
			if (newStatus === TransactionStatus.PROCESSING || newStatus === TransactionStatus.COMPLETED) {
				// Send email notification to merchant if enabled
				try {
					const user = await this.prisma.user.findUnique({
						where: { id: transaction.userId },
						select: {
							email: true,
							username: true,
							notifyApprovedSales: true,
							delayedPaymentEnabled: true,
						},
					});

					if (user && user.notifyApprovedSales) {
						// Determine if we should send the email based on user's payment mode
						// D+1 (delayedPaymentEnabled = true): Send on PROCESSING
						// D+0 (delayedPaymentEnabled = false): Send on COMPLETED
						const shouldSendEmail =
							(user.delayedPaymentEnabled && newStatus === TransactionStatus.PROCESSING) ||
							(!user.delayedPaymentEnabled && newStatus === TransactionStatus.COMPLETED);

						if (shouldSendEmail) {
							this.logger.log(`💳 PAYMENT CONFIRMED: Transaction ${transaction.id}`);
							this.logger.log(
								`  💳 Amount: R$ ${(transaction.amount / 100).toFixed(2)}`,
							);
							this.logger.log(
								`  👤 Payer: ${eventData.payerName} (${eventData.payerTaxNumber})`,
							);
							this.logger.log(
								`  📧 Sending email (D+${user.delayedPaymentEnabled ? '1' : '0'} mode, status: ${newStatus})`,
							);

							const metadata = JSON.parse(transaction.metadata || '{}');

							// Calculate settlement info based on user's delay settings
							let settlementInfo: { isInstant: boolean; scheduledAt?: Date } = { isInstant: true };

							if (user.delayedPaymentEnabled) {
								// D+1: Calculate next settlement window (6h or 18h)
								const now = new Date();
								const minPaymentTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
								const minHour = minPaymentTime.getHours();
								const scheduledAt = new Date(minPaymentTime);

								if (minHour < 6) {
									scheduledAt.setHours(6, 0, 0, 0);
								} else if (minHour < 18) {
									scheduledAt.setHours(18, 0, 0, 0);
								} else {
									scheduledAt.setDate(scheduledAt.getDate() + 1);
									scheduledAt.setHours(6, 0, 0, 0);
								}

								settlementInfo = { isInstant: false, scheduledAt };
							}

							await this.emailService.sendApprovedSaleEmail(
								user.email,
								user.username,
								{
									productName: transaction.description || 'Pagamento PIX',
									amount: transaction.amount, // Already in reais
									buyerName: eventData.payerName || metadata.webhookEvent?.payerName,
									transactionId: transaction.id,
									paymentMethod: 'PIX',
									createdAt: new Date(),
									settlementInfo,
								}
							);
							this.logger.log(`📧 SALE EMAIL: Notification sent to ${user.email}`);
						}
					}
				} catch (error) {
					this.logger.error(`Failed to send sale notification email:`, error);
					// Don't fail the webhook processing if email fails
				}
			}

			// ============================================================
			// EXTERNAL API WEBHOOK - Trigger on PROCESSING for D+1 compatibility
			// This ensures clients receive immediate notification when payment is confirmed,
			// even if settlement is delayed (D+1). Maintains backward compatibility by
			// always sending status: "COMPLETED" with optional settlement info.
			// ============================================================
			if ((newStatus === TransactionStatus.PROCESSING || newStatus === TransactionStatus.COMPLETED)) {
				try {
					const metadata = JSON.parse(transaction.metadata || '{}');

					// Check if this is External API and webhook hasn't been sent yet
					if (metadata.source === 'EXTERNAL_API' && transaction.id && !metadata.externalWebhookSent) {
						this.logger.log(`  🔗 External API transaction detected: ${transaction.id} (status: ${newStatus})`);

						// Get user to check D+1 settings
						const apiUser = await this.prisma.user.findUnique({
							where: { id: transaction.userId },
							select: { delayedPaymentEnabled: true },
						});

						// Calculate settlement info
						let settlement: { type: string; scheduledAt: string | null } = {
							type: 'instant',
							scheduledAt: null,
						};

						if (apiUser?.delayedPaymentEnabled && newStatus === TransactionStatus.PROCESSING) {
							// D+1: Calculate next settlement window (6h or 18h)
							const now = new Date();
							const minPaymentTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
							const minHour = minPaymentTime.getHours();
							const scheduledAt = new Date(minPaymentTime);

							if (minHour < 6) {
								scheduledAt.setHours(6, 0, 0, 0);
							} else if (minHour < 18) {
								scheduledAt.setHours(18, 0, 0, 0);
							} else {
								scheduledAt.setDate(scheduledAt.getDate() + 1);
								scheduledAt.setHours(6, 0, 0, 0);
							}

							settlement = {
								type: 'delayed',
								scheduledAt: scheduledAt.toISOString(),
							};
							this.logger.log(`  ⏰ D+1 Settlement scheduled for: ${scheduledAt.toISOString()}`);
						}

						try {
							// Prepare payment data for webhook
							const paymentData = {
								amount: transaction.amount / 100, // Convert from centavos to reais
								merchantOrderId: metadata.merchantOrderId,
								processedAt: new Date().toISOString(),
								payerName: metadata.webhookEvent?.payerName || eventData.payerName,
								payerTaxNumber: metadata.webhookEvent?.payerTaxNumber || eventData.payerTaxNumber,
								settlement, // New field for D+1 compatibility
								metadata: {
									blockchainTxID: metadata.webhookEvent?.blockchainTxID || eventData.blockchainTxID,
									depixAddress: metadata.depixAddress,
									...metadata.webhookEvent,
								},
							};

							// Trigger transaction.paid webhook
							await this.externalWebhookService.triggerTransactionPaid(
								transaction.id,
								paymentData
							);

							this.logger.log(`  ✅ External API webhook triggered successfully for transaction ${transaction.id} (settlement: ${settlement.type})`);

							// Mark webhook as sent to avoid duplicates
							await this.prisma.transaction.update({
								where: { id: transaction.id },
								data: {
									metadata: JSON.stringify({
										...metadata,
										externalWebhookSent: true,
										externalWebhookSentAt: new Date().toISOString(),
										settlementType: settlement.type,
									}),
								},
							});
						} catch (webhookError) {
							this.logger.error(`  ❌ Failed to trigger External API webhook:`, webhookError);
							// Don't fail the main webhook processing if external webhook fails
						}
					}
				} catch (error) {
					this.logger.error(`Failed to process External API webhook:`, error);
					// Don't fail the main webhook processing
				}
			}

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

						// Trigger payment.completed webhook for payment links
						try {
							this.logger.log(`  🎯 Triggering payment.completed webhook for payment link ${metadata.paymentLinkId}`);

							const webhookPayload = {
								paymentLinkId: metadata.paymentLinkId,
								transactionId: transaction.id,
								amount: transaction.amount / 100, // Convert from centavos to reais
								status: 'COMPLETED',
								externalId: transaction.externalId,
								description: transaction.description,
								processedAt: new Date().toISOString(),
								metadata: metadata.webhookEvent || {},
							};

							await this.paymentLinkWebhookService.triggerWebhooks(
								metadata.paymentLinkId,
								'payment.completed',
								webhookPayload
							);

							this.logger.log(`  ✅ Payment.completed webhook triggered successfully for ${metadata.paymentLinkId}`);
						} catch (webhookError) {
							this.logger.error(`  ❌ Failed to trigger payment.completed webhook:`, webhookError);
							// Don't fail the main webhook processing if payment link webhook fails
						}
					} else {
						this.logger.log(`  ℹ️ No paymentLinkId found in metadata`);
					}
				} catch (error) {
					this.logger.error(
						`Failed to update payment link counters: ${error.message}`,
					);
				}
			}

			// NOTE: Review emails are now handled by a cron job (ReviewEmailService) that only sends
			// emails for transactions that stay in IN_REVIEW for more than 2 minutes.
			// This prevents sending unnecessary "Em Revisão" emails for transactions that
			// quickly pass through the review stage (Eulen sends under_review → depix_sent within seconds).
			//
			// See: src/services/review-email.service.ts
			if (newStatus === TransactionStatus.IN_REVIEW) {
				this.logger.log(`⚠️ TRANSACTION IN REVIEW: ${transaction.id} - Review email will be sent by cron job if status persists`);
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
			under_review: TransactionStatus.IN_REVIEW,
			depix_sent: TransactionStatus.COMPLETED,
			delayed: TransactionStatus.PROCESSING, // Payment received, waiting for D+1 delay
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

				// Upgrade user to level 1 (Bronze) with proper limits
				await this.upgradeUserToLevelOne(user.id);

				this.logger.log(
					`✅ PIX WEBHOOK: Account validated and upgraded to level 1 for user ${user.id}`,
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

	/**
	 * Upgrade user to level 1 (Bronze) with proper limits after account validation
	 */
	private async upgradeUserToLevelOne(userId: string): Promise<void> {
		const LEVEL_1_DAILY_LIMIT = 300; // Bronze tier daily limit

		try {
			// Check if user already has a UserLevel record
			const existingLevel = await this.prisma.userLevel.findUnique({
				where: { userId },
			});

			if (existingLevel) {
				// User already has a level record, upgrade it to level 1
				const oldLevel = existingLevel.level;

				if (oldLevel === 0) {
					await this.prisma.userLevel.update({
						where: { userId },
						data: {
							level: 1,
							dailyLimitBrl: LEVEL_1_DAILY_LIMIT,
							lastLevelUpgrade: new Date(),
						},
					});

					// Create level history record
					await this.prisma.levelHistory.create({
						data: {
							userId,
							previousLevel: 0,
							newLevel: 1,
							volumeAtChange: Number(existingLevel.totalVolumeBrl || 0),
							reason: 'Account validation - automatic upgrade to Bronze tier',
						},
					});

					this.logger.log(`User ${userId} upgraded from level 0 to level 1 (Bronze)`);
				}
			} else {
				// Create new UserLevel record at level 1
				await this.prisma.userLevel.create({
					data: {
						userId,
						level: 1,
						dailyLimitBrl: LEVEL_1_DAILY_LIMIT,
						dailyUsedBrl: 0,
						totalVolumeBrl: 0,
						completedTransactions: 0,
						lastLevelUpgrade: new Date(),
					},
				});

				// Create level history record
				await this.prisma.levelHistory.create({
					data: {
						userId,
						previousLevel: 0,
						newLevel: 1,
						volumeAtChange: 0,
						reason: 'Account validation - automatic upgrade to Bronze tier',
					},
				});

				this.logger.log(`User ${userId} initialized at level 1 (Bronze)`);
			}
		} catch (error) {
			this.logger.error(`Failed to upgrade user ${userId} to level 1:`, error);
			// Don't throw error - validation should still succeed even if level upgrade fails
		}
	}
}
