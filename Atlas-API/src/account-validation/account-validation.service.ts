import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PixService } from '../pix/pix.service';
import { LiquidValidationService } from '../services/liquid-validation.service';
import { TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class AccountValidationService {
	private readonly logger = new Logger(AccountValidationService.name);
	private readonly VALIDATION_AMOUNT = 1.0; // R$ 1,00 - fallback value matching admin system default
	private readonly INITIAL_DAILY_LIMIT = 6000; // R$ 6,000
	private readonly LIMIT_TIERS = [6000, 10000, 20000, 40000, 80000, 160000];
	private readonly THRESHOLD_TIERS = [
		50000, 150000, 400000, 1000000, 2500000, 5000000,
	];

	constructor(
		private readonly prisma: PrismaService,
		private readonly pixService: PixService,
		private readonly liquidValidation: LiquidValidationService,
	) {}

	/**
	 * Get the validation amount from database settings or fallback to default
	 */
	private async getValidationAmount(): Promise<number> {
		try {
			const validationAmountSetting =
				await this.prisma.systemSettings.findUnique({
					where: { key: 'validation_amount' },
				});

			if (validationAmountSetting) {
				return JSON.parse(validationAmountSetting.value);
			}
		} catch (error) {
			this.logger.warn(
				'Failed to fetch validation amount from settings, using default',
				error,
			);
		}

		return this.VALIDATION_AMOUNT;
	}

	async checkValidationStatus(userId: string): Promise<{
		isValidated: boolean;
		validationPaymentId?: string;
		validatedAt?: Date;
		validationQrCode?: string;
		requiresValidation?: boolean;
	}> {
		console.log(
			'AccountValidationService.checkValidationStatus called with userId:',
			userId,
			'type:',
			typeof userId,
		);

		if (!userId) {
			throw new Error('User ID is required for validation status check');
		}

		// Check if validation is enabled in system settings
		const validationEnabled = await this.isValidationEnabled();

		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				isAccountValidated: true,
				validationPaymentId: true,
				validatedAt: true,
			},
		});

		if (!user) {
			throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		}

		// If validation is disabled, treat user as validated
		if (!validationEnabled) {
			return {
				isValidated: true,
				requiresValidation: false,
				validationPaymentId: user.validationPaymentId || undefined,
				validatedAt: user.validatedAt || undefined,
			};
		}

		// If already validated, return status
		if (user.isAccountValidated) {
			return {
				isValidated: true,
				requiresValidation: false,
				validationPaymentId: user.validationPaymentId || undefined,
				validatedAt: user.validatedAt || undefined,
			};
		}

		// Get the current validation amount and check for pending validation transaction
		const validationAmount = await this.getValidationAmount();
		const pendingValidation = await this.prisma.transaction.findFirst({
			where: {
				userId,
				type: TransactionType.DEPOSIT,
				amount: validationAmount,
				status: TransactionStatus.PENDING,
				description: { contains: 'Validação de conta' },
			},
			orderBy: { createdAt: 'desc' },
		});

		return {
			isValidated: false,
			requiresValidation: true,
			validationQrCode: pendingValidation?.metadata
				? JSON.parse(pendingValidation.metadata).qrCode
				: undefined,
		};
	}

	async createValidationPayment(
		userId: string,
		depixAddress?: string,
	): Promise<{
		transactionId: string;
		qrCode: string;
		amount: number;
	}> {
		const validationAmount = await this.getValidationAmount();

		// Note: EUID will be automatically extracted from the webhook when payment is completed
		// No need to collect CPF/CNPJ or validate Liquid address manually as it comes from the PIX payment data

		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		}

		if (user.isAccountValidated) {
			throw new HttpException(
				'Account already validated',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Check for existing pending validation
		const existingValidation = await this.prisma.transaction.findFirst({
			where: {
				userId,
				type: TransactionType.DEPOSIT,
				amount: validationAmount,
				status: TransactionStatus.PENDING,
				description: { contains: 'Validação de conta' },
			},
		});

		if (existingValidation) {
			const metadata = existingValidation.metadata
				? JSON.parse(existingValidation.metadata)
				: {};

			// Check if the existing QR code is valid (should be a string and not empty/true/false)
			const storedQrCode = metadata.qrCode;
			const isValidQrCode =
				typeof storedQrCode === 'string' && storedQrCode.length > 10;

			if (isValidQrCode) {
				this.logger.log(
					`Returning existing validation transaction ${existingValidation.id} with valid QR code`,
				);
				return {
					transactionId: existingValidation.id,
					qrCode: storedQrCode,
					amount: validationAmount,
				};
			} else {
				this.logger.warn(
					`Existing validation transaction ${existingValidation.id} has invalid QR code data: ${typeof storedQrCode} - ${storedQrCode}. Creating new payment.`,
				);
				// Delete the invalid transaction and create a new one
				await this.prisma.transaction.delete({
					where: { id: existingValidation.id },
				});
			}
		}

		try {
			this.logger.log(
				`Creating validation payment for user ${userId} with depixAddress: ${depixAddress}`,
			);

			// Generate QR code for validation payment via PIX service
			// IMPORTANT: Pass depixAddress so the Eulen API knows where to send the BRL-L after receiving PIX payment
			const qrCodeData = await this.pixService.generatePixQRCode(userId, {
				amount: validationAmount,
				depixAddress: depixAddress, // Pass user's Liquid address so payment goes to them
				description: 'Validação de conta Atlas DAO',
				// Note: No payerCpfCnpj restriction - EUID will come from webhook
				metadata: {
					isValidation: true,
					userLiquidAddress: depixAddress, // Store user's Liquid address in metadata for reference
				},
			});

			this.logger.log('✅ PIX service responded successfully for validation payment');

			this.logger.log(`QR Code data received: ${JSON.stringify(qrCodeData)}`);
			this.logger.log(`QR Code value: ${qrCodeData.qrCode}`);
			this.logger.log(`🔑 Transaction ID: ${qrCodeData.transactionId}`);

			// Handle PIX service response
			if (qrCodeData.transactionId) {
				// Get the transaction to preserve the externalId set by generatePixQRCode
				const existingTransaction = await this.prisma.transaction.findUnique({
					where: { id: qrCodeData.transactionId },
				});

				this.logger.log(`📋 Transaction before validation update:`);
				this.logger.log(`  - Our UUID: ${existingTransaction?.id}`);
				this.logger.log(
					`  - External ID: ${existingTransaction?.externalId}`,
				);

				await this.prisma.transaction.update({
					where: { id: qrCodeData.transactionId },
					data: {
						// DON'T overwrite externalId - it's already set correctly by generatePixQRCode
						metadata: JSON.stringify({
							...(existingTransaction?.metadata ? JSON.parse(existingTransaction.metadata) : {}),
							qrCode: qrCodeData.qrCode,
							isValidation: true,
							userLiquidAddress: depixAddress, // Store the user's Liquid address for later use
						}),
					},
				});

				this.logger.log(`✅ Validation payment created for user ${userId}`);

				return {
					transactionId: qrCodeData.transactionId,
					qrCode: qrCodeData.qrCode,
					amount: validationAmount,
				};
			} else {
				throw new HttpException(
					'Failed to create transaction',
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}
		} catch (error) {
			this.logger.error('Failed to create validation payment:', error);

			// Enhanced error handling with better user messages
			if (error.message?.includes('jwt malformed') || error.message?.includes('JWT') || error.message?.includes('Invalid token')) {
				this.logger.warn('🔧 EULEN API authentication issue detected');

				// In development, this is expected with test tokens
				if (process.env.NODE_ENV === 'development') {
					this.logger.warn('Development mode: EULEN API authentication failed, but fallback should handle this');
					throw new HttpException(
						'Erro de configuração da API. Usando modo de desenvolvimento. Se persistir, contate o suporte.',
						HttpStatus.SERVICE_UNAVAILABLE,
					);
				} else {
					throw new HttpException(
						'Erro de configuração do sistema de pagamento. Por favor, contate o suporte.',
						HttpStatus.SERVICE_UNAVAILABLE,
					);
				}
			}

			if (error.message?.includes('invalid tax number') || error.message?.includes('CPF') || error.message?.includes('CNPJ')) {
				throw new HttpException(
					'CPF/CNPJ inválido. Por favor, verifique seus dados.',
					HttpStatus.BAD_REQUEST,
				);
			}

			if (error.message?.includes('Liquid') || error.message?.includes('endereço')) {
				throw new HttpException(
					'Endereço DePix inválido. Por favor, verifique o endereço e tente novamente.',
					HttpStatus.BAD_REQUEST,
				);
			}

			// Check for specific API configuration issues
			if (error.message?.includes('Eulen API não configurado') || error.message?.includes('token')) {
				throw new HttpException(
					'Sistema de pagamento em configuração. Entre em contato com o suporte para ativar sua conta.',
					HttpStatus.SERVICE_UNAVAILABLE,
				);
			}

			if (error.message?.includes('Eulen API') || error.message?.includes('temporariamente') || error.message?.includes('SERVICE_UNAVAILABLE')) {
				throw new HttpException(
					'Serviço de pagamento temporariamente indisponível. Tente novamente em alguns minutos.',
					HttpStatus.SERVICE_UNAVAILABLE,
				);
			}

			if (error.message?.includes('rate limit') || error.message?.includes('429')) {
				throw new HttpException(
					'Muitas tentativas. Por favor, aguarde alguns minutos e tente novamente.',
					HttpStatus.TOO_MANY_REQUESTS,
				);
			}

			// Check if it's already an HttpException and preserve the message
			if (error instanceof HttpException) {
				throw error;
			}

			// Log the full error for debugging
			this.logger.error('Unhandled validation payment error:', {
				message: error.message,
				stack: error.stack,
				response: error.response?.data
			});

			// Generic error message for other cases
			throw new HttpException(
				'Erro ao criar pagamento de validação. Por favor, tente novamente ou contate o suporte.',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async processValidationPayment(transactionId: string): Promise<void> {
		const transaction = await this.prisma.transaction.findUnique({
			where: { id: transactionId },
			include: { user: true },
		});

		if (!transaction) {
			throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
		}

		const metadata = transaction.metadata
			? JSON.parse(transaction.metadata)
			: {};

		if (!metadata.isValidation) {
			return; // Not a validation transaction
		}

		if (transaction.status !== TransactionStatus.COMPLETED) {
			return; // Payment not completed yet
		}

		// Update user account as validated and store verified EUID from webhook
		// Extract EUID from webhook metadata if available
		const webhookMetadata = metadata.webhookEvent;
		const verifiedEUID = webhookMetadata?.payerEUID;

		// Extract liquid wallet address from transaction metadata
		const userLiquidAddress = metadata.userLiquidAddress;

		await this.prisma.user.update({
			where: { id: transaction.userId },
			data: {
				isAccountValidated: true,
				validationPaymentId: transactionId,
				validatedAt: new Date(),
				verifiedTaxNumber: verifiedEUID, // Store the EUID from webhook as verified tax number
				defaultWalletAddress: userLiquidAddress || null, // Store the liquid wallet address
				defaultWalletType: userLiquidAddress ? "LIQUID" : null, // Set wallet type to LIQUID if address is provided
			},
		});

		// Initialize user reputation
		await this.initializeUserReputation(transaction.userId);

		// Upgrade user to level 1 (Bronze) with proper limits
		await this.upgradeToLevelOne(transaction.userId);

		this.logger.log(`Account validated and upgraded to level 1 for user ${transaction.userId}`);
	}

	async upgradeToLevelOne(userId: string): Promise<void> {
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

	// Process all completed validation transactions that haven't been processed yet
	async processCompletedValidations(): Promise<{ processed: number }> {
		try {
			// Find completed validation transactions where user is not yet validated
			const completedValidations = await this.prisma.transaction.findMany({
				where: {
					status: TransactionStatus.COMPLETED,
					metadata: {
						contains: '"isValidation":true',
					},
					user: {
						isAccountValidated: false,
					},
				},
				include: { user: true },
			});

			let processedCount = 0;

			for (const transaction of completedValidations) {
				try {
					await this.processValidationPayment(transaction.id);
					processedCount++;
					this.logger.log(
						`Processed validation for transaction ${transaction.id}`,
					);
				} catch (error) {
					this.logger.error(
						`Failed to process validation for transaction ${transaction.id}:`,
						error,
					);
				}
			}

			if (processedCount > 0) {
				this.logger.log(`Processed ${processedCount} validation transactions`);
			}

			return { processed: processedCount };
		} catch (error) {
			this.logger.error('Error processing completed validations:', error);
			return { processed: 0 };
		}
	}

	// Cron job to automatically process completed validation transactions
	@Cron(CronExpression.EVERY_MINUTE)
	async cronProcessValidations() {
		try {
			const result = await this.processCompletedValidations();

			if (result.processed > 0) {
				this.logger.log(
					`Cron: Processed ${result.processed} validation transactions`,
				);
			}
		} catch (error) {
			this.logger.error('Error in validation processing cron job:', error);
		}
	}

	async initializeUserReputation(userId: string): Promise<void> {
		const existingReputation = await this.prisma.userReputation.findUnique({
			where: { userId },
		});

		if (!existingReputation) {
			await this.prisma.userReputation.create({
				data: {
					userId,
					reputationScore: 50, // Start with neutral reputation
					currentDailyLimit: this.INITIAL_DAILY_LIMIT,
					nextLimitThreshold: this.THRESHOLD_TIERS[0],
					limitTier: 1,
				},
			});
			this.logger.log(`User reputation initialized for user ${userId}`);
		}
	}

	async updateUserReputation(
		userId: string,
		transactionAmount: number,
		success: boolean,
	): Promise<void> {
		let reputation = await this.prisma.userReputation.findUnique({
			where: { userId },
		});

		if (!reputation) {
			await this.initializeUserReputation(userId);
			reputation = await this.prisma.userReputation.findUnique({
				where: { userId },
			});
		}

		if (!reputation) return;

		const updates: any = {};

		if (success) {
			updates.totalApprovedVolume =
				reputation.totalApprovedVolume + transactionAmount;
			updates.totalApprovedCount = reputation.totalApprovedCount + 1;

			// Calculate new reputation score
			const successRate =
				(reputation.totalApprovedCount + 1) /
				(reputation.totalApprovedCount + 1 + reputation.totalRejectedCount);
			updates.reputationScore = Math.min(100, successRate * 100);

			// Check if user qualifies for limit increase
			if (updates.totalApprovedVolume >= reputation.nextLimitThreshold) {
				const newTier = Math.min(
					reputation.limitTier + 1,
					this.LIMIT_TIERS.length,
				);
				updates.limitTier = newTier;
				updates.currentDailyLimit = this.LIMIT_TIERS[newTier - 1];
				updates.nextLimitThreshold =
					this.THRESHOLD_TIERS[newTier - 1] ||
					this.THRESHOLD_TIERS[this.THRESHOLD_TIERS.length - 1];

				this.logger.log(
					`User ${userId} upgraded to tier ${newTier} with limit R$ ${updates.currentDailyLimit}`,
				);
			}
		} else {
			updates.totalRejectedCount = reputation.totalRejectedCount + 1;

			// Recalculate reputation score
			const successRate =
				reputation.totalApprovedCount /
				(reputation.totalApprovedCount + (reputation.totalRejectedCount + 1));
			updates.reputationScore = Math.max(0, successRate * 100);
		}

		await this.prisma.userReputation.update({
			where: { userId },
			data: updates,
		});
	}

	async getUserLimitsAndReputation(userId: string): Promise<any> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: {
				reputation: true,
			},
		});

		if (!user) {
			throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		}

		if (!user.isAccountValidated) {
			const validationAmount = await this.getValidationAmount();
			return {
				isValidated: false,
				requiresValidation: true,
				validationAmount,
			};
		}

		const reputation = user.reputation || {
			reputationScore: 0,
			currentDailyLimit: 0,
			limitTier: 0,
			totalApprovedVolume: 0,
			totalApprovedCount: 0,
			totalRejectedCount: 0,
			nextLimitThreshold: this.THRESHOLD_TIERS[0],
		};

		return {
			isValidated: true,
			validatedAt: user.validatedAt,
			limits: {
				daily: reputation.currentDailyLimit,
				tier: reputation.limitTier,
				nextThreshold: reputation.nextLimitThreshold,
				progressToNextTier:
					(reputation.totalApprovedVolume / reputation.nextLimitThreshold) *
					100,
			},
			reputation: {
				score: reputation.reputationScore,
				approvedVolume: reputation.totalApprovedVolume,
				approvedCount: reputation.totalApprovedCount,
				rejectedCount: reputation.totalRejectedCount,
			},
		};
	}

	async adjustUserLimits(
		userId: string,
		dailyLimit?: number,
		tier?: number,
		adminNotes?: string,
	): Promise<void> {
		const reputation = await this.prisma.userReputation.findUnique({
			where: { userId },
		});

		if (!reputation) {
			await this.initializeUserReputation(userId);
		}

		const updates: any = {};

		if (dailyLimit !== undefined) {
			updates.currentDailyLimit = dailyLimit;
		}

		if (tier !== undefined) {
			updates.limitTier = tier;
			if (!dailyLimit) {
				updates.currentDailyLimit =
					this.LIMIT_TIERS[Math.min(tier - 1, this.LIMIT_TIERS.length - 1)];
			}
			updates.nextLimitThreshold =
				this.THRESHOLD_TIERS[
					Math.min(tier - 1, this.THRESHOLD_TIERS.length - 1)
				];
		}

		await this.prisma.userReputation.update({
			where: { userId },
			data: updates,
		});

		this.logger.log(
			`User ${userId} limits adjusted by admin: ${JSON.stringify(updates)}`,
		);
	}

	async getValidationRequirements(): Promise<{
		amount: number;
		description: string;
		benefits: string[];
	}> {
		const validationAmount = await this.getValidationAmount();
		return {
			amount: validationAmount,
			description: `Pagamento único de R$ ${validationAmount.toFixed(2).replace('.', ',')} para validar sua conta`,
			benefits: [
				'Gerar depósitos ilimitados',
				'Acesso completo às funcionalidades',
				'Suporte prioritário',
				'Limites aumentados progressivamente',
			],
		};
	}

	async getValidationSettings(): Promise<{
		validationEnabled: boolean;
		validationAmount: number;
		initialDailyLimit: number;
		limitTiers: number[];
		thresholdTiers: number[];
	}> {
		// Get settings from database or use defaults
		const validationEnabledSetting =
			await this.prisma.systemSettings.findUnique({
				where: { key: 'validation_enabled' },
			});

		const validationAmountSetting = await this.prisma.systemSettings.findUnique(
			{
				where: { key: 'validation_amount' },
			},
		);

		const initialDailyLimitSetting =
			await this.prisma.systemSettings.findUnique({
				where: { key: 'initial_daily_limit' },
			});

		const limitTiersSetting = await this.prisma.systemSettings.findUnique({
			where: { key: 'limit_tiers' },
		});

		const thresholdTiersSetting = await this.prisma.systemSettings.findUnique({
			where: { key: 'threshold_tiers' },
		});

		return {
			validationEnabled: validationEnabledSetting
				? JSON.parse(validationEnabledSetting.value)
				: true,
			validationAmount: validationAmountSetting
				? JSON.parse(validationAmountSetting.value)
				: this.VALIDATION_AMOUNT,
			initialDailyLimit: initialDailyLimitSetting
				? JSON.parse(initialDailyLimitSetting.value)
				: this.INITIAL_DAILY_LIMIT,
			limitTiers: limitTiersSetting
				? JSON.parse(limitTiersSetting.value)
				: this.LIMIT_TIERS,
			thresholdTiers: thresholdTiersSetting
				? JSON.parse(thresholdTiersSetting.value)
				: this.THRESHOLD_TIERS,
		};
	}

	async updateValidationSettings(settings: {
		validationEnabled?: boolean;
		validationAmount?: number;
		initialDailyLimit?: number;
		limitTiers?: number[];
		thresholdTiers?: number[];
	}): Promise<void> {
		this.logger.log(
			`Validation settings update requested: ${JSON.stringify(settings)}`,
		);

		// Validate the input data
		if (settings.limitTiers && settings.thresholdTiers) {
			if (settings.limitTiers.length !== settings.thresholdTiers.length) {
				throw new HttpException(
					'Limit tiers and threshold tiers must have the same length',
					HttpStatus.BAD_REQUEST,
				);
			}

			// Validate that all values are positive numbers
			for (const tier of settings.limitTiers) {
				if (!tier || tier <= 0) {
					throw new HttpException(
						'All limit tiers must be positive numbers',
						HttpStatus.BAD_REQUEST,
					);
				}
			}

			for (const threshold of settings.thresholdTiers) {
				if (!threshold || threshold <= 0) {
					throw new HttpException(
						'All threshold tiers must be positive numbers',
						HttpStatus.BAD_REQUEST,
					);
				}
			}
		}

		// Validate other fields
		if (
			settings.validationAmount !== undefined &&
			settings.validationAmount <= 0
		) {
			throw new HttpException(
				'Validation amount must be positive',
				HttpStatus.BAD_REQUEST,
			);
		}

		if (
			settings.initialDailyLimit !== undefined &&
			settings.initialDailyLimit <= 0
		) {
			throw new HttpException(
				'Initial daily limit must be positive',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Save settings to database
		const updatePromises: Promise<any>[] = [];

		if (settings.validationEnabled !== undefined) {
			updatePromises.push(
				this.prisma.systemSettings.upsert({
					where: { key: 'validation_enabled' },
					update: {
						value: JSON.stringify(settings.validationEnabled),
						description: 'Whether account validation is required for new users',
					},
					create: {
						key: 'validation_enabled',
						value: JSON.stringify(settings.validationEnabled),
						description: 'Whether account validation is required for new users',
					},
				}),
			);
		}

		if (settings.validationAmount !== undefined) {
			updatePromises.push(
				this.prisma.systemSettings.upsert({
					where: { key: 'validation_amount' },
					update: {
						value: JSON.stringify(settings.validationAmount),
						description: 'Amount required for account validation (in BRL)',
					},
					create: {
						key: 'validation_amount',
						value: JSON.stringify(settings.validationAmount),
						description: 'Amount required for account validation (in BRL)',
					},
				}),
			);
		}

		if (settings.initialDailyLimit !== undefined) {
			updatePromises.push(
				this.prisma.systemSettings.upsert({
					where: { key: 'initial_daily_limit' },
					update: {
						value: JSON.stringify(settings.initialDailyLimit),
						description: 'Initial daily limit for new validated users (in BRL)',
					},
					create: {
						key: 'initial_daily_limit',
						value: JSON.stringify(settings.initialDailyLimit),
						description: 'Initial daily limit for new validated users (in BRL)',
					},
				}),
			);
		}

		if (settings.limitTiers) {
			updatePromises.push(
				this.prisma.systemSettings.upsert({
					where: { key: 'limit_tiers' },
					update: {
						value: JSON.stringify(settings.limitTiers),
						description: 'Progressive daily limit tiers (in BRL)',
					},
					create: {
						key: 'limit_tiers',
						value: JSON.stringify(settings.limitTiers),
						description: 'Progressive daily limit tiers (in BRL)',
					},
				}),
			);
		}

		if (settings.thresholdTiers) {
			updatePromises.push(
				this.prisma.systemSettings.upsert({
					where: { key: 'threshold_tiers' },
					update: {
						value: JSON.stringify(settings.thresholdTiers),
						description: 'Volume thresholds to unlock limit tiers (in BRL)',
					},
					create: {
						key: 'threshold_tiers',
						value: JSON.stringify(settings.thresholdTiers),
						description: 'Volume thresholds to unlock limit tiers (in BRL)',
					},
				}),
			);
		}

		// Execute all updates
		await Promise.all(updatePromises);

		this.logger.log('Validation settings updated successfully in database');
	}

	async isValidationEnabled(): Promise<boolean> {
		const setting = await this.prisma.systemSettings.findUnique({
			where: { key: 'validation_enabled' },
		});
		return setting ? JSON.parse(setting.value) : true; // Default to enabled
	}

	async getDetailedValidationStatus(userId: string): Promise<any> {
		const validationAmount = await this.getValidationAmount();
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: {
				reputation: true,
			},
		});

		if (!user) {
			throw new HttpException('User not found', HttpStatus.NOT_FOUND);
		}

		// Get all validation transactions
		const validationTransactions = await this.prisma.transaction.findMany({
			where: {
				userId,
				type: TransactionType.DEPOSIT,
				amount: validationAmount,
				description: { contains: 'Validação de conta' },
			},
			orderBy: { createdAt: 'desc' },
		});

		// Get completed validation transactions
		const completedValidations = validationTransactions.filter(
			(t) => t.status === TransactionStatus.COMPLETED,
		);

		return {
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				isAccountValidated: user.isAccountValidated,
				validationPaymentId: user.validationPaymentId,
				validatedAt: user.validatedAt,
			},
			validationAmount,
			transactions: validationTransactions.map((t) => ({
				id: t.id,
				status: t.status,
				amount: t.amount,
				createdAt: t.createdAt,
				processedAt: t.processedAt,
				metadata: t.metadata ? JSON.parse(t.metadata) : null,
				externalId: t.externalId,
			})),
			completedValidations: completedValidations.length,
			shouldBeValidated:
				completedValidations.length > 0 && !user.isAccountValidated,
			reputation: user.reputation,
			debug: {
				hasCompletedPayments: completedValidations.length > 0,
				accountValidated: user.isAccountValidated,
				mismatch: completedValidations.length > 0 && !user.isAccountValidated,
			},
		};
	}

	async manualValidationCheck(userId: string): Promise<any> {
		this.logger.log(`Manual validation check triggered for user ${userId}`);

		const result = await this.processCompletedValidations();

		// Get updated status
		const detailedStatus = await this.getDetailedValidationStatus(userId);

		return {
			...detailedStatus,
			manualCheckResult: result,
			timestamp: new Date().toISOString(),
		};
	}
}
