import {
	Injectable,
	HttpException,
	HttpStatus,
	Logger,
	NotFoundException,
	BadRequestException,
	ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EulenClientService } from '../services/eulen-client.service';
import { LiquidValidationService } from '../services/liquid-validation.service';
import { EmailService } from '../services/email.service';
import { LwkService } from '../services/lwk.service';
import {
	CollateralTransactionType,
	CollateralTransactionStatus,
} from '@prisma/client';
import * as QRCode from 'qrcode';

// Interfaces para respostas
export interface CollateralSummary {
	current: number;
	maximum: number;
	available: number;
	pendingDeposits: number;
	pendingWithdrawals: number;
}

export interface PixDepositResponse {
	transactionId: string;
	qrCode: string;
	qrCodeImage: string;
	amount: number;
	fee: number;
	total: number;
	expiresAt: Date;
}

export interface DepixDepositResponse {
	transactionId: string;
	liquidAddress: string;
	amount: number;
	pollingExpiresAt: Date;
}

export interface DepixPollResponse {
	status: 'waiting' | 'received' | 'completed' | 'expired' | 'different_amount';
	receivedAmount?: number;
	expectedAmount?: number;
	message?: string;
	newBalance?: number;
	excessAmount?: number;
	requiresExcessWallet?: boolean;
}

export interface WithdrawalResponse {
	requestId: string;
	amount: number;
	liquidAddress: string;
	estimatedProcessingTime: string;
	newBalance: number;
}

@Injectable()
export class CollateralService {
	private readonly logger = new Logger(CollateralService.name);

	// Constantes
	private readonly MAX_COLLATERAL = 6000;
	private readonly PIX_FEE = 0.99;
	private readonly POLLING_TOTAL_DURATION_MS = 30 * 60 * 1000; // 30 minutos

	// Endereço do sistema para receber colateral via PIX (Eulen converte para este endereço)
	private readonly SYSTEM_COLLATERAL_ADDRESS =
		'lq1qqd5z6790x0ed2306x8gaaas7cdmhd7m9q4e8l0a58qh0ypnhue67j9zukjlwm2sfzyzrn4z0zc9rzsep9t2acqqhtz6p6ad7y';

	constructor(
		private readonly prisma: PrismaService,
		private readonly eulenClient: EulenClientService,
		private readonly liquidValidation: LiquidValidationService,
		private readonly emailService: EmailService,
		private readonly lwkService: LwkService,
	) {}

	/**
	 * Cron job para verificar pagamentos pendentes no backend
	 * Isso garante que pagamentos sejam detectados mesmo se o frontend parar de fazer polling
	 * Executa a cada 30 segundos
	 */
	@Cron('*/30 * * * * *')
	async checkPendingDepixPayments() {
		try {
			const pollingTransactions =
				await this.prisma.collateralTransaction.findMany({
					where: {
						status: 'POLLING',
						type: 'DEPOSIT_DEPIX',
						depixAddress: { not: null },
					},
				});

			if (pollingTransactions.length === 0) return;

			this.logger.log(
				`[COLLATERAL] Backend polling: checking ${pollingTransactions.length} pending depix deposit(s)`,
			);

			for (const tx of pollingTransactions) {
				try {
					const paymentResult = await this.lwkService.findDepixPayment(
						tx.depixAddress!,
						tx.amount,
						tx.pollingStartedAt ?? undefined,
					);

					if (
						paymentResult.found &&
						paymentResult.amount &&
						paymentResult.txid
					) {
						this.logger.log(
							`[COLLATERAL] Backend polling found payment for ${tx.id}: ${paymentResult.amount} BRL, txid: ${paymentResult.txid}`,
						);

						await this.processDepixPaymentReceived(
							tx.id,
							paymentResult.amount,
							paymentResult.txid,
						);
					}
				} catch (error) {
					this.logger.error(
						`[COLLATERAL] Backend polling error for ${tx.id}: ${error.message}`,
					);
				}
			}
		} catch (error) {
			this.logger.error(
				`[COLLATERAL] Error in backend polling cron: ${error.message}`,
			);
		}
	}

	/**
	 * Cron job para expirar transações de polling que passaram do tempo limite
	 * Faz uma verificação final do pagamento antes de expirar
	 * Executa a cada minuto
	 */
	@Cron(CronExpression.EVERY_MINUTE)
	async expireOldPollingTransactions() {
		try {
			const now = new Date();

			// Buscar transações que deveriam expirar (em vez de fazer updateMany direto)
			const expiredTransactions =
				await this.prisma.collateralTransaction.findMany({
					where: {
						status: 'POLLING',
						type: 'DEPOSIT_DEPIX',
						pollingExpiresAt: {
							lt: now,
						},
						depixAddress: { not: null },
					},
				});

			if (expiredTransactions.length === 0) return;

			this.logger.log(
				`[COLLATERAL] Checking ${expiredTransactions.length} expired polling transaction(s) before expiring`,
			);

			for (const tx of expiredTransactions) {
				try {
					// Verificação final do pagamento antes de expirar
					const paymentResult = await this.lwkService.findDepixPayment(
						tx.depixAddress!,
						tx.amount,
						tx.pollingStartedAt ?? undefined,
					);

					if (
						paymentResult.found &&
						paymentResult.amount &&
						paymentResult.txid
					) {
						this.logger.log(
							`[COLLATERAL] Final check FOUND payment for ${tx.id}: ${paymentResult.amount} BRL, txid: ${paymentResult.txid}. Crediting instead of expiring.`,
						);

						await this.processDepixPaymentReceived(
							tx.id,
							paymentResult.amount,
							paymentResult.txid,
						);
						continue;
					}
				} catch (error) {
					this.logger.error(
						`[COLLATERAL] Final check error for ${tx.id}: ${error.message}`,
					);
				}

				// Nenhum pagamento encontrado — expirar
				await this.prisma.collateralTransaction.update({
					where: { id: tx.id },
					data: { status: 'EXPIRED' },
				});

				this.logger.log(
					`[COLLATERAL] Expired transaction ${tx.id} (no payment found after final check)`,
				);
			}
		} catch (error) {
			this.logger.error(
				`[COLLATERAL] Error expiring old transactions: ${error.message}`,
			);
		}
	}

	/**
	 * Obter resumo do colateral do usuário
	 */
	async getSummary(userId: string): Promise<CollateralSummary> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { collateral: true },
		});

		if (!user) {
			throw new NotFoundException('Usuário não encontrado');
		}

		// Buscar transações pendentes
		const [pendingDeposits, pendingWithdrawals] = await Promise.all([
			this.prisma.collateralTransaction.aggregate({
				where: {
					userId,
					type: { in: ['DEPOSIT_PIX', 'DEPOSIT_DEPIX'] },
					status: { in: ['PENDING', 'POLLING'] },
				},
				_sum: { amount: true },
			}),
			this.prisma.collateralTransaction.aggregate({
				where: {
					userId,
					type: 'WITHDRAWAL',
					status: { in: ['AWAITING_APPROVAL', 'APPROVED', 'PROCESSING'] },
				},
				_sum: { amount: true },
			}),
		]);

		const currentCollateral = user.collateral || 0;
		const pendingDepositsAmount = pendingDeposits._sum.amount || 0;
		const pendingWithdrawalsAmount = pendingWithdrawals._sum.amount || 0;

		return {
			current: currentCollateral,
			maximum: this.MAX_COLLATERAL,
			available: Math.max(0, this.MAX_COLLATERAL - currentCollateral),
			pendingDeposits: pendingDepositsAmount,
			pendingWithdrawals: pendingWithdrawalsAmount,
		};
	}

	/**
	 * Aumentar colateral via PIX
	 * Gera um QR code PIX com taxa de R$0.99
	 */
	async increaseViaPix(
		userId: string,
		amount: number,
	): Promise<PixDepositResponse> {
		// Validar usuário
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				collateral: true,
				isAccountValidated: true,
				email: true,
				username: true,
			},
		});

		if (!user) {
			throw new NotFoundException('Usuário não encontrado');
		}

		if (!user.isAccountValidated) {
			throw new BadRequestException(
				'Sua conta precisa estar validada para adicionar colateral',
			);
		}

		const currentCollateral = user.collateral || 0;

		// Validar limites
		if (amount < 1) {
			throw new BadRequestException('O valor mínimo é R$ 1,00');
		}

		if (currentCollateral + amount > this.MAX_COLLATERAL) {
			const maxAllowed = this.MAX_COLLATERAL - currentCollateral;
			throw new BadRequestException(
				`Você só pode adicionar até R$ ${maxAllowed.toFixed(2)} (limite máximo de R$ ${this.MAX_COLLATERAL.toFixed(2)})`,
			);
		}

		// Calcular total com taxa
		const total = amount + this.PIX_FEE;

		try {
			// Gerar QR code via Eulen
			const pixResponse = await this.eulenClient.generatePixQRCode({
				amount: total,
				depixAddress: this.SYSTEM_COLLATERAL_ADDRESS,
				description: `Colateral Atlas - R$ ${amount.toFixed(2)}`,
				whitelist: true, // Usar whitelist para depósito de colateral
			});

			// Gerar imagem do QR code
			const qrCodeImage = await QRCode.toDataURL(pixResponse.qrCode, {
				width: 300,
				margin: 2,
			});

			// Criar transação no banco
			const transaction = await this.prisma.collateralTransaction.create({
				data: {
					userId,
					type: 'DEPOSIT_PIX',
					status: 'PENDING',
					amount,
					fee: this.PIX_FEE,
					netAmount: amount,
					pixQrCode: pixResponse.qrCode,
					pixQrCodeImage: qrCodeImage,
					eulenId: pixResponse.transactionId,
					previousBalance: currentCollateral,
					newBalance: currentCollateral, // Será atualizado quando confirmado
				},
			});

			this.logger.log(
				`[COLLATERAL] PIX deposit created: ${transaction.id} for user ${userId}, amount: R$ ${amount}`,
			);

			// Expiração em 30 minutos
			const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

			return {
				transactionId: transaction.id,
				qrCode: pixResponse.qrCode,
				qrCodeImage: qrCodeImage,
				amount,
				fee: this.PIX_FEE,
				total,
				expiresAt,
			};
		} catch (error) {
			this.logger.error(
				`[COLLATERAL] Error creating PIX deposit: ${error.message}`,
			);
			throw new HttpException(
				'Erro ao gerar QR code PIX. Tente novamente.',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Verificar status de pagamento PIX
	 */
	async checkPixStatus(
		userId: string,
		transactionId: string,
	): Promise<{
		status: string;
		message?: string;
		newBalance?: number;
	}> {
		const transaction = await this.prisma.collateralTransaction.findFirst({
			where: {
				id: transactionId,
				userId,
				type: 'DEPOSIT_PIX',
			},
		});

		if (!transaction) {
			throw new NotFoundException('Transação não encontrada');
		}

		// Se já foi processada, retornar status atual
		if (transaction.status === 'COMPLETED') {
			return {
				status: 'completed',
				message: 'Pagamento confirmado! Seu colateral foi atualizado.',
				newBalance: transaction.newBalance,
			};
		}

		if (transaction.status === 'FAILED' || transaction.status === 'EXPIRED') {
			return {
				status: transaction.status.toLowerCase(),
				message: 'Pagamento expirado ou falhou. Tente novamente.',
			};
		}

		// Verificar status no Eulen
		if (transaction.eulenId) {
			try {
				const eulenStatus = await this.eulenClient.getDepositStatus(
					transaction.eulenId,
				);

				this.logger.log(
					`[COLLATERAL] PIX status check for ${transactionId}: ${JSON.stringify(eulenStatus)}`,
				);

				// Mapear status do Eulen
				const status = eulenStatus.response?.status;

				if (status === 'depix_sent' || status === 'completed') {
					// Pagamento confirmado - atualizar colateral
					await this.processPixPaymentConfirmed(transaction);

					return {
						status: 'completed',
						message: 'Pagamento confirmado! Seu colateral foi atualizado.',
						newBalance: (transaction.previousBalance || 0) + transaction.amount,
					};
				}

				if (status === 'expired' || status === 'failed') {
					await this.prisma.collateralTransaction.update({
						where: { id: transactionId },
						data: { status: 'EXPIRED' },
					});

					return {
						status: 'expired',
						message: 'QR code expirado. Gere um novo.',
					};
				}

				// Ainda pendente
				return {
					status: 'pending',
					message: 'Aguardando pagamento...',
				};
			} catch (error) {
				this.logger.error(
					`[COLLATERAL] Error checking PIX status: ${error.message}`,
				);
				return {
					status: 'pending',
					message: 'Aguardando pagamento...',
				};
			}
		}

		return {
			status: 'pending',
			message: 'Aguardando pagamento...',
		};
	}

	/**
	 * Processar confirmação de pagamento PIX
	 */
	private async processPixPaymentConfirmed(
		transaction: any,
	): Promise<void> {
		const newBalance =
			(transaction.previousBalance || 0) + transaction.amount;

		// Usar transação para garantir consistência
		await this.prisma.$transaction(async (tx) => {
			// Atualizar transação
			await tx.collateralTransaction.update({
				where: { id: transaction.id },
				data: {
					status: 'COMPLETED',
					newBalance,
					processedAt: new Date(),
					actualAmount: transaction.amount,
				},
			});

			// Atualizar colateral do usuário
			await tx.user.update({
				where: { id: transaction.userId },
				data: { collateral: newBalance },
			});
		});

		// Enviar email de confirmação
		try {
			const user = await this.prisma.user.findUnique({
				where: { id: transaction.userId },
				select: { email: true, username: true },
			});

			if (user) {
				await this.emailService.sendCollateralDepositConfirmed(
					user.email,
					user.username,
					transaction.amount,
					newBalance,
				);
			}
		} catch (emailError) {
			this.logger.error(
				`[COLLATERAL] Error sending confirmation email: ${emailError.message}`,
			);
		}

		this.logger.log(
			`[COLLATERAL] PIX payment confirmed for transaction ${transaction.id}. New balance: R$ ${newBalance}`,
		);
	}

	/**
	 * Aumentar colateral via Depix (LWK)
	 * Gera um endereço Liquid único para receber o depósito
	 */
	async increaseViaDepix(
		userId: string,
		amount: number,
	): Promise<DepixDepositResponse> {
		// Validar usuário
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				collateral: true,
				isAccountValidated: true,
			},
		});

		if (!user) {
			throw new NotFoundException('Usuário não encontrado');
		}

		if (!user.isAccountValidated) {
			throw new BadRequestException(
				'Sua conta precisa estar validada para adicionar colateral',
			);
		}

		const currentCollateral = user.collateral || 0;

		// Validar limites
		if (amount < 1) {
			throw new BadRequestException('O valor mínimo é R$ 1,00');
		}

		if (currentCollateral + amount > this.MAX_COLLATERAL) {
			const maxAllowed = this.MAX_COLLATERAL - currentCollateral;
			throw new BadRequestException(
				`Você só pode adicionar até R$ ${maxAllowed.toFixed(2)} (limite máximo de R$ ${this.MAX_COLLATERAL.toFixed(2)})`,
			);
		}

		// Buscar próximo índice de endereço
		const lastTransaction = await this.prisma.collateralTransaction.findFirst({
			where: { addressIndex: { not: null } },
			orderBy: { addressIndex: 'desc' },
			select: { addressIndex: true },
		});

		const nextIndex = (lastTransaction?.addressIndex ?? -1) + 1;

		// Por enquanto, usar um endereço placeholder até integrar LWK
		// TODO: Integrar com LwkService para gerar endereço real
		const liquidAddress = await this.generateDepixAddress(nextIndex);

		const pollingExpiresAt = new Date(
			Date.now() + this.POLLING_TOTAL_DURATION_MS,
		);

		// Criar transação
		const transaction = await this.prisma.collateralTransaction.create({
			data: {
				userId,
				type: 'DEPOSIT_DEPIX',
				status: 'POLLING',
				amount,
				depixAddress: liquidAddress,
				addressIndex: nextIndex,
				pollingStartedAt: new Date(),
				pollingExpiresAt,
				previousBalance: currentCollateral,
				newBalance: currentCollateral, // Será atualizado quando confirmado
			},
		});

		this.logger.log(
			`[COLLATERAL] Depix deposit created: ${transaction.id} for user ${userId}, amount: R$ ${amount}, address: ${liquidAddress}`,
		);

		return {
			transactionId: transaction.id,
			liquidAddress,
			amount,
			pollingExpiresAt,
		};
	}

	/**
	 * Gerar endereço Depix a partir do xpub usando LwkService
	 */
	private async generateDepixAddress(index: number): Promise<string> {
		try {
			const address = await this.lwkService.generateAddress(index);
			this.logger.log(`[COLLATERAL] Generated Depix address at index ${index}: ${address.substring(0, 20)}...`);
			return address;
		} catch (error) {
			this.logger.error(`[COLLATERAL] Error generating Depix address: ${error.message}`);
			// Fallback para endereço do sistema em caso de erro
			this.logger.warn('[COLLATERAL] Falling back to system address');
			return this.SYSTEM_COLLATERAL_ADDRESS;
		}
	}

	/**
	 * Poll para verificar pagamento Depix
	 */
	async pollDepixPayment(
		userId: string,
		transactionId: string,
	): Promise<DepixPollResponse> {
		const transaction = await this.prisma.collateralTransaction.findFirst({
			where: {
				id: transactionId,
				userId,
				type: 'DEPOSIT_DEPIX',
			},
		});

		if (!transaction) {
			throw new NotFoundException('Transação não encontrada');
		}

		// Se já foi processada
		if (transaction.status === 'COMPLETED') {
			return {
				status: 'completed',
				receivedAmount: transaction.actualAmount || transaction.amount,
				newBalance: transaction.newBalance,
				message: 'Depósito confirmado!',
			};
		}

		// Verificar se expirou
		if (
			transaction.pollingExpiresAt &&
			new Date() > transaction.pollingExpiresAt
		) {
			await this.prisma.collateralTransaction.update({
				where: { id: transactionId },
				data: { status: 'EXPIRED' },
			});

			return {
				status: 'expired',
				message:
					'Tempo limite expirado. Caso tenha enviado, entre em contato com o suporte.',
			};
		}

		if (transaction.status === 'EXPIRED' || transaction.status === 'FAILED') {
			return {
				status: 'expired',
				message: 'Transação expirada ou falhou.',
			};
		}

		// Verificar pagamento via Esplora API usando LwkService
		if (transaction.depixAddress) {
			try {
				const paymentResult = await this.lwkService.findDepixPayment(
					transaction.depixAddress,
					transaction.amount,
					transaction.pollingStartedAt ?? undefined,
				);

				if (paymentResult.found && paymentResult.amount && paymentResult.txid) {
					this.logger.log(
						`[COLLATERAL] Depix payment found for ${transactionId}: ${paymentResult.amount} BRL, txid: ${paymentResult.txid}`,
					);

					// Processar o pagamento recebido
					return await this.processDepixPaymentReceived(
						transactionId,
						paymentResult.amount,
						paymentResult.txid,
					);
				}
			} catch (error) {
				this.logger.error(`[COLLATERAL] Error checking Esplora: ${error.message}`);
			}
		}

		return {
			status: 'waiting',
			expectedAmount: transaction.amount,
			message: 'Aguardando recebimento do Depix...',
		};
	}

	/**
	 * Processar pagamento Depix recebido
	 * Chamado quando detectamos um pagamento no endereço monitorado
	 */
	async processDepixPaymentReceived(
		transactionId: string,
		receivedAmount: number,
		txId: string,
	): Promise<DepixPollResponse> {
		const transaction = await this.prisma.collateralTransaction.findUnique({
			where: { id: transactionId },
			include: { user: true },
		});

		if (!transaction) {
			throw new NotFoundException('Transação não encontrada');
		}

		const expectedAmount = transaction.amount;
		const currentCollateral = transaction.previousBalance || 0;
		let newBalance = currentCollateral + receivedAmount;
		let excessAmount: number | undefined;
		let requiresExcessWallet = false;

		// Verificar se excede o limite
		if (newBalance > this.MAX_COLLATERAL) {
			excessAmount = newBalance - this.MAX_COLLATERAL;
			newBalance = this.MAX_COLLATERAL;
			requiresExcessWallet = true;

			this.logger.log(
				`[COLLATERAL] Depix deposit exceeds limit. Excess: R$ ${excessAmount}`,
			);
		}

		// Determinar status baseado no valor recebido
		const isDifferentAmount = receivedAmount !== expectedAmount;

		await this.prisma.$transaction(async (tx) => {
			// Atualizar transação
			await tx.collateralTransaction.update({
				where: { id: transactionId },
				data: {
					status: 'COMPLETED',
					actualAmount: receivedAmount,
					newBalance,
					depixTxId: txId,
					processedAt: new Date(),
					excessAmount,
					excessWithdrawalRequested: false,
				},
			});

			// Atualizar colateral do usuário
			await tx.user.update({
				where: { id: transaction.userId },
				data: { collateral: newBalance },
			});
		});

		// Enviar email
		try {
			await this.emailService.sendCollateralDepositConfirmed(
				transaction.user.email,
				transaction.user.username,
				receivedAmount,
				newBalance,
			);
		} catch (emailError) {
			this.logger.error(
				`[COLLATERAL] Error sending confirmation email: ${emailError.message}`,
			);
		}

		this.logger.log(
			`[COLLATERAL] Depix payment processed: ${transactionId}. Received: R$ ${receivedAmount}, New balance: R$ ${newBalance}`,
		);

		let message = 'Depósito confirmado!';
		if (isDifferentAmount && !requiresExcessWallet) {
			message = `Valor recebido (R$ ${receivedAmount.toFixed(2)}) diferente do esperado (R$ ${expectedAmount.toFixed(2)}). O valor recebido foi adicionado ao seu colateral.`;
		} else if (requiresExcessWallet) {
			message = `Depósito excedeu o limite. R$ ${this.MAX_COLLATERAL.toFixed(2)} foi adicionado ao colateral. Informe uma carteira para receber o excesso de R$ ${excessAmount?.toFixed(2)}.`;
		}

		return {
			status: isDifferentAmount ? 'different_amount' : 'completed',
			receivedAmount,
			expectedAmount,
			newBalance,
			excessAmount,
			requiresExcessWallet,
			message,
		};
	}

	/**
	 * Diminuir colateral - Solicitar saque
	 */
	async decreaseCollateral(
		userId: string,
		amount: number,
		liquidAddress: string,
	): Promise<WithdrawalResponse> {
		// Validar usuário
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				collateral: true,
				isAccountValidated: true,
			},
		});

		if (!user) {
			throw new NotFoundException('Usuário não encontrado');
		}

		if (!user.isAccountValidated) {
			throw new BadRequestException(
				'Sua conta precisa estar validada para sacar colateral',
			);
		}

		const currentCollateral = user.collateral || 0;

		// Validar valor
		if (amount < 1) {
			throw new BadRequestException('O valor mínimo é R$ 1,00');
		}

		if (amount > currentCollateral) {
			throw new BadRequestException(
				`Você só pode sacar até R$ ${currentCollateral.toFixed(2)}`,
			);
		}

		// Validar endereço Liquid
		const isValidAddress =
			await this.liquidValidation.validateLiquidAddress(liquidAddress);
		if (!isValidAddress) {
			throw new BadRequestException(
				'Endereço Liquid inválido. Verifique e tente novamente.',
			);
		}

		const newBalance = currentCollateral - amount;

		// Criar solicitação de saque e atualizar saldo em transação
		const transaction = await this.prisma.$transaction(async (tx) => {
			// Criar transação de saque
			const withdrawal = await tx.collateralTransaction.create({
				data: {
					userId,
					type: 'WITHDRAWAL',
					status: 'AWAITING_APPROVAL',
					amount,
					liquidAddress,
					previousBalance: currentCollateral,
					newBalance,
				},
			});

			// Atualizar colateral do usuário (deduzir imediatamente)
			await tx.user.update({
				where: { id: userId },
				data: { collateral: newBalance },
			});

			return withdrawal;
		});

		this.logger.log(
			`[COLLATERAL] Withdrawal request created: ${transaction.id} for user ${userId}, amount: R$ ${amount}`,
		);

		return {
			requestId: transaction.id,
			amount,
			liquidAddress,
			estimatedProcessingTime: 'até 48 horas',
			newBalance,
		};
	}

	/**
	 * Cancelar solicitação de saque
	 */
	async cancelWithdrawal(userId: string, transactionId: string): Promise<void> {
		const transaction = await this.prisma.collateralTransaction.findFirst({
			where: {
				id: transactionId,
				userId,
				type: 'WITHDRAWAL',
				status: 'AWAITING_APPROVAL',
			},
		});

		if (!transaction) {
			throw new NotFoundException(
				'Solicitação não encontrada ou não pode ser cancelada',
			);
		}

		// Restaurar colateral
		await this.prisma.$transaction(async (tx) => {
			await tx.collateralTransaction.update({
				where: { id: transactionId },
				data: { status: 'CANCELLED' },
			});

			await tx.user.update({
				where: { id: userId },
				data: { collateral: { increment: transaction.amount } },
			});
		});

		this.logger.log(
			`[COLLATERAL] Withdrawal cancelled: ${transactionId}. Balance restored.`,
		);
	}

	/**
	 * Obter histórico de colateral
	 */
	async getHistory(
		userId: string,
		options?: {
			limit?: number;
			offset?: number;
			type?: CollateralTransactionType;
		},
	): Promise<{
		transactions: any[];
		total: number;
	}> {
		const where: any = { userId };

		if (options?.type) {
			where.type = options.type;
		}

		const [transactions, total] = await Promise.all([
			this.prisma.collateralTransaction.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				take: options?.limit || 50,
				skip: options?.offset || 0,
				select: {
					id: true,
					type: true,
					status: true,
					amount: true,
					actualAmount: true,
					fee: true,
					previousBalance: true,
					newBalance: true,
					liquidAddress: true,
					createdAt: true,
					processedAt: true,
					adminNotes: true,
				},
			}),
			this.prisma.collateralTransaction.count({ where }),
		]);

		return { transactions, total };
	}

	// ==================== MÉTODOS ADMIN ====================

	/**
	 * Obter saques pendentes (Admin)
	 */
	async getPendingWithdrawals(): Promise<any[]> {
		return this.prisma.collateralTransaction.findMany({
			where: {
				type: 'WITHDRAWAL',
				status: 'AWAITING_APPROVAL',
			},
			include: {
				user: {
					select: {
						id: true,
						username: true,
						email: true,
						collateral: true,
					},
				},
			},
			orderBy: { createdAt: 'asc' },
		});
	}

	/**
	 * Obter histórico de saques (Admin)
	 */
	async getWithdrawalHistory(status?: CollateralTransactionStatus): Promise<any[]> {
		const where: any = { type: 'WITHDRAWAL' };

		if (status) {
			where.status = status;
		}

		return this.prisma.collateralTransaction.findMany({
			where,
			include: {
				user: {
					select: {
						id: true,
						username: true,
						email: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
			take: 100,
		});
	}

	/**
	 * Aprovar saque de colateral (Admin)
	 */
	async approveWithdrawal(
		transactionId: string,
		adminId: string,
		dto: { coldwalletTxId?: string; adminNotes?: string },
	): Promise<any> {
		const transaction = await this.prisma.collateralTransaction.findUnique({
			where: { id: transactionId },
			include: { user: true },
		});

		if (!transaction) {
			throw new NotFoundException('Transação não encontrada');
		}

		if (transaction.status !== 'AWAITING_APPROVAL') {
			throw new BadRequestException(
				'Esta solicitação não está aguardando aprovação',
			);
		}

		const updated = await this.prisma.collateralTransaction.update({
			where: { id: transactionId },
			data: {
				status: dto.coldwalletTxId ? 'COMPLETED' : 'APPROVED',
				approvedBy: adminId,
				approvedAt: new Date(),
				coldwalletTxId: dto.coldwalletTxId,
				adminNotes: dto.adminNotes,
				processedAt: dto.coldwalletTxId ? new Date() : undefined,
			},
		});

		// Enviar email de notificação
		try {
			await this.emailService.sendCollateralWithdrawalApproved(
				transaction.user.email,
				transaction.user.username,
				transaction.amount,
				dto.coldwalletTxId,
			);
		} catch (emailError) {
			this.logger.error(
				`[COLLATERAL] Error sending approval email: ${emailError.message}`,
			);
		}

		this.logger.log(
			`[COLLATERAL] Admin ${adminId} approved withdrawal ${transactionId}`,
		);

		return updated;
	}

	/**
	 * Rejeitar saque de colateral (Admin)
	 */
	async rejectWithdrawal(
		transactionId: string,
		adminId: string,
		dto: { adminNotes: string },
	): Promise<any> {
		const transaction = await this.prisma.collateralTransaction.findUnique({
			where: { id: transactionId },
			include: { user: true },
		});

		if (!transaction) {
			throw new NotFoundException('Transação não encontrada');
		}

		if (transaction.status !== 'AWAITING_APPROVAL') {
			throw new BadRequestException(
				'Esta solicitação não está aguardando aprovação',
			);
		}

		// Restaurar colateral do usuário e atualizar transação
		await this.prisma.$transaction(async (tx) => {
			await tx.collateralTransaction.update({
				where: { id: transactionId },
				data: {
					status: 'REJECTED',
					rejectedBy: adminId,
					rejectedAt: new Date(),
					adminNotes: dto.adminNotes,
				},
			});

			// Restaurar colateral
			await tx.user.update({
				where: { id: transaction.userId },
				data: { collateral: { increment: transaction.amount } },
			});
		});

		// Enviar email de notificação
		try {
			await this.emailService.sendCollateralWithdrawalRejected(
				transaction.user.email,
				transaction.user.username,
				transaction.amount,
				dto.adminNotes,
			);
		} catch (emailError) {
			this.logger.error(
				`[COLLATERAL] Error sending rejection email: ${emailError.message}`,
			);
		}

		this.logger.log(
			`[COLLATERAL] Admin ${adminId} rejected withdrawal ${transactionId}. Reason: ${dto.adminNotes}`,
		);

		return { success: true };
	}

	/**
	 * Definir carteira para excesso (quando depósito excede 6000)
	 */
	async setExcessWallet(
		userId: string,
		transactionId: string,
		walletAddress: string,
	): Promise<void> {
		const transaction = await this.prisma.collateralTransaction.findFirst({
			where: {
				id: transactionId,
				userId,
				excessAmount: { gt: 0 },
				excessWithdrawalRequested: false,
			},
		});

		if (!transaction) {
			throw new NotFoundException(
				'Transação não encontrada ou não tem excesso pendente',
			);
		}

		// Validar endereço
		const isValid =
			await this.liquidValidation.validateLiquidAddress(walletAddress);
		if (!isValid) {
			throw new BadRequestException('Endereço Liquid inválido');
		}

		// Criar solicitação de saque para o excesso
		await this.prisma.$transaction(async (tx) => {
			// Marcar que o saque do excesso foi solicitado
			await tx.collateralTransaction.update({
				where: { id: transactionId },
				data: {
					excessWithdrawalRequested: true,
					excessWalletAddress: walletAddress,
				},
			});

			// Criar nova transação de saque para o excesso
			await tx.collateralTransaction.create({
				data: {
					userId,
					type: 'WITHDRAWAL',
					status: 'AWAITING_APPROVAL',
					amount: transaction.excessAmount!,
					liquidAddress: walletAddress,
					previousBalance: this.MAX_COLLATERAL,
					newBalance: this.MAX_COLLATERAL,
					adminNotes: `Saque automático de excesso do depósito ${transactionId}`,
				},
			});
		});

		this.logger.log(
			`[COLLATERAL] Excess wallet set for transaction ${transactionId}: ${walletAddress}`,
		);
	}
}
