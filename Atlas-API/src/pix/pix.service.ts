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
import { IdentityVaultService } from '../identity-vault/identity-vault.service';
import {
	hashEuid,
	hashTaxNumber,
	maskTaxNumber,
} from '../identity-vault/identity-vault.utils';
import {
	DepositDto,
	WithdrawDto,
	TransferDto,
	TransactionResponseDto,
} from '../eulen/dto/eulen.dto';
import { PayerMatchStatus, TransactionType, TransactionStatus } from '@prisma/client';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PixService {
	private readonly logger = new Logger(PixService.name);

	// In-memory cache for level configs (refreshed every 5 minutes)
	private levelConfigCache: Map<number, { dailyLimitBrl: number; maxPerTransactionBrl: number }> = new Map();
	private levelConfigCacheTimestamp: number = 0;
	private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

	constructor(
		private readonly eulenClient: EulenClientService,
		private readonly limitValidationService: LimitValidationService,
		private readonly liquidValidation: LiquidValidationService,
		private readonly transactionRepository: TransactionRepository,
		private readonly auditLogRepository: AuditLogRepository,
		private readonly prisma: PrismaService,
		private readonly levelsService: LevelsService,
		private readonly identityVaultService: IdentityVaultService,
	) {}

	/**
	 * Get user's default wallet address
	 */
	async getUserDefaultWallet(userId: string): Promise<{ defaultWalletAddress: string | null } | null> {
		return this.prisma.user.findUnique({
			where: { id: userId },
			select: { defaultWalletAddress: true },
		});
	}

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

			// NOTE: Level limits removed for deposits - users can deposit any amount
			// Level limits only apply to withdrawals and transfers

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
				buyerName: depositDto.buyerName,
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
				buyerName: withdrawDto.buyerName,
				externalId: withdrawDto.externalId,
			});

			// Call Eulen API
			const eulenResponse = await this.eulenClient.createWithdraw({
				pixKey: withdrawDto.pixKey,
				payoutAmountInCents: Math.round(withdrawDto.amount * 100),
			});

			// Update transaction with Eulen response
			await this.transactionRepository.update(transaction.id, {
				externalId: eulenResponse.withdrawalId || transactionId,
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
			payerTaxNumber?: string;
			payerFullName?: string;
			payerContactId?: string;
			metadata?: any; // Additional metadata to store with the transaction
			isApiRequest?: boolean; // Whether this request is from API (via x-api-key header)
			isCommerceRequest?: boolean; // Whether this request is from commerce page (not deposit page)
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
					verifiedTaxNumber: true,
					apiKey: true,
					whitelistDepix: true,
					collateral: true, // Valor de colateral do usuário
					splitFeePercentage: true, // Taxa de split fee do usuário
					delayedPaymentEnabled: true, // Pagamento com delay D+1 (janelas 6h/18h)
					collateralDelayEnabled: true, // D+0 até ao colateral (pagamentos <= colateral sem delay)
					userLevel: {
						select: {
							level: true,
							dailyLimitBrl: true,
							dailyUsedBrl: true,
							lastLimitReset: true
						}
					}
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

			const merchantEuid = this.isEuid(user.verifiedTaxNumber)
				? user.verifiedTaxNumber
				: undefined;
			const isCommerceQr =
				user.commerceMode === true ||
				data.isCommerceRequest === true ||
				Boolean(isPaymentLink);
			let payerTaxNumber = data.payerTaxNumber || data.payerCpfCnpj;
			let payerFullName = data.payerFullName?.trim();
			let payerEuid: string | undefined;
			let expectedPayerIdentityId: string | undefined;
			let merchantContactId: string | undefined;

			if (data.payerContactId) {
				const contact = await this.identityVaultService.getMerchantContactForQr(
					userId,
					data.payerContactId,
				);
				if (!contact) {
					throw new HttpException(
						'Contato do pagador não encontrado para este merchant.',
						HttpStatus.BAD_REQUEST,
					);
				}
				if (!contact.identity.euid) {
					throw new HttpException(
						'Contato ainda não possui EUID verificado. Informe CPF/CNPJ e nome completo para gerar o QR.',
						HttpStatus.BAD_REQUEST,
					);
				}
				payerEuid = contact.identity.euid;
				payerFullName = contact.displayName;
				expectedPayerIdentityId = contact.identity.id;
				merchantContactId = contact.id;
			}

			if (!payerEuid && !payerTaxNumber && !isCommerceQr && merchantEuid) {
				payerEuid = merchantEuid;
			}

			if (isCommerceQr && !isValidationPayment && !merchantEuid) {
				throw new HttpException(
					'Merchant sem EUID validado. Valide a conta antes de gerar QR de comércio.',
					HttpStatus.FORBIDDEN,
				);
			}

			if (!payerEuid && !payerTaxNumber) {
				throw new HttpException(
					'Identificação do pagador é obrigatória para gerar QR Code.',
					HttpStatus.BAD_REQUEST,
				);
			}

			if (!payerEuid && payerTaxNumber && !payerFullName) {
				throw new HttpException(
					'Nome completo do pagador é obrigatório quando o CPF/CNPJ ainda não possui EUID.',
					HttpStatus.BAD_REQUEST,
				);
			}

			// Apply limits based on the REQUEST CONTEXT (not just user attributes)
			if (!isValidationPayment) {
				// Check if user is making an API request via x-api-key header
				const isApiUser = !!user.apiKey;
				const isUsingApiKey = data.isApiRequest === true;
				const isCommerceManualQR = data.isCommerceRequest === true;

				this.logger.log(`🔍 VALIDATION DEBUG for user ${userId}:`);
				this.logger.log(`  - isPaymentLink: ${isPaymentLink}`);
				this.logger.log(`  - isValidationPayment: ${isValidationPayment}`);
				this.logger.log(`  - isApiUser: ${isApiUser}`);
				this.logger.log(`  - isUsingApiKey: ${isUsingApiKey}`);
				this.logger.log(`  - isCommerceManualQR: ${isCommerceManualQR}`);
				this.logger.log(`  - user.commerceMode: ${user.commerceMode}`);
				this.logger.log(`  - Amount requested: R$ ${data.amount.toFixed(2)}`);

				if (isUsingApiKey && isApiUser) {
					// API REQUESTS (via x-api-key): No level limits for API users
					// They can generate QR codes for any amount and any CPF/CNPJ
					this.logger.log(
						`✅ API request from user ${userId} - Skipping level validation (API users have no level limits when using API key)`
					);
				} else if (isCommerceManualQR && user.commerceMode) {
					// COMMERCE MANUAL QR CODE (from /commerce page): Apply commerce-specific limits, NO level limits
					// Minimum: 1 BRL
					// Maximum: 5000 BRL after payer identity is provided.
					const minAmount = 1;
					const maxAmount = 5000;

					if (data.amount < minAmount) {
						throw new HttpException(
							`Valor mínimo para transação: R$ ${minAmount.toFixed(2)}`,
							HttpStatus.BAD_REQUEST
						);
					}

					if (data.amount > maxAmount) {
						throw new HttpException(
							`Valor máximo por transação no modo comércio identificado: R$ ${maxAmount.toFixed(2)}`,
							HttpStatus.FORBIDDEN
						);
					}

					this.logger.log(
						`✅ Commerce manual QR validation passed for user ${userId}: ` +
						`Amount: R$ ${data.amount.toFixed(2)}, Limit: R$ ${maxAmount.toFixed(2)} (identified payer) - NO level limits enforced`
					);
				} else if (isPaymentLink && user.commerceMode) {
					// PAYMENT LINKS (Commerce feature): Apply commerce-specific limits
					// Minimum: 1 BRL
					// Maximum: 5000 BRL after payer identity is provided.
					const minAmount = 1;
					const maxAmount = 5000;

					if (data.amount < minAmount) {
						throw new HttpException(
							`Valor mínimo para transação: R$ ${minAmount.toFixed(2)}`,
							HttpStatus.BAD_REQUEST
						);
					}

					if (data.amount > maxAmount) {
						throw new HttpException(
							`Valor máximo por transação no modo comércio identificado: R$ ${maxAmount.toFixed(2)}`,
							HttpStatus.FORBIDDEN
						);
					}

					this.logger.log(
						`✅ Commerce payment link validation passed for user ${userId}: ` +
						`Amount: R$ ${data.amount.toFixed(2)}, Limit: R$ ${maxAmount.toFixed(2)} (identified payer)`
					);
				} else {
					// PANEL /DEPOSIT PAGE: Apply level-based limits for ALL users
					// This includes API users, commerce users, and regular users when NOT using API key
					// OPTIMIZED: Use already-fetched userLevel data to avoid extra DB queries

					if (!user.userLevel) {
						throw new HttpException(
							'Usuário não possui nível configurado. Entre em contato com o suporte.',
							HttpStatus.FORBIDDEN
						);
					}

					// Get level configuration from cache (very fast!)
					const levelConfig = await this.getLevelConfigCached(user.userLevel.level);
					const dailyLimit = levelConfig.dailyLimitBrl;
					const maxPerTransaction = levelConfig.maxPerTransactionBrl;

					// Check per-transaction limit
					if (data.amount > maxPerTransaction) {
						throw new HttpException(
							`Valor por transação excede o limite máximo do seu nível (${user.userLevel.level}). Limite máximo: R$ ${maxPerTransaction.toFixed(2)}`,
							HttpStatus.FORBIDDEN
						);
					}

					// Check daily limit
					if (data.amount > dailyLimit) {
						throw new HttpException(
							`Valor solicitado excede o limite diário do seu nível (${user.userLevel.level}). Limite diário: R$ ${dailyLimit.toFixed(2)}`,
							HttpStatus.FORBIDDEN
						);
					}

					// Calculate today's usage (this query is indexed and fast)
					const startOfDay = new Date();
					startOfDay.setHours(0, 0, 0, 0);
					const endOfDay = new Date();
					endOfDay.setHours(23, 59, 59, 999);

					const todayUsage = await this.prisma.transaction.aggregate({
						where: {
							userId,
							type: TransactionType.DEPOSIT,
							createdAt: { gte: startOfDay, lte: endOfDay },
							status: { in: ['COMPLETED', 'PROCESSING', 'PENDING'] }
						},
						_sum: { amount: true }
					});

					const currentDailyUsage = Number(todayUsage._sum.amount || 0);
					const remainingLimit = dailyLimit - currentDailyUsage;

					// Check if user has already reached daily limit
					if (currentDailyUsage >= dailyLimit) {
						throw new HttpException(
							`Limite diário já foi atingido para o seu nível (${user.userLevel.level}). Limite diário: R$ ${dailyLimit.toFixed(2)}`,
							HttpStatus.FORBIDDEN
						);
					}

					// Check if this transaction would exceed daily limit
					if (data.amount > remainingLimit) {
						throw new HttpException(
							`Esta transação excederia seu limite diário. Valor disponível hoje: R$ ${remainingLimit.toFixed(2)} (Nível ${user.userLevel.level})`,
							HttpStatus.FORBIDDEN
						);
					}

					const requestSource = isUsingApiKey ? 'API key' : 'Panel';
					const userTypeLog = user.apiKey ? '(has API key)' : user.commerceMode ? '(commerce mode)' : '(regular user)';
					this.logger.log(
						`✅ Level validation passed for user ${userId} ${userTypeLog} via ${requestSource} (Level ${user.userLevel.level}): ` +
						`Amount: R$ ${data.amount.toFixed(2)}, Daily usage: R$ ${currentDailyUsage.toFixed(2)}/${dailyLimit.toFixed(2)}`
					);
				}
			}

			if (payerTaxNumber) {
				const cpfCnpjClean = payerTaxNumber.replace(/\D/g, '');
				if (cpfCnpjClean.length !== 11 && cpfCnpjClean.length !== 14) {
					throw new HttpException(
						'CPF/CNPJ inválido. Use 11 dígitos para CPF ou 14 para CNPJ.',
						HttpStatus.BAD_REQUEST,
					);
				}
				payerTaxNumber = cpfCnpjClean;
			}

			// NOTE: depixAddress is now optional and should be a PIX key (CPF, CNPJ, email, phone, EVP)
			// NOT a Liquid Network address. The Liquid address validation has been removed
			// because depixAddress is for PIX payment keys, not cryptocurrency addresses.
			// Generate transaction for QR Code
			const metadataToStore = {
				isQrCodePayment: true,
				depixAddress: data.depixAddress, // Also store in metadata for reference
				expirationMinutes: data.expirationMinutes || Math.floor((29 * 60 + 50) / 60), // 29 minutes 50 seconds
				payerTaxNumberMasked: payerTaxNumber ? maskTaxNumber(payerTaxNumber) : undefined,
				payerTaxNumberHash: payerTaxNumber ? hashTaxNumber(payerTaxNumber) : undefined,
				hasPayerEuid: Boolean(payerEuid),
				payerEuidHash: payerEuid ? hashEuid(payerEuid) : undefined,
				expectedPayerIdentityId,
				merchantContactId,
				merchantId: isCommerceQr && !isValidationPayment ? merchantEuid : undefined,
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
				buyerName: payerFullName,
				expectedPayerIdentityId,
				merchantContactId,
				payerMatchStatus: PayerMatchStatus.UNKNOWN,
				payerTaxNumberHash: payerTaxNumber ? hashTaxNumber(payerTaxNumber) : null,
				payerTaxNumberMasked: payerTaxNumber ? maskTaxNumber(payerTaxNumber) : null,
				payerEuidHash: payerEuid ? hashEuid(payerEuid) : null,
				metadata: JSON.stringify(metadataToStore),
			});

			// Call Eulen API to generate QR Code
			// Determine whitelist status based on: whitelistDepix flag OR collateral amount
			let isWhitelisted = false;

			// 1. Se usuário tem whitelist global habilitado, sempre usa whitelist
			if (user.whitelistDepix === true) {
				isWhitelisted = true;
				this.logger.log(`✅ WHITELIST: User ${userId} has global whitelistDepix enabled`);
			}
			// 2. Se tem colateral configurado (não null e > 0), verificar se o valor está dentro do colateral
			else if (user.collateral !== null && user.collateral !== undefined && user.collateral > 0) {
				if (data.amount <= user.collateral) {
					isWhitelisted = true;
					this.logger.log(`✅ COLLATERAL: Amount R$ ${data.amount.toFixed(2)} <= collateral R$ ${user.collateral.toFixed(2)} - using whitelist`);
				} else {
					isWhitelisted = false;
					this.logger.log(`⚠️ COLLATERAL: Amount R$ ${data.amount.toFixed(2)} > collateral R$ ${user.collateral.toFixed(2)} - NO whitelist`);
				}
			}
			// 3. Se colateral é null/0 e whitelistDepix é false, não usa whitelist (comportamento padrão)
			else {
				this.logger.log(`ℹ️ WHITELIST: User ${userId} has no whitelist or collateral - standard flow (no whitelist)`);
			}

			// Endereço para receber a taxa de split (via .env)
			const SPLIT_FEE_ADDRESS = process.env.SPLIT_FEE_ADDRESS;

			// Usar a taxa personalizada do usuário ou o padrão de 0.5%
			// Eulen API requires splitFee > 0% and < 20%
			// IMPORTANT: Do NOT apply split fee for validation payments (R$ 1,00 is too small)
			let splitFeePercentage = user.splitFeePercentage ?? 0.5;

			// Disable split fee for validation payments - the amount is too small
			if (isValidationPayment) {
				splitFeePercentage = 0;
				this.logger.log(`🔒 Validation payment detected - disabling split fee (amount too small)`);
			}

			// Clamp splitFee to valid range (0 to disable, max 19.99% to stay under 20%)
			if (splitFeePercentage > 0 && splitFeePercentage >= 20) {
				this.logger.warn(`⚠️ splitFeePercentage ${splitFeePercentage}% exceeds max 20%, capping to 19.99%`);
				splitFeePercentage = 19.99;
			}

			// Disable split fee if the calculated amount would be less than R$ 0.01 (1 centavo)
			// Eulen API rejects split portions that are too small for the deposit amount
			if (splitFeePercentage > 0) {
				const calculatedSplitAmount = data.amount * (splitFeePercentage / 100);
				if (calculatedSplitAmount < 0.01) {
					this.logger.log(`⚠️ Split fee R$ ${calculatedSplitAmount.toFixed(4)} is below minimum R$ 0.01 for amount R$ ${data.amount} - disabling split fee`);
					splitFeePercentage = 0;
				}
			}

			const splitFeeString = splitFeePercentage > 0 ? `${splitFeePercentage}%` : undefined;

			this.logger.log(
				`Calling Eulen API to generate QR Code with data: ${JSON.stringify({
					amount: data.amount,
					depixAddress: data.depixAddress,
					description: data.description,
					hasPayerEuid: Boolean(payerEuid),
					hasPayerTaxNumber: Boolean(payerTaxNumber),
					hasPayerFullName: Boolean(payerFullName),
					merchantId: isCommerceQr && !isValidationPayment ? 'present' : 'not_applicable',
					whitelist: isWhitelisted,
					splitFee: splitFeeString || 'disabled (0%)',
					depixSplitAddress: splitFeeString ? SPLIT_FEE_ADDRESS : 'N/A',
				})}`,
			);

			this.logger.log(`🔍 WHITELIST STATUS: User ${userId} whitelist status = ${isWhitelisted}`);
			this.logger.log(`💸 SPLIT FEE: ${splitFeeString || 'disabled (0%)'} ${splitFeeString ? `to ${SPLIT_FEE_ADDRESS}` : ''}`);

			// Calculate delayed payment based on user settings
			// CRITICAL: Validation payments (R$ 1,00 for account validation) MUST always be D+0
			// to ensure users can complete their account validation immediately
			let delayDepixInHours: number | undefined;
			let scheduledPaymentAt: Date | undefined;

			if (isValidationPayment) {
				// Validation payments are ALWAYS D+0 - never apply delay
				this.logger.log(`🔒 VALIDATION PAYMENT: Skipping D+1 delay - validation payments are always D+0`);
			} else if (user.delayedPaymentEnabled === true) {
				// D+1 global: aplica delay a TODOS os pagamentos (exceto validação)
				const delayInfo = this.calculateDelayDepixInHours();
				delayDepixInHours = delayInfo.hours;
				scheduledPaymentAt = delayInfo.scheduledAt;
				this.logger.log(`⏰ DELAYED PAYMENT: User ${userId} has delayed payment enabled`);
				this.logger.log(`⏰ DELAYED PAYMENT: Calculated delay = ${delayDepixInHours} hours`);
				this.logger.log(`⏰ DELAYED PAYMENT: Scheduled for ${scheduledPaymentAt.toISOString()}`);
			} else if (user.collateralDelayEnabled === true && user.collateral && user.collateral > 0) {
				// D+0 até ao colateral: aplica delay apenas para valores ACIMA do colateral
				if (data.amount > user.collateral) {
					const delayInfo = this.calculateDelayDepixInHours();
					delayDepixInHours = delayInfo.hours;
					scheduledPaymentAt = delayInfo.scheduledAt;
					this.logger.log(`⏰ COLLATERAL DELAY: Amount R$ ${data.amount} > collateral R$ ${user.collateral} - applying D+1`);
					this.logger.log(`⏰ COLLATERAL DELAY: Calculated delay = ${delayDepixInHours} hours`);
					this.logger.log(`⏰ COLLATERAL DELAY: Scheduled for ${scheduledPaymentAt.toISOString()}`);
				} else {
					this.logger.log(`✅ COLLATERAL DELAY: Amount R$ ${data.amount} <= collateral R$ ${user.collateral} - D+0 (no delay)`);
				}
			}

			const eulenResponse = await this.eulenClient.generatePixQRCode({
				amount: data.amount,
				depixAddress: data.depixAddress, // Pass DePix address from frontend
				description: data.description,
				payerEuid,
				payerFullName,
				merchantId: isCommerceQr && !isValidationPayment ? merchantEuid : undefined,
				userTaxNumber: payerTaxNumber,
				whitelist: isWhitelisted, // Pass whitelist parameter to Eulen API
				// Only send splitFee if percentage > 0 (Eulen API requires > 0% and < 20%)
				splitFee: splitFeeString,
				depixSplitAddress: splitFeeString ? SPLIT_FEE_ADDRESS : undefined,
				// Pass delay for D+1 payment scheduling if enabled
				delayDepixInHours: delayDepixInHours,
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

			// Calculate split fee amount
			const splitFeeAmountValue = data.amount * (splitFeePercentage / 100);

			// Update transaction with QR code data AND transaction ID
			const updateData: any = {
				externalId: eulenResponse.transactionId, // Save transaction ID for status checks
				splitFeeApplied: splitFeePercentage, // Taxa aplicada (%)
				splitFeeAmount: Math.round(splitFeeAmountValue * 100) / 100, // Valor em BRL
				metadata: JSON.stringify({
					...JSON.parse(transaction.metadata || '{}'),
					depixAddress: data.depixAddress, // Ensure DePix address is in metadata
					qrCodeData,
					qrCode: qrCodeData, // Store the actual QR code
					serviceUsed: 'eulen', // Track which service was used
					eulenResponse: eulenResponse, // Store real EULEN responses
					transactionId: eulenResponse.transactionId, // Transaction ID reference
					splitFeePercentage: splitFeePercentage, // Taxa aplicada
					splitFeeAmount: Math.round(splitFeeAmountValue * 100) / 100, // Valor da taxa
					// D+1 Delayed payment info (if enabled)
					delayedPaymentEnabled: user.delayedPaymentEnabled || false,
					delayDepixInHours: delayDepixInHours || null,
					scheduledPaymentAt: scheduledPaymentAt?.toISOString() || null,
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
				pending: stats.pendingAmount || 0,
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

			// Only check with Eulen API if status is PENDING, PROCESSING, or IN_REVIEW
			if (
				transaction.externalId &&
				(transaction.status === TransactionStatus.PENDING ||
					transaction.status === TransactionStatus.PROCESSING ||
					transaction.status === TransactionStatus.IN_REVIEW)
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
					this.logger.log(`📋 Payer Tax Number: ${maskTaxNumber(payerInfo.payerTaxNumber) || 'unavailable'}`);
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
					newStatus = TransactionStatus.IN_REVIEW;
					this.logger.log(`🔍 Payment under review`);
				} else if (eulenStatus.response?.status === 'refunded') {
					newStatus = TransactionStatus.FAILED;
					shouldStopPolling = true;
				}

				// Update transaction if status changed
				if (newStatus !== transaction.status) {
					// If we have payer info, save it in metadata AND buyerName field
					if (payerInfo) {
						const currentMetadata = transaction.metadata
							? JSON.parse(transaction.metadata)
							: {};
						let payerMatchStatus = transaction.payerMatchStatus || PayerMatchStatus.UNKNOWN;
						if (payerInfo.payerEUID || payerInfo.payerTaxNumber || payerInfo.payerName) {
							const session = currentMetadata.sessionToken
								? await this.prisma.paymentLinkSession.findUnique({
										where: { sessionToken: currentMetadata.sessionToken },
									})
								: null;
							const txWithContact = await this.prisma.transaction.findUnique({
								where: { id: transaction.id },
								include: { merchantContact: { include: { identity: true } } },
							});
							const identityResult = await this.identityVaultService.upsertMerchantContactFromPayment({
								merchantId: transaction.userId,
								transactionId: transaction.id,
								payerName: payerInfo.payerName,
								payerTaxNumber: payerInfo.payerTaxNumber,
								payerEuid: payerInfo.payerEUID,
								expectedTaxNumber: session?.payerTaxNumber,
								expectedEuid: txWithContact?.merchantContact?.identity?.euid,
							});
							payerMatchStatus = identityResult.matchStatus;
							if (payerMatchStatus === PayerMatchStatus.MISMATCH) {
								newStatus = TransactionStatus.IN_REVIEW;
								shouldStopPolling = false;
							}
						}
						await this.transactionRepository.update(transaction.id, {
							status: newStatus,
							processedAt: new Date(),
							buyerName: payerInfo.payerName, // Save payer name to buyerName field
							payerMatchStatus,
							metadata: JSON.stringify({
								...currentMetadata,
								payerInfo,
								eulenResponse: eulenStatus.response,
								payerMatchStatus,
								completedAt: new Date().toISOString(),
							}),
						});
					} else {
						await this.transactionRepository.updateStatus(
							transaction.id,
							newStatus,
							newStatus === TransactionStatus.FAILED
								? 'Pagamento falhou ou foi cancelado'
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

	/**
	 * Get level config from cache or database (with 5-minute TTL)
	 * This dramatically reduces DB queries for level configs
	 */
	private async getLevelConfigCached(level: number): Promise<{ dailyLimitBrl: number; maxPerTransactionBrl: number }> {
		const now = Date.now();

		// Check if cache is valid
		if (now - this.levelConfigCacheTimestamp < this.CACHE_TTL_MS && this.levelConfigCache.has(level)) {
			return this.levelConfigCache.get(level)!;
		}

		// Cache expired or empty - refresh all configs at once
		if (now - this.levelConfigCacheTimestamp >= this.CACHE_TTL_MS) {
			try {
				const configs = await this.prisma.levelConfig.findMany({
					select: {
						level: true,
						dailyLimitBrl: true,
						maxPerTransactionBrl: true
					}
				});

				// Clear and repopulate cache
				this.levelConfigCache.clear();
				for (const config of configs) {
					this.levelConfigCache.set(config.level, {
						dailyLimitBrl: Number(config.dailyLimitBrl),
						maxPerTransactionBrl: Number(config.maxPerTransactionBrl || config.dailyLimitBrl)
					});
				}

				this.levelConfigCacheTimestamp = now;
				this.logger.log(`🔄 Level config cache refreshed with ${configs.length} configs`);
			} catch (error) {
				this.logger.error('Error refreshing level config cache:', error);
			}
		}

		// Return from cache or fallback to defaults
		if (this.levelConfigCache.has(level)) {
			return this.levelConfigCache.get(level)!;
		}

		// Fallback to default configs (matching database LevelConfig table)
		const defaultConfigs: Record<number, { dailyLimitBrl: number; maxPerTransactionBrl: number }> = {
			0: { dailyLimitBrl: 0, maxPerTransactionBrl: 0 },
			1: { dailyLimitBrl: 50, maxPerTransactionBrl: 50 },
			2: { dailyLimitBrl: 100, maxPerTransactionBrl: 100 },
			3: { dailyLimitBrl: 200, maxPerTransactionBrl: 200 },
			4: { dailyLimitBrl: 350, maxPerTransactionBrl: 350 },
			5: { dailyLimitBrl: 500, maxPerTransactionBrl: 500 },
			6: { dailyLimitBrl: 750, maxPerTransactionBrl: 750 },
			7: { dailyLimitBrl: 1000, maxPerTransactionBrl: 1000 },
			8: { dailyLimitBrl: 1500, maxPerTransactionBrl: 1500 },
			9: { dailyLimitBrl: 2000, maxPerTransactionBrl: 2000 },
			10: { dailyLimitBrl: 999999, maxPerTransactionBrl: 5000 }
		};

		const fallbackConfig = defaultConfigs[level] || defaultConfigs[0];
		this.logger.warn(`⚠️ Using fallback config for level ${level}: ${JSON.stringify(fallbackConfig)}`);
		return fallbackConfig;
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

	private isEuid(value?: string | null): value is string {
		return /^EU[A-Z0-9]{8,}$/i.test(value || '');
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
			buyerName: transaction.buyerName,
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
			delayed: TransactionStatus.PROCESSING, // Payment received, waiting for D+1 delay
			failed: TransactionStatus.FAILED,
			cancelled: TransactionStatus.CANCELLED,
			expired: TransactionStatus.EXPIRED,
		};

		return statusMap[eulenStatus.toLowerCase()] || TransactionStatus.PENDING;
	}

	/**
	 * Calcula o delay em horas para pagamento D+1 com janelas de 6h e 18h (horário de Brasília).
	 * Encontra a próxima janela de pagamento que seja pelo menos 24h no futuro.
	 * Otimizado para O(1) - apenas comparações simples, sem loops.
	 *
	 * IMPORTANTE: Todas as janelas são em horário de São Paulo (UTC-3).
	 * - Janela 1: 06:00 BRT = 09:00 UTC
	 * - Janela 2: 18:00 BRT = 21:00 UTC
	 *
	 * Exemplos (horário de Brasília):
	 * - Venda às 10:00 dia 1 → elegível: 10:00 dia 2 → próxima janela: 18:00 dia 2 → delay = 32h
	 * - Venda às 16:34 dia 3 → elegível: 16:34 dia 4 → próxima janela: 18:00 dia 4 → delay ~25h
	 * - Venda às 20:00 dia 1 → elegível: 20:00 dia 2 → próxima janela: 06:00 dia 3 → delay = 34h
	 */
	private calculateDelayDepixInHours(): { hours: number; scheduledAt: Date } {
		const now = new Date();
		const SAO_PAULO_OFFSET_HOURS = -3; // São Paulo é UTC-3 (sem horário de verão desde 2019)

		// Converter horário atual para São Paulo
		const nowSaoPaulo = new Date(now.getTime() + SAO_PAULO_OFFSET_HOURS * 60 * 60 * 1000);

		// Tempo mínimo: 24h a partir de agora (em São Paulo)
		const minPaymentTimeSaoPaulo = new Date(nowSaoPaulo.getTime() + 24 * 60 * 60 * 1000);

		// Extrair hora do tempo mínimo em São Paulo para decidir qual janela usar
		const minHourSaoPaulo = minPaymentTimeSaoPaulo.getUTCHours();

		// Criar data agendada baseada no tempo mínimo (em São Paulo)
		const scheduledAtSaoPaulo = new Date(minPaymentTimeSaoPaulo);

		// Determinar próxima janela de pagamento (6h ou 18h em São Paulo)
		// Se antes das 6h → janela das 6h do mesmo dia
		// Se entre 6h e 18h → janela das 18h do mesmo dia
		// Se após 18h → janela das 6h do dia seguinte
		if (minHourSaoPaulo < 6) {
			scheduledAtSaoPaulo.setUTCHours(6, 0, 0, 0);
		} else if (minHourSaoPaulo < 18) {
			scheduledAtSaoPaulo.setUTCHours(18, 0, 0, 0);
		} else {
			// Após 18h: próxima janela é 6h do dia seguinte
			scheduledAtSaoPaulo.setUTCDate(scheduledAtSaoPaulo.getUTCDate() + 1);
			scheduledAtSaoPaulo.setUTCHours(6, 0, 0, 0);
		}

		// Converter de volta para UTC (subtrair o offset de São Paulo)
		const scheduledAt = new Date(scheduledAtSaoPaulo.getTime() - SAO_PAULO_OFFSET_HOURS * 60 * 60 * 1000);

		// Calcular delay em horas (arredondado para cima)
		const delayMs = scheduledAt.getTime() - now.getTime();
		const hours = Math.ceil(delayMs / (60 * 60 * 1000));

		this.logger.log(`📅 DELAY CALC: Now (UTC): ${now.toISOString()}, Now (BRT): ${nowSaoPaulo.toISOString().replace('Z', ' BRT')}`);
		this.logger.log(`📅 DELAY CALC: Min eligible (BRT): ${minPaymentTimeSaoPaulo.toISOString().replace('Z', ' BRT')}, hour=${minHourSaoPaulo}`);
		this.logger.log(`📅 DELAY CALC: Scheduled (BRT): ${scheduledAtSaoPaulo.toISOString().replace('Z', ' BRT')} → UTC: ${scheduledAt.toISOString()}`);

		return { hours, scheduledAt };
	}
}
