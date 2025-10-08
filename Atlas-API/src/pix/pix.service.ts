import {
	Injectable,
	Logger,
	HttpException,
	HttpStatus,
	NotFoundException,
	ForbiddenException,
} from '@nestjs/common';
import { EulenClientService } from '../services/eulen-client.service';
import { LimitValidationService } from '../services/limit-validation.service';
import { LiquidValidationService } from '../services/liquid-validation.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { PrismaService } from '../prisma/prisma.service';
import { LevelsService } from '../levels/levels.service';
import {
	DepositDto,
	WithdrawDto,
	TransferDto,
	TransactionResponseDto,
} from '../eulen/dto/eulen.dto';
import { TransactionType, TransactionStatus } from '@prisma/client';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PixService {
	private readonly logger = new Logger(PixService.name);

	constructor(
		private readonly eulenClient: EulenClientService,
		private readonly limitValidationService: LimitValidationService,
		private readonly liquidValidation: LiquidValidationService,
		private readonly transactionRepository: TransactionRepository,
		private readonly auditLogRepository: AuditLogRepository,
		private readonly prisma: PrismaService,
		private readonly levelsService: LevelsService,
	) {}

	async createDeposit(
		userId: string,
		depositDto: DepositDto,
	): Promise<TransactionResponseDto> {
		const transactionId = uuidv4();

		try {
			// FIRST: Validate transaction limits (MED compliance)
			await this.limitValidationService.validateAndThrow(
				userId,
				TransactionType.DEPOSIT,
				depositDto.amount,
			);

			// SECOND: Validate user level limits
			await this.levelsService.validateTransactionLimit(
				userId,
				depositDto.amount,
				TransactionType.DEPOSIT
			);

			// Log the request
			await this.auditLogRepository.createLog({
				userId,
				action: 'CREATE_DEPOSIT',
				resource: 'transaction',
				resourceId: transactionId,
				requestBody: depositDto,
			});

			// Create transaction record
			const transaction = await this.transactionRepository.create({
				id: transactionId,
				user: { connect: { id: userId } },
				type: TransactionType.DEPOSIT,
				status: TransactionStatus.PENDING,
				amount: depositDto.amount,
				pixKey: depositDto.pixKey,
				pixKeyType: depositDto.pixKeyType,
				description: depositDto.description,
				externalId: depositDto.externalId,
			});

			// Call Eulen API
			const eulenResponse = await this.eulenClient.createDeposit({
				amount: depositDto.amount,
				pixKey: depositDto.pixKey,
				description: depositDto.description,
			});

			// Update transaction with Eulen response
			await this.transactionRepository.update(transaction.id, {
				externalId: eulenResponse.response?.id || transactionId,
				metadata: JSON.stringify(eulenResponse),
				status: TransactionStatus.PROCESSING,
			});

			// Create webhook if URL provided
			if (depositDto.webhookUrl) {
				// Webhook will be created in createWithWebhook method
			}

			this.logger.log(`Deposit created: ${transaction.id} for user ${userId}`);

			return this.mapTransactionToResponse(transaction);
		} catch (error) {
			// Log error
			await this.auditLogRepository.createLog({
				userId,
				action: 'CREATE_DEPOSIT_FAILED',
				resource: 'transaction',
				resourceId: transactionId,
				requestBody: depositDto,
				responseBody: { error: error.message },
				statusCode: 500,
			});

			this.logger.error(`Failed to create deposit for user ${userId}:`, error);
			throw error;
		}
	}

	async createWithdraw(
		userId: string,
		withdrawDto: WithdrawDto,
	): Promise<TransactionResponseDto> {
		const transactionId = uuidv4();

		try {
			// FIRST: Validate transaction limits (MED compliance)
			await this.limitValidationService.validateAndThrow(
				userId,
				TransactionType.WITHDRAW,
				withdrawDto.amount,
			);

			// SECOND: Validate user level limits
			await this.levelsService.validateTransactionLimit(
				userId,
				withdrawDto.amount,
				TransactionType.WITHDRAW
			);

			// Log the request
			await this.auditLogRepository.createLog({
				userId,
				action: 'CREATE_WITHDRAW',
				resource: 'transaction',
				resourceId: transactionId,
				requestBody: withdrawDto,
			});

			// Create transaction record
			const transaction = await this.transactionRepository.create({
				id: transactionId,
				user: { connect: { id: userId } },
				type: TransactionType.WITHDRAW,
				status: TransactionStatus.PENDING,
				amount: withdrawDto.amount,
				pixKey: withdrawDto.pixKey,
				pixKeyType: withdrawDto.pixKeyType,
				description: withdrawDto.description,
				externalId: withdrawDto.externalId,
			});

			// Call Eulen API
			const eulenResponse = await this.eulenClient.createWithdraw({
				amount: withdrawDto.amount,
				pixKey: withdrawDto.pixKey,
				description: withdrawDto.description,
			});

			// Update transaction with Eulen response
			await this.transactionRepository.update(transaction.id, {
				externalId: eulenResponse.response?.id || transactionId,
				metadata: JSON.stringify(eulenResponse),
				status: TransactionStatus.PROCESSING,
			});

			this.logger.log(`Withdraw created: ${transaction.id} for user ${userId}`);

			return this.mapTransactionToResponse(transaction);
		} catch (error) {
			// Log error
			await this.auditLogRepository.createLog({
				userId,
				action: 'CREATE_WITHDRAW_FAILED',
				resource: 'transaction',
				resourceId: transactionId,
				requestBody: withdrawDto,
				responseBody: { error: error.message },
				statusCode: 500,
			});

			this.logger.error(`Failed to create withdraw for user ${userId}:`, error);
			throw error;
		}
	}

	async createTransfer(
		userId: string,
		transferDto: TransferDto,
	): Promise<TransactionResponseDto> {
		const transactionId = uuidv4();

		try {
			// FIRST: Validate transaction limits (MED compliance)
			await this.limitValidationService.validateAndThrow(
				userId,
				TransactionType.TRANSFER,
				transferDto.amount,
			);

			// SECOND: Validate user level limits
			await this.levelsService.validateTransactionLimit(
				userId,
				transferDto.amount,
				TransactionType.TRANSFER
			);

			// Log the request
			await this.auditLogRepository.createLog({
				userId,
				action: 'CREATE_TRANSFER',
				resource: 'transaction',
				resourceId: transactionId,
				requestBody: transferDto,
			});

			// Create transaction record
			const transaction = await this.transactionRepository.create({
				id: transactionId,
				user: { connect: { id: userId } },
				type: TransactionType.TRANSFER,
				status: TransactionStatus.PENDING,
				amount: transferDto.amount,
				pixKey: transferDto.destinationPixKey,
				pixKeyType: transferDto.pixKeyType,
				description: transferDto.description,
				externalId: transferDto.externalId,
				metadata: JSON.stringify({ sourcePixKey: transferDto.pixKey }),
			});

			// For transfers, we might need to create a withdraw and then a deposit
			// This depends on Eulen API capabilities

			this.logger.log(`Transfer created: ${transaction.id} for user ${userId}`);

			return this.mapTransactionToResponse(transaction);
		} catch (error) {
			// Log error
			await this.auditLogRepository.createLog({
				userId,
				action: 'CREATE_TRANSFER_FAILED',
				resource: 'transaction',
				resourceId: transactionId,
				requestBody: transferDto,
				responseBody: { error: error.message },
				statusCode: 500,
			});

			this.logger.error(`Failed to create transfer for user ${userId}:`, error);
			throw error;
		}
	}

	async getTransactionStatus(
		userId: string,
		transactionId: string,
	): Promise<TransactionResponseDto> {
		try {
			// Get transaction from database
			const transaction =
				await this.transactionRepository.findById(transactionId);

			if (!transaction) {
				throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
			}

			// Verify ownership
			if (transaction.userId !== userId) {
				throw new HttpException(
					'Unauthorized access to transaction',
					HttpStatus.FORBIDDEN,
				);
			}

			// If transaction is still pending/processing, check with Eulen
			if (
				transaction.status === TransactionStatus.PENDING ||
				transaction.status === TransactionStatus.PROCESSING
			) {
				if (transaction.externalId) {
					const eulenStatus = await this.eulenClient.getDepositStatus(
						transaction.externalId,
					);

					// Update local transaction status
					if (eulenStatus.status) {
						const newStatus = this.mapEulenStatus(eulenStatus.status);
						if (newStatus !== transaction.status) {
							await this.transactionRepository.updateStatus(
								transaction.id,
								newStatus,
								eulenStatus.errorMessage,
							);
							transaction.status = newStatus;

							// If transaction completed successfully, process first day logic
							if (newStatus === TransactionStatus.COMPLETED) {
								await this.limitValidationService.processSuccessfulTransaction(
									transaction.userId,
									transaction.type,
								);
							}
						}
					}
				}
			}

			return this.mapTransactionToResponse(transaction);
		} catch (error) {
			this.logger.error(
				`Failed to get transaction status ${transactionId}:`,
				error,
			);
			throw error;
		}
	}

	async getUserTransactions(
		userId: string,
		filters?: {
			status?: TransactionStatus;
			type?: TransactionType;
			skip?: number;
			take?: number;
			startDate?: Date;
			endDate?: Date;
		},
	) {
		const transactions = await this.transactionRepository.findByUserId(
			userId,
			filters,
		);
		return transactions.map((t) => this.mapTransactionToResponse(t));
	}

	async generatePixQRCode(
		userId: string,
		data: {
			amount: number;
			depixAddress?: string; // DePix address (PIX key) - OPTIONAL, will use system default if not provided
			description?: string;
			expirationMinutes?: number;
			payerCpfCnpj?: string; // CPF/CNPJ do pagador (para modo comércio)
			metadata?: any; // Additional metadata to store with the transaction
		},
	): Promise<{ qrCode: string; qrCodeImage: string; transactionId: string }> {
		try {
			// Generate PIX QR Code for user
			// Get user to check validation status and commerce mode
			const user = await this.prisma.user.findUnique({
				where: { id: userId },
				select: {
					commerceMode: true,
					isAccountValidated: true,
					verifiedTaxNumber: true
				},
			});

			if (!user) {
				throw new HttpException('User not found', HttpStatus.NOT_FOUND);
			}

			// For ALL personal deposits (both commerce and non-commerce users), enforce account validation and EUID
			// This ensures only verified users can buy DePix for their own CPF
			// However, skip validation checks for validation payments and payment links (to avoid circular dependency)
			const isValidationPayment = data.metadata && data.metadata.isValidation === true;
			const isPaymentLink = data.metadata && data.metadata.paymentLinkId;

			if (!isValidationPayment && !isPaymentLink) {
				// Check if account is validated
				if (!user.isAccountValidated) {
					throw new HttpException(
						'Conta não validada. Valide sua conta antes de criar depósitos.',
						HttpStatus.FORBIDDEN,
					);
				}

				// Note: verifiedTaxNumber is optional for backwards compatibility with legacy users
				// If present, it will be used as EUID in the Eulen API call below
			}

			// Validate user level limits for QR code generation (skip for payment links)
			if (!isPaymentLink) {
				await this.levelsService.validateTransactionLimit(
					userId,
					data.amount,
					TransactionType.DEPOSIT
				);
			}

			// For personal deposits, only use verified tax number if it's not the problematic EUID
			if (!data.metadata?.isValidation && !data.metadata?.paymentLinkId) { // Skip enforcement for validation payments and payment links
				// Don't send the problematic EUID that Eulen rejects
				if (user.verifiedTaxNumber && user.verifiedTaxNumber !== 'EU022986123087767') {
					data.payerCpfCnpj = user.verifiedTaxNumber; // Use verified tax number as EUID
					this.logger.log(`🔒 Personal deposit: Using verified EUID ${user.verifiedTaxNumber} for user ${userId} (commerceMode: ${user.commerceMode})`);
				} else {
					data.payerCpfCnpj = undefined; // Don't send any EUID to avoid Eulen API rejection
					this.logger.log(`🔄 Personal deposit: Skipping invalid/problematic EUID for user ${userId} - sending without userTaxNumber`);
				}
			}

			// If commerce mode is enabled, allow multiple CPF/CNPJ
			if (user?.commerceMode && data.payerCpfCnpj) {
				// Check if it's EUID format (for Eulen API) or CPF/CNPJ format
				const isEuidFormat = /^[a-zA-Z0-9]+$/.test(data.payerCpfCnpj) &&
									 data.payerCpfCnpj.length >= 3 &&
									 data.payerCpfCnpj.length <= 20 &&
									 !/^\d+$/.test(data.payerCpfCnpj); // Not purely numeric

				if (!isEuidFormat) {
					// Validate traditional CPF/CNPJ format
					const cpfCnpjClean = data.payerCpfCnpj.replace(/\D/g, '');
					if (cpfCnpjClean.length !== 11 && cpfCnpjClean.length !== 14) {
						throw new HttpException(
							'CPF/CNPJ inválido. Use 11 dígitos para CPF ou 14 para CNPJ.',
							HttpStatus.BAD_REQUEST,
						);
					}
				} else {
					this.logger.log(`✅ EUID format detected for commerce user: ${data.payerCpfCnpj}`);
				}
			}

			// NOTE: depixAddress is now optional and should be a PIX key (CPF, CNPJ, email, phone, EVP)
			// NOT a Liquid Network address. The Liquid address validation has been removed
			// because depixAddress is for PIX payment keys, not cryptocurrency addresses.
			// Generate transaction for QR Code
			const metadataToStore = {
				isQrCodePayment: true,
				depixAddress: data.depixAddress, // Also store in metadata for reference
				expirationMinutes: data.expirationMinutes || 18, // Changed to 18 minutes as requested
				payerCpfCnpj: data.payerCpfCnpj, // Store payer CPF/CNPJ if provided
				...data.metadata, // Include any additional metadata (like paymentLinkId)
			};

			this.logger.log(`📝 PIX SERVICE: Creating transaction with metadata: ${JSON.stringify(metadataToStore)}`);

			const transaction = await this.transactionRepository.create({
				user: { connect: { id: userId } },
				type: TransactionType.DEPOSIT,
				status: TransactionStatus.PENDING,
				amount: data.amount,
				description: data.description || 'PIX QR Code Payment',
				pixKey: data.depixAddress, // Store DePix address in pixKey field
				metadata: JSON.stringify(metadataToStore),
			});

			// Call Eulen API to generate QR Code
			this.logger.log(
				`Calling Eulen API to generate QR Code with data: ${JSON.stringify({
					amount: data.amount,
					depixAddress: data.depixAddress,
					description: data.description,
				})}`,
			);

			const eulenResponse = await this.eulenClient.generatePixQRCode({
				amount: data.amount,
				depixAddress: data.depixAddress, // Pass DePix address from frontend
				description: data.description,
				userTaxNumber: data.payerCpfCnpj, // Pass tax number as EUID
			});

			this.logger.log('✅ EULEN API responded successfully');

			this.logger.log(`🔑 EULEN API RESPONSE RECEIVED:`);
			this.logger.log(
				`  - transactionId: ${eulenResponse.transactionId}`,
			);
			this.logger.log(
				`  - qrCode: ${eulenResponse.qrCode ? 'Present' : 'Missing'}`,
			);

			// Generate QR Code image
			const qrCodeData =
				eulenResponse.qrCode ||
				eulenResponse.payload ||
				`PIX:${transaction.id}`;

			this.logger.log(`QR Code data extracted: ${qrCodeData.substring(0, 50)}...`);
			const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
				width: 400,
				margin: 2,
				color: {
					dark: '#000000',
					light: '#FFFFFF',
				},
			});

			// Update transaction with QR code data AND transaction ID
			const updateData: any = {
				externalId: eulenResponse.transactionId, // Save transaction ID for status checks
				metadata: JSON.stringify({
					...JSON.parse(transaction.metadata || '{}'),
					depixAddress: data.depixAddress, // Ensure DePix address is in metadata
					qrCodeData,
					qrCode: qrCodeData, // Store the actual QR code
					serviceUsed: 'eulen', // Track which service was used
					eulenResponse: eulenResponse, // Store real EULEN responses
					transactionId: eulenResponse.transactionId, // Transaction ID reference
				}),
			};

			await this.transactionRepository.update(transaction.id, updateData);

			this.logger.log(
				`PIX QR Code generated for transaction ${transaction.id} with Eulen ID: ${eulenResponse.transactionId}`,
			);

			return {
				qrCode: qrCodeData,
				qrCodeImage,
				transactionId: transaction.id,
			};
		} catch (error) {
			this.logger.error(`Failed to generate PIX QR Code:`, error);
			throw error;
		}
	}

	async validatePixKey(
		pixKey: string,
	): Promise<{ valid: boolean; keyType?: string; ownerName?: string }> {
		try {
			const response = await this.eulenClient.validatePixKey(pixKey);
			return {
				valid: response.valid || true,
				keyType: response.keyType,
				ownerName: response.ownerName,
			};
		} catch (error) {
			this.logger.error(`Failed to validate PIX key ${pixKey}:`, error);
			return { valid: false };
		}
	}

	async getBalance(
		userId: string,
	): Promise<{ available: number; pending: number; total: number }> {
		try {
			// Get balance from Eulen
			const eulenBalance = await this.eulenClient.getBalance();

			// Get user's transaction stats
			const stats =
				await this.transactionRepository.getTransactionStats(userId);

			return {
				available: eulenBalance.available || 0,
				pending: stats.pending || 0,
				total: stats.totalAmount || 0,
			};
		} catch (error) {
			this.logger.error(`Failed to get balance for user ${userId}:`, error);
			throw error;
		}
	}

	async checkDepositStatus(
		userId: string,
		transactionId: string,
	): Promise<any> {
		try {
			this.logger.log(
				`🔍 Checking deposit status for transaction ${transactionId} by user ${userId}`,
			);

			// Get transaction from database
			const transaction =
				await this.transactionRepository.findById(transactionId);

			if (!transaction) {
				throw new NotFoundException('Transaction not found');
			}

			this.logger.log(`🔍 DEBUGGING TRANSACTION DATA:`);
			this.logger.log(`  - Transaction ID: ${transaction.id}`);
			this.logger.log(`  - External ID: ${transaction.externalId}`);
			this.logger.log(
				`  - External ID length: ${transaction.externalId?.length || 'null'}`,
			);
			this.logger.log(`  - External ID type: ${typeof transaction.externalId}`);
			this.logger.log(`  - Status: ${transaction.status}`);

			// Verify transaction belongs to user (unless admin)
			if (transaction.userId !== userId) {
				throw new ForbiddenException('Access denied to this transaction');
			}

			// If transaction is in a final state, return current status without checking Eulen
			if (
				transaction.status === TransactionStatus.COMPLETED ||
				transaction.status === TransactionStatus.FAILED ||
				transaction.status === TransactionStatus.CANCELLED ||
				transaction.status === TransactionStatus.EXPIRED
			) {
				return {
					transactionId: transaction.id,
					status: transaction.status,
					amount: transaction.amount,
					processedAt: transaction.processedAt,
					message: this.getStatusMessage(transaction.status),
					shouldStopPolling: true, // Indicate frontend should stop polling
				};
			}

			// Only check with Eulen API if status is PENDING or PROCESSING
			if (
				transaction.externalId &&
				(transaction.status === TransactionStatus.PENDING ||
					transaction.status === TransactionStatus.PROCESSING)
			) {
				this.logger.log(`📡 CHECKING STATUS WITH EULEN API`);
				this.logger.log(`  - Our Transaction ID: ${transaction.id}`);
				this.logger.log(`  - Eulen ID (externalId): ${transaction.externalId}`);
				this.logger.log(
					`  - Calling: GET /deposit-status?id=${transaction.externalId}`,
				);

				const eulenStatus = await this.eulenClient.getDepositStatus(
					transaction.externalId,
				);

				this.logger.log(
					`📦 Eulen API Response: ${JSON.stringify(eulenStatus)}`,
				);
				this.logger.log(`🎯 Eulen Status: ${eulenStatus.response?.status}`);
				this.logger.log(`💰 Eulen Amount: ${eulenStatus.response?.amount}`);
				this.logger.log(
					`🏦 Eulen DePix Address: ${eulenStatus.response?.depix_address}`,
				);
				this.logger.log(
					`⏰ Eulen Created At: ${eulenStatus.response?.created_at}`,
				);

				// Map Eulen status to our status
				let newStatus: TransactionStatus = transaction.status; // Explicitly type as TransactionStatus
				let shouldStopPolling = false;
				let payerInfo: any = null;

				if (eulenStatus.response?.status === 'depix_sent') {
					newStatus = TransactionStatus.COMPLETED;
					shouldStopPolling = true;

					// Save payer information when payment is completed
					payerInfo = {
						payerEUID: eulenStatus.response.payerEUID,
						payerName: eulenStatus.response.payerName,
						payerTaxNumber: eulenStatus.response.payerTaxNumber,
						bankTxId: eulenStatus.response.bankTxId,
						blockchainTxID: eulenStatus.response.blockchainTxID,
					};

					this.logger.log(`💰 PAYMENT COMPLETED!`);
					this.logger.log(`👤 Payer Name: ${payerInfo.payerName}`);
					this.logger.log(`📋 Payer Tax Number: ${payerInfo.payerTaxNumber}`);
					this.logger.log(`🏦 Bank Transaction ID: ${payerInfo.bankTxId}`);
					this.logger.log(
						`⛓️ Blockchain Transaction ID: ${payerInfo.blockchainTxID}`,
					);
				} else if (
					eulenStatus.response?.status === 'canceled' ||
					eulenStatus.response?.status === 'error'
				) {
					newStatus = TransactionStatus.FAILED;
					shouldStopPolling = true;
				} else if (eulenStatus.response?.status === 'expired') {
					newStatus = TransactionStatus.EXPIRED;
					shouldStopPolling = true;
				} else if (eulenStatus.response?.status === 'under_review') {
					newStatus = TransactionStatus.PROCESSING;
					this.logger.log(`🔍 Payment under review`);
				} else if (eulenStatus.response?.status === 'refunded') {
					newStatus = TransactionStatus.FAILED;
					shouldStopPolling = true;
				}

				// Update transaction if status changed
				if (newStatus !== transaction.status) {
					// If we have payer info, save it in metadata
					if (payerInfo) {
						const currentMetadata = transaction.metadata
							? JSON.parse(transaction.metadata)
							: {};
						await this.transactionRepository.update(transaction.id, {
							status: newStatus,
							processedAt: new Date(),
							metadata: JSON.stringify({
								...currentMetadata,
								payerInfo,
								eulenResponse: eulenStatus.response,
								completedAt: new Date().toISOString(),
							}),
						});
					} else {
						await this.transactionRepository.updateStatus(
							transaction.id,
							newStatus,
							newStatus === TransactionStatus.FAILED
								? 'Payment failed or was canceled'
								: undefined,
						);
					}

					// If transaction completed successfully, process first day logic
					if (newStatus === TransactionStatus.COMPLETED) {
						await this.limitValidationService.processSuccessfulTransaction(
							transaction.userId,
							transaction.type,
						);

						// Process validation payment if applicable
						try {
							const metadata = transaction.metadata
								? JSON.parse(transaction.metadata)
								: {};
							if (metadata.isValidation && payerInfo) {
								this.logger.log(`✅ VALIDATION PAYMENT COMPLETED!`);
								this.logger.log(
									`👤 User validated: ${payerInfo?.payerName} (${payerInfo?.payerTaxNumber})`,
								);
								this.logger.log(
									`💳 Transaction ${transaction.id} completed - triggering account validation`,
								);

								// The account validation cron job will process this automatically
							}
						} catch (error) {
							this.logger.warn(
								`Error processing validation for transaction ${transaction.id}:`,
								error,
							);
						}
					}

					this.logger.log(
						`Transaction ${transactionId} status updated from ${transaction.status} to ${newStatus}`,
					);
				}

				return {
					transactionId: transaction.id,
					externalId: transaction.externalId,
					status: newStatus,
					amount: transaction.amount,
					eulenStatus: eulenStatus.response,
					eulenFullResponse: eulenStatus, // Include full Eulen response for debugging
					message: this.getStatusMessage(newStatus),
					shouldStopPolling,
					debugInfo: {
						eulenResponseReceived: true,
						eulenStatusValue: eulenStatus.response?.status,
						originalStatus: transaction.status,
						newStatus: newStatus,
						timestamp: new Date().toISOString(),
					},
				};
			}

			// Return current status if no external ID
			this.logger.warn(
				`⚠️ Transaction ${transaction.id} has no externalId (Eulen ID) - cannot check status with Eulen`,
			);
			return {
				transactionId: transaction.id,
				status: transaction.status,
				amount: transaction.amount,
				message: 'Waiting for payment confirmation (no Eulen ID)',
				shouldStopPolling: false,
				warning: 'No Eulen ID available for status check',
			};
		} catch (error) {
			this.logger.error(
				`Failed to check deposit status for transaction ${transactionId}:`,
				error,
			);

			// If it's an external API error (like 503, 520 from Eulen), return graceful fallback
			if (
				error.response?.status >= 500 ||
				error.response?.status === 520 ||
				error.code === 'ECONNREFUSED' ||
				error.code === 'ENOTFOUND'
			) {
				this.logger.warn(
					`External API unavailable, returning last known status for transaction ${transactionId}`,
				);

				// Try to get the transaction again to return current status
				try {
					const transaction =
						await this.transactionRepository.findById(transactionId);
					if (transaction) {
						return {
							transactionId: transaction.id,
							status: transaction.status,
							amount: transaction.amount,
							processedAt: transaction.processedAt,
							message: this.getStatusMessage(transaction.status),
							shouldStopPolling: false,
							warning:
								'External payment service temporarily unavailable. Status check will retry automatically.',
							error: 'SERVICE_UNAVAILABLE',
						};
					}
				} catch (dbError) {
					this.logger.error(
						'Database error while fetching fallback status:',
						dbError,
					);
				}
			}

			// For other errors (like 404, 403, validation errors), throw them
			throw error;
		}
	}

	async pingEulenAPI(): Promise<{
		status: string;
		timestamp: Date;
		eulenStatus?: any;
	}> {
		try {
			const eulenResponse = await this.eulenClient.ping();

			return {
				status: 'healthy',
				timestamp: new Date(),
				eulenStatus: eulenResponse,
			};
		} catch (error) {
			this.logger.error('Eulen API ping failed:', error);
			throw new HttpException(
				'Eulen API is not available',
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}
	}

	async getUserLimits(userId: string): Promise<any> {
		try {
			return await this.limitValidationService.getUserLimitsSummary(userId);
		} catch (error) {
			this.logger.error(`Failed to get user limits for ${userId}:`, error);
			throw error;
		}
	}

	async getUserLevelLimits(userId: string): Promise<any> {
		try {
			return await this.levelsService.getUserDailyUsageSummary(userId);
		} catch (error) {
			this.logger.error(`Failed to get user level limits for ${userId}:`, error);
			throw error;
		}
	}

	private getStatusMessage(status: TransactionStatus): string {
		switch (status) {
			case TransactionStatus.COMPLETED:
				return 'Pagamento confirmado e DePix enviado com sucesso';
			case TransactionStatus.PENDING:
				return 'Aguardando pagamento';
			case TransactionStatus.PROCESSING:
				return 'Pagamento recebido, processando conversão para DePix';
			case TransactionStatus.FAILED:
				return 'Pagamento falhou ou foi cancelado';
			case TransactionStatus.CANCELLED:
				return 'Transação cancelada';
			case TransactionStatus.EXPIRED:
				return 'QR Code expirado';
			default:
				return 'Status desconhecido';
		}
	}

	private mapTransactionToResponse(transaction: any): TransactionResponseDto {
		return {
			id: transaction.id,
			type: transaction.type,
			status: transaction.status,
			amount: transaction.amount,
			pixKey: transaction.pixKey,
			pixKeyType: transaction.pixKeyType,
			externalId: transaction.externalId,
			description: transaction.description,
			metadata: transaction.metadata,
			errorMessage: transaction.errorMessage,
			currency: transaction.currency,
			createdAt: transaction.createdAt,
			updatedAt: transaction.updatedAt,
			processedAt: transaction.processedAt,
		};
	}

	private mapEulenStatus(eulenStatus: string): TransactionStatus {
		const statusMap = {
			pending: TransactionStatus.PENDING,
			processing: TransactionStatus.PROCESSING,
			completed: TransactionStatus.COMPLETED,
			success: TransactionStatus.COMPLETED,
			failed: TransactionStatus.FAILED,
			cancelled: TransactionStatus.CANCELLED,
			expired: TransactionStatus.EXPIRED,
		};

		return statusMap[eulenStatus.toLowerCase()] || TransactionStatus.PENDING;
	}
}
