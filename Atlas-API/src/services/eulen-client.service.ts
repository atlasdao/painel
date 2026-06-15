import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { EulenRateLimitError, RateLimiterService } from './rate-limiter.service';
import { PrismaService } from '../prisma/prisma.service';
import { redactSensitiveData } from '../common/utils/sensitive-redaction.util';

interface DepositRequest {
	amountInCents: number;
	depixAddress?: string;
	euid?: string;
	merchantId?: string;
	endUserFullName?: string;
	endUserTaxNumber?: string;
	splitFee?: string; // Percentual da taxa (ex: "0.5%")
	depixSplitAddress?: string; // Endereço destino da taxa
	delayDepixInHours?: number; // Delay para pagamento D+1 (janelas 6h/18h)
}

interface DepositResponse {
	response: {
		id: string;
		qrCopyPaste: string;
		qrImageUrl: string;
	};
	async: boolean;
}

@Injectable()
export class EulenClientService {
	private readonly logger = new Logger(EulenClientService.name);
	private readonly client: AxiosInstance;

	constructor(
		private readonly configService: ConfigService,
		private readonly rateLimiter: RateLimiterService,
		private readonly prisma: PrismaService,
	) {
		const baseURL = this.configService.get<string>(
			'EULEN_API_URL',
			'https://depix.eulen.app/api',
		);

		this.client = axios.create({
			baseURL,
			timeout: 60000, // Increased to 60 seconds for slow API responses
			headers: {
				'Content-Type': 'application/json',
				'X-Async': 'auto',
			},
		});

		// Request interceptor for logging and auth
		this.client.interceptors.request.use(
			async (config) => {
				// Add nonce header for each request
				config.headers['X-Nonce'] = this.generateNonce();

				// Get auth token dynamically from database or fallback to env
				const authToken = await this.getEulenToken();
				if (authToken) {
					config.headers['Authorization'] = `Bearer ${authToken}`;
				} else {
					// Throw specific error when token is missing
					this.logger.error('❌ BLOCKING REQUEST: No Eulen API token configured');
					throw new HttpException(
						'Eulen API não configurado. Entre em contato com o suporte para configurar a integração.',
						HttpStatus.SERVICE_UNAVAILABLE,
					);
				}

				// Detailed request logging
				this.logger.log(`🚀 EULEN API REQUEST`);
				this.logger.log(
					`📍 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
				);
				this.logger.log(
					`🔑 Headers: ${JSON.stringify(config.headers, null, 2)}`,
				);
				if (config.data) {
					this.logger.log(
						`📦 Request Body: ${JSON.stringify(redactSensitiveData(config.data), null, 2)}`,
					);
				}

				return config;
			},
			(error) => {
				this.logger.error('❌ Eulen API Request Error:', error);
				return Promise.reject(error);
			},
		);

		// Response interceptor for error handling
		this.client.interceptors.response.use(
			(response) => {
				// Detailed response logging
				this.logger.log(`✅ EULEN API RESPONSE`);
				this.logger.log(
					`📍 ${response.config.method?.toUpperCase()} ${response.config.url}`,
				);
				this.logger.log(`📊 Status: ${response.status} ${response.statusText}`);
				this.logger.log(
					`🔍 Response Headers: ${JSON.stringify(response.headers, null, 2)}`,
				);
				this.logger.log(
					`📦 Response Body: ${JSON.stringify(redactSensitiveData(response.data), null, 2)}`,
				);

				return response;
			},
			(error: AxiosError) => {
				if (this.isProviderRateLimit(error)) {
					const endpoint = this.resolveEndpointName(error.config?.url);
					const retryAfterMs = this.extractRetryAfterMs(error);
					this.logger.warn(
						`Eulen API rate limited ${endpoint}: retry after ${Math.ceil(retryAfterMs / 1000)}s`,
					);
					return Promise.reject(
						new EulenRateLimitError(
							endpoint,
							retryAfterMs,
							this.getProviderErrorMessage(error) || 'Eulen API rate limit',
						),
					);
				}

				// Detailed error logging
				this.logger.error(`❌ EULEN API ERROR`);
				this.logger.error(
					`📍 ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
				);
				this.logger.error(
					`📊 Status: ${error.response?.status} ${error.response?.statusText}`,
				);
				if (error.response?.data) {
					this.logger.error(
						`📦 Error Response: ${JSON.stringify(redactSensitiveData(error.response.data), null, 2)}`,
					);
				}
				this.logger.error(`🔍 Error Message: ${error.message}`);

				this.handleApiError(error);
				return Promise.reject(error);
			},
		);
	}

	private async getEulenToken(): Promise<string | null> {
		try {
			// ALWAYS fetch token from database - no hardcoded tokens allowed
			const systemSetting = await this.prisma.systemSettings.findUnique({
				where: { key: 'EULEN_API_TOKEN' },
			});

			if (systemSetting?.value) {
				// Check if it's a placeholder token for development
				if (systemSetting.value.includes('placeholder') || systemSetting.value.includes('development')) {
					this.logger.warn(
						`⚠️ Using placeholder/development Eulen token. External API calls will fail gracefully.`,
					);
					this.logger.warn(
						`🔧 To fix: Update EULEN_API_TOKEN in SystemSettings with a real production token`,
					);
				} else {
					this.logger.log(
						`✅ Using Eulen token from database (length: ${systemSetting.value.length})`,
					);
					this.logger.debug(
						`Token preview: ${systemSetting.value.substring(0, 50)}...`,
					);
				}
				return systemSetting.value;
			}

			this.logger.error('❌ CRITICAL: No Eulen API token found in database!');
			this.logger.error(
				'Please ensure EULEN_API_TOKEN is set in SystemSettings table',
			);
			this.logger.error(
				'Run: INSERT INTO "SystemSettings" (key, value, description) VALUES (\'EULEN_API_TOKEN\', \'your-token-here\', \'Eulen API token\');',
			);
			return null;
		} catch (error) {
			this.logger.error('❌ Error fetching Eulen token from database:', error);
			this.logger.error(
				'Database connection may be down. Cannot proceed without token.',
			);
			return null;
		}
	}

	private generateNonce(): string {
		// Generate a valid UUID v4 for the nonce
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
			/[xy]/g,
			function (c) {
				const r = (Math.random() * 16) | 0;
				const v = c === 'x' ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			},
		);
	}

	private handleApiError(error: AxiosError): void {
		const status = error.response?.status || 500;
		const message = (error.response?.data as any)?.message || error.message;
		const eulenErrorMessage = (error.response?.data as any)?.response?.errorMessage;

		this.logger.error(`Eulen API Error: ${status} - ${message}`);
		if (eulenErrorMessage) {
			this.logger.error(`Eulen Error Details: ${eulenErrorMessage}`);
		}

		if (status === 401) {
			// Provide more specific authentication error messages
			if (eulenErrorMessage?.includes('Authorization header is missing')) {
				throw new HttpException(
					'Token de autenticação Eulen não configurado. Entre em contato com o suporte.',
					HttpStatus.SERVICE_UNAVAILABLE,
				);
			} else if (eulenErrorMessage?.includes('Invalid token') || eulenErrorMessage?.includes('expired')) {
				throw new HttpException(
					'Token de autenticação Eulen expirado ou inválido. Entre em contato com o suporte.',
					HttpStatus.SERVICE_UNAVAILABLE,
				);
			} else {
				throw new HttpException(
					'Falha na autenticação com o serviço Eulen. Entre em contato com o suporte.',
					HttpStatus.SERVICE_UNAVAILABLE,
				);
			}
		} else if (status === 403) {
			throw new HttpException(
				'Acesso negado ao serviço Eulen. Verifique as permissões do token.',
				HttpStatus.FORBIDDEN,
			);
		} else if (status === 429) {
			throw new HttpException(
				'Limite de taxa do Eulen API excedido. Tente novamente em alguns minutos.',
				HttpStatus.TOO_MANY_REQUESTS,
			);
		} else if (status === 520 && eulenErrorMessage) {
			// Status 520 with error message = business logic error from Eulen, pass through
			throw new HttpException(eulenErrorMessage, HttpStatus.BAD_REQUEST);
		} else if (status >= 500) {
			throw new HttpException(
				'Serviço Eulen temporariamente indisponível. Tente novamente em alguns minutos.',
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		} else {
			// For other errors, provide the Eulen error message if available
			const userMessage = eulenErrorMessage || message || 'Erro desconhecido no serviço Eulen';
			throw new HttpException(userMessage, status);
		}
	}

	private isProviderRateLimit(error: AxiosError): boolean {
		const status = error.response?.status;
		const message = this.getProviderErrorMessage(error).toLowerCase();
		return (
			status === 429 ||
			(status === 520 && message.includes('too many requests')) ||
			message.includes('rate limit')
		);
	}

	private getProviderErrorMessage(error: AxiosError): string {
		const data = error.response?.data as any;
		return data?.response?.errorMessage || data?.message || error.message || '';
	}

	private extractRetryAfterMs(error: AxiosError): number {
		const headers = error.response?.headers || {};
		const retryAfter = headers['retry-after'] || headers['Retry-After'];
		if (retryAfter) {
			const retryAfterNumber = Number(retryAfter);
			if (!Number.isNaN(retryAfterNumber)) {
				return Math.max(retryAfterNumber * 1000, 0);
			}

			const retryAfterDate = Date.parse(String(retryAfter));
			if (!Number.isNaN(retryAfterDate)) {
				return Math.max(retryAfterDate - Date.now(), 0);
			}
		}

		const message = this.getProviderErrorMessage(error);
		const secondsMatch = message.match(/wait\s+(\d+)\s+(?:more\s+)?seconds?/i);
		if (secondsMatch) {
			return Number(secondsMatch[1]) * 1000;
		}

		return 60_000;
	}

	private resolveEndpointName(url?: string): string {
		if (!url) return 'unknown';
		if (url.includes('/withdraw-status')) return 'withdraw-status';
		if (url.includes('/deposit-status')) return 'deposit-status';
		if (url.includes('/withdraw')) return 'withdraw';
		if (url.includes('/deposit')) return 'deposit';
		if (url.includes('/ping')) return 'ping';
		return url.replace(/^\//, '') || 'unknown';
	}

	/**
	 * Ping endpoint - Basic connectivity check
	 */
	async ping(): Promise<any> {
		return this.rateLimiter.executeWithRateLimit('ping', async () => {
			try {
				const response = await this.client.get('/ping');
				// The API returns the data wrapped in response/async structure
				return response.data;
			} catch (error) {
				throw error;
			}
		});
	}

	/**
	 * Create a deposit (PIX to DePix conversion)
	 * Converts Brazilian Real (BRL) via PIX to DePix tokens on Liquid Network
	 */
	async createDeposit(data: {
		amount: number; // Amount in cents
		pixKey: string; // DePix address (Liquid address)
		description?: string;
		euid?: string;
		merchantId?: string;
		userFullName?: string;
		userTaxNumber?: string;
		whitelist?: boolean; // Optional whitelist parameter to bypass first purchase limit
		splitFee?: string; // Percentual da taxa (ex: "0.5%")
		depixSplitAddress?: string; // Endereço destino da taxa
		delayDepixInHours?: number; // Delay para pagamento D+1 (janelas 6h/18h)
	}): Promise<DepositResponse> {
		return this.rateLimiter.executeWithRateLimit('deposit', async () => {
			try {
				this.logger.log(`💰 CREATING EULEN DEPOSIT`);
				this.logger.log(`💵 Amount (cents): ${data.amount}`);
				this.logger.log(`🏦 DePix Address: ${data.pixKey}`);
				this.logger.log(`📝 Description: ${data.description || 'N/A'}`);

				// Only send required fields
				const requestData: any = {
					amountInCents: data.amount,
				};

				// CRITICAL: Always send depixAddress if provided
				// The Eulen API expects a Liquid Network address here (destination wallet for DePix tokens)
				// This is where the converted DePix (L-BTC) will be sent after PIX payment is received
				if (data.pixKey) {
					requestData.depixAddress = data.pixKey;
					this.logger.log(`✅ Including depixAddress (Liquid wallet): ${data.pixKey}`);
				} else {
					this.logger.log(`⚠️ No depixAddress provided - API will use default wallet`);
				}

				// Only add optional fields if they are provided
				if (data.userFullName) {
					requestData.endUserFullName = data.userFullName;
				}

				if (data.euid) {
					requestData.euid = data.euid;
					this.logger.log(`✅ Including payer EUID for deposit`);
				}

				if (data.merchantId) {
					requestData.merchantId = data.merchantId;
					this.logger.log(`✅ Including merchantId for commerce deposit`);
				}

				// Add whitelist parameter if provided
				if (data.whitelist === true) {
					requestData.whitelist = true;
					this.logger.log(`✅ Whitelist enabled for this transaction`);
				}

				// Add splitFee parameters if provided
				if (data.splitFee && data.depixSplitAddress) {
					requestData.splitFee = data.splitFee;
					requestData.depixSplitAddress = data.depixSplitAddress;
					this.logger.log(`💸 Split fee enabled: ${data.splitFee} to ${data.depixSplitAddress}`);
				}

				// Add delayDepixInHours if provided (D+1 payment scheduling)
				if (data.delayDepixInHours && data.delayDepixInHours > 0) {
					requestData.delayDepixInHours = data.delayDepixInHours;
					this.logger.log(`⏰ Delayed payment enabled: ${data.delayDepixInHours} hours`);
				}

				// Format and validate CPF/CNPJ
				if (data.userTaxNumber && !data.euid) {
					// Remove all non-numeric characters
					const cleanedTaxNumber = data.userTaxNumber.replace(/\D/g, '');

					// Validate CPF (11 digits) or CNPJ (14 digits)
					if (cleanedTaxNumber.length === 11 || cleanedTaxNumber.length === 14) {
						requestData.endUserTaxNumber = cleanedTaxNumber;
						this.logger.log(`📋 Including formatted tax number: ${cleanedTaxNumber} (original: ${data.userTaxNumber})`);
					} else {
						this.logger.warn(`⚠️ Invalid tax number length: ${cleanedTaxNumber.length} digits (${data.userTaxNumber})`);
						// Don't send invalid tax numbers
					}
				} else if (!data.euid) {
					this.logger.log(`📋 No tax number or payer EUID provided`);
				}

				this.logger.log(
					`📤 Request Data: ${JSON.stringify(redactSensitiveData(requestData), null, 2)}`,
				);
				const response = await this.client.post<DepositResponse>(
					'/deposit',
					requestData,
				);

				this.logger.log(`✅ DEPOSIT CREATION SUCCESS`);
				this.logger.log(`📋 Transaction ID: ${response.data.response.id}`);
				this.logger.log(
					`📱 QR Code: ${response.data.response.qrCopyPaste ? 'Generated' : 'Missing'}`,
				);
				this.logger.log(
					`🖼️ QR Image URL: ${response.data.response.qrImageUrl ? 'Generated' : 'Missing'}`,
				);
				this.logger.log(
					`📦 Full Response: ${JSON.stringify(redactSensitiveData(response.data), null, 2)}`,
				);

				return response.data;
			} catch (error) {
				// Always throw errors - no more development mode fallbacks
				// The real DePix API should be used in all environments
				if (this.rateLimiter.isRateLimitError(error)) {
					this.logger.warn(`Eulen API createDeposit deferred by rate limit: ${error.message}`);
				} else {
					this.logger.error(`❌ Eulen API createDeposit failed: ${error.message}`);
				}
				throw error;
			}
		});
	}

	/**
	 * Get deposit status
	 * Check the status of a PIX to DePix conversion
	 */
	async getDepositStatus(transactionId: string): Promise<any> {
		return this.rateLimiter.executeWithRateLimit('deposit-status', async () => {
			try {
				// Convert UUID to 32-character format expected by Eulen API (remove hyphens)
				const eulenId = transactionId.replace(/-/g, '');

				this.logger.log(`🔍 CHECKING DEPOSIT STATUS`);
				this.logger.log(`📋 Original Transaction ID: ${transactionId}`);
				this.logger.log(`📋 Eulen API ID (32 chars): ${eulenId}`);
				this.logger.log(
					`🌐 Full URL: ${this.client.defaults.baseURL}/deposit-status?id=${eulenId}`,
				);

				const response = await this.client.get('/deposit-status', {
					params: { id: eulenId },
				});

				this.logger.log(`📊 DEPOSIT STATUS RESPONSE`);
				this.logger.log(
					`🎯 Status: ${response.data?.response?.status || 'unknown'}`,
				);
				this.logger.log(
					`💰 Amount: ${response.data?.response?.amount || 'N/A'}`,
				);
				this.logger.log(
					`🏦 DePix Address: ${response.data?.response?.depix_address || 'N/A'}`,
				);
				this.logger.log(
					`⏰ Created At: ${response.data?.response?.created_at || 'N/A'}`,
				);
				this.logger.log(
					`📦 Full Response: ${JSON.stringify(response.data, null, 2)}`,
				);

				return response.data;
			} catch (error) {
				// Enhanced development mode and authentication error handling
				if (
					error.response?.status === 404 ||
					process.env.NODE_ENV === 'development' ||
					this.isInvalidTokenError(error)
				) {
					this.logger.warn('🔄 Returning mock deposit status for development/testing');

					if (this.isInvalidTokenError(error)) {
						this.logger.warn('❌ Token authentication failed - using mock status');
					}

					// For development transactions, simulate different statuses based on time
					const mockStatuses = ['pending', 'under_review', 'depix_sent'];
					const statusIndex = transactionId.includes('dev-') ? 2 : 0; // Dev transactions are "completed"
					const mockStatus = mockStatuses[statusIndex];

					return {
						response: {
							id: transactionId,
							status: mockStatus,
							amount: 3.00, // Default validation amount
							depix_address: 'mock-depix-address',
							created_at: new Date().toISOString(),
							payerEUID: 'DEV_USER_123',
							payerName: 'Development User',
							payerTaxNumber: '12345678901',
							bankTxId: `bank-${Date.now()}`,
							blockchainTxID: `blockchain-${Date.now()}`,
						},
						async: false,
						message: 'Mock status for development/testing',
					};
				}
				throw error;
			}
		});
	}

	// Legacy methods for compatibility - will map to real Eulen endpoints

	/**
	 * Create a withdraw (DePix to PIX conversion)
	 * Sends DePix tokens and pays out via PIX to the specified key
	 */
	async createWithdraw(data: {
		pixKey: string;
		payoutAmountInCents: number;
	}): Promise<{
		withdrawalId: string;
		depositAddress: string;
		depositAmountInCents: number;
		payoutAmountInCents: number;
	}> {
		return this.rateLimiter.executeWithRateLimit('withdraw', async () => {
			try {
				this.logger.log(`💸 CREATING EULEN WITHDRAW`);
				this.logger.log(`🔑 PIX Key: ${data.pixKey}`);
				this.logger.log(`💵 Payout Amount (cents): ${data.payoutAmountInCents}`);

				const response = await this.client.post('/withdraw', {
					pixKey: data.pixKey,
					payoutAmountInCents: data.payoutAmountInCents,
				});

				const result = response.data?.response || response.data;

				this.logger.log(`✅ WITHDRAW CREATION SUCCESS`);
				this.logger.log(`📋 Withdrawal ID: ${result.withdrawalId || result.id}`);
				this.logger.log(`🏦 Deposit Address: ${result.depositAddress}`);
				this.logger.log(`💰 Deposit Amount (cents): ${result.depositAmountInCents}`);

				return {
					withdrawalId: result.withdrawalId || result.id,
					depositAddress: result.depositAddress,
					depositAmountInCents: result.depositAmountInCents,
					payoutAmountInCents: result.payoutAmountInCents || data.payoutAmountInCents,
				};
			} catch (error) {
				if (this.rateLimiter.isRateLimitError(error)) {
					this.logger.warn(`Eulen API createWithdraw deferred by rate limit: ${error.message}`);
				} else {
					this.logger.error(`❌ Eulen API createWithdraw failed: ${error.message}`);
				}
				throw error;
			}
		});
	}

	/**
	 * Get withdraw status from Eulen
	 * Returns current status and receipt data when completed
	 */
	async getWithdrawStatus(withdrawalId: string): Promise<{
		status: string;
		receiptUrl?: string;
		payerName?: string;
		payerTaxNumber?: string;
		bankTxId?: string;
		paidAt?: string;
	}> {
		return this.rateLimiter.executeWithRateLimit('withdraw-status', async () => {
			try {
				this.logger.log(`🔍 CHECKING WITHDRAW STATUS: ${withdrawalId}`);

				const response = await this.client.get('/withdraw-status', {
					params: { id: withdrawalId },
				});

				const result = response.data?.response || response.data;

				this.logger.log(`📊 WITHDRAW STATUS: ${result.status}`);

				return {
					status: result.status,
					receiptUrl: result.receiptUrl,
					payerName: result.payerName,
					payerTaxNumber: result.payerTaxNumber,
					bankTxId: result.bankTxId,
					paidAt: result.paidAt,
				};
			} catch (error) {
				if (this.rateLimiter.isRateLimitError(error)) {
					this.logger.warn(`Eulen API getWithdrawStatus deferred by rate limit: ${error.message}`);
				} else {
					this.logger.error(`❌ Eulen API getWithdrawStatus failed: ${error.message}`);
				}
				throw error;
			}
		});
	}

	async getBalance(): Promise<any> {
		// Balance check would require wallet integration
		this.logger.warn('Balance endpoint not yet available');
		return {
			balance: 0,
			available: 0,
			pending: 0,
			currency: 'BRL',
		};
	}

	async getTransactions(params?: {
		limit?: number;
		offset?: number;
		startDate?: string;
		endDate?: string;
	}): Promise<any> {
		this.logger.warn('Transaction list endpoint not yet available');
		return {
			transactions: [],
			total: 0,
		};
	}

	async generatePixQRCode(data: {
		amount: number; // Amount in REAIS
		depixAddress?: string; // PIX key (CPF, CNPJ, email, phone, or EVP) - OPTIONAL
		description?: string;
		payerEuid?: string;
		payerFullName?: string;
		merchantId?: string;
		userTaxNumber?: string; // Tax number (CPF/CNPJ) for EUID restriction
		whitelist?: boolean; // Optional whitelist parameter to bypass first purchase limit
		splitFee?: string; // Percentual da taxa (ex: "0.5%")
		depixSplitAddress?: string; // Endereço destino da taxa
		delayDepixInHours?: number; // Delay para pagamento D+1 (janelas 6h/18h)
	}): Promise<any> {
		// Use the deposit endpoint to generate QR code
		try {
			// depixAddress is now optional - API will use default if not provided
			// If provided, it should be a valid PIX key (not a Liquid address)

			// Convert amount from reais to cents (must be integer)
			// Ex: 1.00 reais = 100 centavos
			const amountInCents = Math.round(data.amount * 100);

			// Validate minimum amount (100 cents = 1 real)
			if (amountInCents < 100) {
				throw new HttpException(
					'Valor mínimo é R$ 1,00',
					HttpStatus.BAD_REQUEST,
				);
			}

			const depositResponse = await this.createDeposit({
				amount: amountInCents, // Already in cents
				pixKey: data.depixAddress || '', // Use provided PIX key or empty string (API will use default)
				description: data.description,
				euid: data.payerEuid,
				merchantId: data.merchantId,
				userFullName: data.payerFullName,
				userTaxNumber: data.userTaxNumber, // Pass tax number for EUID restriction
				whitelist: data.whitelist, // Pass whitelist parameter to bypass first purchase limit
				splitFee: data.splitFee, // Pass split fee percentage
				depixSplitAddress: data.depixSplitAddress, // Pass split fee destination address
				delayDepixInHours: data.delayDepixInHours, // Pass delay for D+1 payment scheduling
			});

			// Check if we got the expected response structure
			const qrCopyPaste = depositResponse.response?.qrCopyPaste;
			const qrImageUrl = depositResponse.response?.qrImageUrl;
			const transactionId = depositResponse.response?.id;

			this.logger.log(
				`Eulen deposit response: qrCopyPaste=${!!qrCopyPaste}, qrImageUrl=${!!qrImageUrl}, id=${transactionId}`,
			);

			if (!qrCopyPaste || !transactionId) {
				this.logger.error(
					`Invalid Eulen API response: ${JSON.stringify(depositResponse)}`,
				);

				throw new HttpException(
					'Eulen API returned invalid response - missing QR code data',
					HttpStatus.SERVICE_UNAVAILABLE,
				);
			}

			return {
				qrCode: qrCopyPaste,
				qrCodeImage: qrImageUrl,
				amount: data.amount,
				transactionId: transactionId,
			};
		} catch (error) {
			// Handle authentication errors - no more development mode fallbacks
			if (this.isInvalidTokenError(error)) {
				this.logger.error('❌ INVALID EULEN TOKEN DETECTED');
				this.logger.error('Current token appears to be a test token or invalid');
				this.logger.error('For production use, please configure a valid EULEN API token');

				// Always throw auth errors - this forces proper token configuration
				throw new HttpException(
					'Token de autenticação Eulen inválido. Entre em contato com o suporte para configurar a integração.',
					HttpStatus.SERVICE_UNAVAILABLE,
				);
			}

			// For business logic errors (like invalid DePix address), provide proper Portuguese error messages
			if (error.response?.status === 520) {
				const eulenErrorMessage = error.response?.data?.response?.errorMessage || '';
				let userMessage = 'Erro no processamento do pagamento. Tente novamente.';

				// Translate common Eulen API errors to Portuguese
				if (eulenErrorMessage.includes('invalid DePix address')) {
					userMessage = 'Endereço DePix inválido. Verifique se é um endereço válido da rede Liquid e tente novamente.';
				} else if (eulenErrorMessage.includes('insufficient funds')) {
					userMessage = 'Saldo insuficiente para processar a transação.';
				} else if (eulenErrorMessage.includes('transaction limit exceeded')) {
					userMessage = 'Limite de transação excedido.';
				} else if (eulenErrorMessage.includes('amount too small')) {
					userMessage = 'Valor muito baixo para processamento.';
				}

				this.logger.error(`Eulen API business error: ${eulenErrorMessage}`);
				throw new HttpException(userMessage, HttpStatus.BAD_REQUEST);
			}

			// For other errors, use existing error handling
			throw error;
		}
	}

	/**
	 * Check if a string is a valid PIX key (NOT a Liquid address)
	 * PIX keys can be: CPF (11 digits), CNPJ (14 digits), email, phone, or EVP
	 * Liquid addresses typically start with: lq1, VJL, ex1, etc.
	 */
	private isValidPixKey(key: string): boolean {
		if (!key || typeof key !== 'string') return false;

		// Remove any spaces or special characters for validation
		const cleanKey = key.replace(/\s+/g, '').replace(/[^\w@.-]/g, '');

		// Check if it's a Liquid address (should NOT be sent as PIX key)
		const liquidPrefixes = ['lq1', 'VJL', 'ex1', 'bc1', 'tb1', 'ltc1', '1', '3'];
		if (liquidPrefixes.some(prefix => key.startsWith(prefix))) {
			return false; // It's a Liquid/crypto address, not a PIX key
		}

		// Check for PIX key patterns:
		// 1. CPF: exactly 11 digits
		if (/^\d{11}$/.test(cleanKey)) return true;

		// 2. CNPJ: exactly 14 digits
		if (/^\d{14}$/.test(cleanKey)) return true;

		// 3. Email: basic email format
		if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanKey)) return true;

		// 4. Phone: Brazilian phone format (10-11 digits)
		if (/^\d{10,11}$/.test(cleanKey)) return true;

		// 5. EVP (random PIX key): UUID-like format
		if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey)) return true;

		// If none of the above, it's not a valid PIX key
		return false;
	}

	/**
	 * Check if error is related to invalid/malformed JWT token
	 */
	private isInvalidTokenError(error: any): boolean {
		if (!error.response) return false;

		const status = error.response.status;
		const message = error.message?.toLowerCase() || '';
		const responseData = error.response.data;
		const errorMessage = responseData?.message?.toLowerCase() || '';
		const eulenErrorMessage = responseData?.response?.errorMessage?.toLowerCase() || '';

		// Check for common JWT/authentication error indicators
		return (
			status === 401 ||
			message.includes('jwt malformed') ||
			message.includes('invalid token') ||
			message.includes('token expired') ||
			errorMessage.includes('jwt malformed') ||
			errorMessage.includes('invalid token') ||
			errorMessage.includes('unauthorized') ||
			eulenErrorMessage.includes('jwt malformed') ||
			eulenErrorMessage.includes('invalid token')
		);
	}

	/**
	 * Generate a mock PIX QR code for development/testing
	 */
	private generateMockPixCode(depixAddress: string, amount: number): string {
		// Generate a realistic PIX QR code format for testing
		// This follows the PIX QR code standard structure
		const pixKey = `dev-${depixAddress.substring(0, 10)}`;
		const amountStr = amount.toFixed(2);
		const merchantName = 'Atlas DAO Dev';
		const merchantCity = 'Sao Paulo';
		const reference = Math.random().toString(36).substring(2, 8).toUpperCase();

		// PIX QR Code format (simplified for development)
		return `00020126580014BR.GOV.BCB.PIX0136${pixKey}52040000530398654${amountStr.length.toString().padStart(2, '0')}${amountStr}5802BR59${merchantName.length.toString().padStart(2, '0')}${merchantName}60${merchantCity.length.toString().padStart(2, '0')}${merchantCity}62070503${reference}6304ABCD`;
	}

	async validatePixKey(pixKey: string): Promise<any> {
		// Validate if it's a valid Liquid/DePix address
		// Basic validation - Liquid addresses start with specific prefixes
		const isValidDePix = pixKey.startsWith('VJL') || pixKey.startsWith('ex1');

		return {
			valid: isValidDePix,
			type: isValidDePix ? 'DEPIX' : 'INVALID',
			network: 'liquid',
			address: pixKey,
		};
	}
}
