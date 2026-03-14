import {
	Injectable,
	HttpException,
	HttpStatus,
	Logger,
	Inject,
	forwardRef,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WithdrawalStatus, UserRole } from '@prisma/client';
import { LimitValidationService } from '../services/limit-validation.service';
import { CouponsService } from '../coupons/coupons.service';
import { ValidateCouponDto } from '../coupons/dto/coupon.dto';
import { LwkService } from '../services/lwk.service';
import { EulenClientService } from '../services/eulen-client.service';

@Injectable()
export class WithdrawalsService {
	private readonly logger = new Logger(WithdrawalsService.name);

	// Fee structure: 2.5% for >= R$100, 2.5% + R$1 for R$2-R$99
	private readonly FEE_PERCENTAGE = 0.025;
	private readonly SMALL_AMOUNT_FIXED_FEE = 1.0;
	private readonly SMALL_AMOUNT_THRESHOLD = 100;
	private readonly MIN_AMOUNT = 2;
	private readonly POLLING_DURATION_MS = 30 * 60 * 1000; // 30 minutes
	private readonly EULEN_MAX_PAYOUT_CENTS = 594000; // R$5940 max per Eulen transaction

	constructor(
		private prisma: PrismaService,
		private limitValidation: LimitValidationService,
		@Inject(forwardRef(() => CouponsService))
		private couponsService: CouponsService,
		private lwkService: LwkService,
		private eulenClient: EulenClientService,
	) {}

	/**
	 * Calculate Atlas fee based on amount
	 * >= R$100: 2.5%
	 * R$2 - R$99: 2.5% + R$1
	 */
	private calculateFee(amount: number): number {
		const percentageFee = amount * this.FEE_PERCENTAGE;
		if (amount >= this.SMALL_AMOUNT_THRESHOLD) {
			return Math.round(percentageFee * 100) / 100;
		}
		return Math.round((percentageFee + this.SMALL_AMOUNT_FIXED_FEE) * 100) / 100;
	}

	/**
	 * Phase 1: User creates withdrawal
	 * Generates LWK address, calculates fees, returns address + amount + timer
	 */
	async createWithdrawal(userId: string, dto: CreateWithdrawalDto) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: { limits: true },
		});

		if (!user || !user.isActive) {
			throw new HttpException(
				'Usuário não encontrado ou inativo',
				HttpStatus.NOT_FOUND,
			);
		}

		if (!user.isAccountValidated) {
			throw new HttpException(
				'Conta não validada. Por favor, complete a validação antes de solicitar saques.',
				HttpStatus.FORBIDDEN,
			);
		}

		if (dto.amount < this.MIN_AMOUNT) {
			throw new HttpException(
				`Valor mínimo de saque é R$ ${this.MIN_AMOUNT.toFixed(2)}`,
				HttpStatus.BAD_REQUEST,
			);
		}

		// Calculate fee
		let originalFee = this.calculateFee(dto.amount);
		let fee = originalFee;
		let couponDiscount = 0;

		// Apply coupon if provided
		if (dto.couponCode) {
			try {
				const couponValidation = await this.couponsService.validateCoupon(
					{ code: dto.couponCode, amount: dto.amount, method: 'PIX' as any },
					userId,
				);
				if (couponValidation.valid && couponValidation.discountPercentage) {
					couponDiscount = originalFee * (couponValidation.discountPercentage / 100);
					fee = Math.max(0, originalFee - couponDiscount);
				}
			} catch (error) {
				this.logger.warn(`Invalid coupon attempt: ${error.message}`);
			}
		}

		// Net amount = what user receives via PIX
		const netAmount = dto.amount - fee;

		if (netAmount < 1) {
			throw new HttpException(
				`Valor líquido após taxa (R$ ${netAmount.toFixed(2)}) é muito baixo.`,
				HttpStatus.BAD_REQUEST,
			);
		}

		// Generate unique LWK address
		const nextIndex = await this.getNextAddressIndex();
		const depixReceiveAddress = await this.lwkService.generateAddress(nextIndex);

		const pollingExpiresAt = new Date(Date.now() + this.POLLING_DURATION_MS);
		const scheduledFor = this.calculateNextBusinessDay(new Date());

		// Save PIX key to user profile if requested
		if (dto.savePixKey && dto.pixKey) {
			try {
				await this.prisma.user.update({
					where: { id: userId },
					data: { pixKey: dto.pixKey, pixKeyType: dto.pixKeyType },
				});
			} catch (error) {
				this.logger.error(`Failed to save PIX key: ${error.message}`);
			}
		}

		const withdrawal = await this.prisma.withdrawalRequest.create({
			data: {
				userId,
				amount: dto.amount,
				method: 'PIX',
				pixKey: dto.pixKey,
				pixKeyType: dto.pixKeyType,
				fee,
				netAmount,
				scheduledFor,
				cpfCnpj: dto.cpfCnpj,
				fullName: dto.fullName,
				status: WithdrawalStatus.AWAITING_DEPOSIT,
				depixReceiveAddress,
				addressIndex: nextIndex,
				pollingExpiresAt,
			},
			include: {
				user: { select: { id: true, email: true, username: true } },
			},
		});

		// Apply coupon usage record
		if (dto.couponCode && couponDiscount > 0) {
			try {
				await this.couponsService.applyCoupon(
					dto.couponCode,
					userId,
					withdrawal.id,
					originalFee,
					fee,
				);
			} catch (error) {
				this.logger.error(`Failed to apply coupon: ${error.message}`);
			}
		}

		this.logger.log(
			`[WITHDRAWAL] Created ${withdrawal.id} for user ${userId}, amount: R$ ${dto.amount}, fee: R$ ${fee}, address: ${depixReceiveAddress.substring(0, 20)}...`,
		);

		return {
			id: withdrawal.id,
			amount: withdrawal.amount,
			fee: withdrawal.fee,
			netAmount: withdrawal.netAmount,
			depixReceiveAddress,
			pollingExpiresAt,
			status: withdrawal.status,
			message: `Envie exatamente R$ ${withdrawal.amount.toFixed(2)} em DePix para o endereço fornecido.`,
		};
	}

	/**
	 * Check deposit status - frontend polls this
	 */
	async checkDepositStatus(userId: string, id: string) {
		const withdrawal = await this.prisma.withdrawalRequest.findFirst({
			where: { id, userId },
		});

		if (!withdrawal) {
			throw new HttpException('Saque não encontrado', HttpStatus.NOT_FOUND);
		}

		if (withdrawal.status === WithdrawalStatus.AWAITING_DEPOSIT && withdrawal.depixReceiveAddress) {
			// Check blockchain for payment
			const payment = await this.lwkService.findDepixPayment(
				withdrawal.depixReceiveAddress,
				withdrawal.amount,
				withdrawal.requestedAt,
			);

			if (payment.found && payment.amount && payment.txid) {
				const diff = payment.amount - withdrawal.amount;

				if (Math.abs(diff) < 0.01) {
					// Exact amount
					await this.prisma.withdrawalRequest.update({
						where: { id },
						data: {
							status: WithdrawalStatus.PENDING,
							receivedAmount: payment.amount,
							depixReceiveTxId: payment.txid,
						},
					});
					return { status: 'PENDING', message: 'Depósito confirmado! Aguardando aprovação do admin.' };
				} else if (diff > 0.01) {
					// Overpayment
					await this.prisma.withdrawalRequest.update({
						where: { id },
						data: {
							status: WithdrawalStatus.PENDING,
							receivedAmount: payment.amount,
							depixReceiveTxId: payment.txid,
							excessAmount: diff,
						},
					});
					return {
						status: 'PENDING',
						message: `Depósito confirmado com excedente de R$ ${diff.toFixed(2)}. Entre em contato com o suporte.`,
						excessAmount: diff,
					};
				} else {
					// Underpayment - still awaiting
					return {
						status: 'AWAITING_DEPOSIT',
						message: `Valor recebido (R$ ${payment.amount.toFixed(2)}) é menor que o necessário (R$ ${withdrawal.amount.toFixed(2)}). Faltam R$ ${Math.abs(diff).toFixed(2)}.`,
						receivedAmount: payment.amount,
						expectedAmount: withdrawal.amount,
					};
				}
			}

			// Check expiration
			if (withdrawal.pollingExpiresAt && new Date() > withdrawal.pollingExpiresAt) {
				return { status: 'EXPIRED', message: 'Tempo de pagamento expirado.' };
			}

			return {
				status: 'AWAITING_DEPOSIT',
				message: 'Aguardando depósito DePix...',
				depixReceiveAddress: withdrawal.depixReceiveAddress,
				amount: withdrawal.amount,
				pollingExpiresAt: withdrawal.pollingExpiresAt,
			};
		}

		return {
			status: withdrawal.status,
			eulenStatus: withdrawal.eulenStatus,
			receivedAmount: withdrawal.receivedAmount,
			excessAmount: withdrawal.excessAmount,
		};
	}

	/**
	 * Cron: Poll pending deposits every 30s
	 */
	@Cron('*/30 * * * * *')
	async pollPendingDeposits() {
		try {
			const awaitingDeposits = await this.prisma.withdrawalRequest.findMany({
				where: {
					status: WithdrawalStatus.AWAITING_DEPOSIT,
					depixReceiveAddress: { not: null },
				},
			});

			if (awaitingDeposits.length === 0) return;

			this.logger.log(`[WITHDRAWAL] Polling ${awaitingDeposits.length} pending deposit(s)`);

			for (const w of awaitingDeposits) {
				try {
					const payment = await this.lwkService.findDepixPayment(
						w.depixReceiveAddress!,
						w.amount,
						w.requestedAt,
					);

					if (payment.found && payment.amount && payment.txid) {
						const diff = payment.amount - w.amount;
						const updateData: any = {
							receivedAmount: payment.amount,
							depixReceiveTxId: payment.txid,
						};

						if (Math.abs(diff) < 0.01 || diff > 0.01) {
							// Exact or overpayment -> PENDING
							updateData.status = WithdrawalStatus.PENDING;
							if (diff > 0.01) {
								updateData.excessAmount = diff;
							}
							await this.prisma.withdrawalRequest.update({
								where: { id: w.id },
								data: updateData,
							});
							this.logger.log(
								`[WITHDRAWAL] Deposit received for ${w.id}: R$ ${payment.amount} (expected R$ ${w.amount})`,
							);
						}
						// Underpayment - leave as AWAITING_DEPOSIT, don't update status
					}
				} catch (error) {
					this.logger.error(`[WITHDRAWAL] Polling error for ${w.id}: ${error.message}`);
				}
			}
		} catch (error) {
			this.logger.error(`[WITHDRAWAL] Polling cron error: ${error.message}`);
		}
	}

	/**
	 * Cron: Expire old withdrawals without payment
	 */
	@Cron(CronExpression.EVERY_MINUTE)
	async expireOldWithdrawals() {
		try {
			const now = new Date();

			const expiredWithdrawals = await this.prisma.withdrawalRequest.findMany({
				where: {
					status: WithdrawalStatus.AWAITING_DEPOSIT,
					pollingExpiresAt: { lt: now },
					depixReceiveAddress: { not: null },
				},
			});

			if (expiredWithdrawals.length === 0) return;

			this.logger.log(`[WITHDRAWAL] Checking ${expiredWithdrawals.length} expired withdrawal(s)`);

			for (const w of expiredWithdrawals) {
				try {
					// Final check before expiring
					const payment = await this.lwkService.findDepixPayment(
						w.depixReceiveAddress!,
						w.amount,
						w.requestedAt,
					);

					if (payment.found && payment.amount && payment.txid) {
						const diff = payment.amount - w.amount;
						if (Math.abs(diff) < 0.01 || diff > 0.01) {
							await this.prisma.withdrawalRequest.update({
								where: { id: w.id },
								data: {
									status: WithdrawalStatus.PENDING,
									receivedAmount: payment.amount,
									depixReceiveTxId: payment.txid,
									excessAmount: diff > 0.01 ? diff : undefined,
								},
							});
							this.logger.log(`[WITHDRAWAL] Late payment found for ${w.id}: R$ ${payment.amount}`);
							continue;
						}
					}

					// No payment - expire
					await this.prisma.withdrawalRequest.update({
						where: { id: w.id },
						data: {
							status: WithdrawalStatus.EXPIRED,
							statusReason: 'Tempo limite de pagamento excedido (30 minutos)',
						},
					});
					this.logger.log(`[WITHDRAWAL] Expired ${w.id} - no payment received`);
				} catch (error) {
					this.logger.error(`[WITHDRAWAL] Expiry error for ${w.id}: ${error.message}`);
				}
			}
		} catch (error) {
			this.logger.error(`[WITHDRAWAL] Expiry cron error: ${error.message}`);
		}
	}

	/**
	 * Admin: Approve withdrawal - calls Eulen createWithdraw
	 * Returns Eulen deposit address and amount for admin to send DePix
	 */
	async adminApproveWithdrawal(id: string, adminId: string) {
		const withdrawal = await this.prisma.withdrawalRequest.findUnique({
			where: { id },
			include: { user: { select: { id: true, email: true, username: true } } },
		});

		if (!withdrawal) {
			throw new HttpException('Saque não encontrado', HttpStatus.NOT_FOUND);
		}

		if (withdrawal.status !== WithdrawalStatus.PENDING) {
			throw new HttpException(
				'Apenas saques pendentes podem ser aprovados',
				HttpStatus.BAD_REQUEST,
			);
		}

		if (!withdrawal.pixKey) {
			throw new HttpException('Chave PIX não encontrada no saque', HttpStatus.BAD_REQUEST);
		}

		const payoutAmountInCents = Math.round(withdrawal.netAmount * 100);

		if (payoutAmountInCents <= this.EULEN_MAX_PAYOUT_CENTS) {
			// Single Eulen call - amount fits within limit
			const eulenResult = await this.eulenClient.createWithdraw({
				pixKey: withdrawal.pixKey,
				payoutAmountInCents,
			});

			const updated = await this.prisma.withdrawalRequest.update({
				where: { id },
				data: {
					status: WithdrawalStatus.APPROVED,
					approvedBy: adminId,
					approvedAt: new Date(),
					eulenWithdrawalId: eulenResult.withdrawalId,
					eulenDepositAddress: eulenResult.depositAddress,
					eulenDepositAmountCents: eulenResult.depositAmountInCents,
					eulenPayoutAmountCents: eulenResult.payoutAmountInCents,
					eulenStatus: 'unsent',
				},
				include: { user: { select: { id: true, email: true, username: true } } },
			});

			this.logger.log(
				`[WITHDRAWAL] Approved ${id} by admin ${adminId}. Eulen ID: ${eulenResult.withdrawalId}`,
			);

			return {
				...updated,
				eulenDepositAddress: eulenResult.depositAddress,
				eulenDepositAmountCents: eulenResult.depositAmountInCents,
				eulenDepositAmountBRL: eulenResult.depositAmountInCents / 100,
			};
		}

		// Split into multiple Eulen calls - amount exceeds R$5940
		const splits: { payoutAmountInCents: number }[] = [];
		let remaining = payoutAmountInCents;
		while (remaining > 0) {
			const chunk = Math.min(remaining, this.EULEN_MAX_PAYOUT_CENTS);
			splits.push({ payoutAmountInCents: chunk });
			remaining -= chunk;
		}

		this.logger.log(
			`[WITHDRAWAL] Splitting ${id} into ${splits.length} Eulen calls: ${splits.map(s => `R$${(s.payoutAmountInCents / 100).toFixed(2)}`).join(' + ')}`,
		);

		const eulenSplits: any[] = [];
		let totalDepositAmountCents = 0;

		for (let i = 0; i < splits.length; i++) {
			const eulenResult = await this.eulenClient.createWithdraw({
				pixKey: withdrawal.pixKey,
				payoutAmountInCents: splits[i].payoutAmountInCents,
			});

			eulenSplits.push({
				withdrawalId: eulenResult.withdrawalId,
				depositAddress: eulenResult.depositAddress,
				depositAmountInCents: eulenResult.depositAmountInCents,
				payoutAmountInCents: eulenResult.payoutAmountInCents,
				status: 'unsent',
			});

			totalDepositAmountCents += eulenResult.depositAmountInCents;

			this.logger.log(
				`[WITHDRAWAL] Split ${i + 1}/${splits.length} for ${id}: Eulen ID ${eulenResult.withdrawalId}, deposit ${eulenResult.depositAmountInCents} cents`,
			);
		}

		const updated = await this.prisma.withdrawalRequest.update({
			where: { id },
			data: {
				status: WithdrawalStatus.APPROVED,
				approvedBy: adminId,
				approvedAt: new Date(),
				eulenWithdrawalId: eulenSplits[0].withdrawalId,
				eulenDepositAddress: eulenSplits[0].depositAddress,
				eulenDepositAmountCents: totalDepositAmountCents,
				eulenPayoutAmountCents: payoutAmountInCents,
				eulenSplits: eulenSplits,
				eulenStatus: 'unsent',
			},
			include: { user: { select: { id: true, email: true, username: true } } },
		});

		this.logger.log(
			`[WITHDRAWAL] Approved ${id} by admin ${adminId} with ${eulenSplits.length} splits. Total deposit: ${totalDepositAmountCents} cents`,
		);

		return {
			...updated,
			eulenSplits,
			eulenDepositAmountCents: totalDepositAmountCents,
			eulenDepositAmountBRL: totalDepositAmountCents / 100,
		};
	}

	/**
	 * Admin: Confirm DePix was sent to Eulen -> PROCESSING
	 */
	async adminConfirmEulenSend(id: string, adminId: string) {
		const withdrawal = await this.prisma.withdrawalRequest.findUnique({
			where: { id },
		});

		if (!withdrawal) {
			throw new HttpException('Saque não encontrado', HttpStatus.NOT_FOUND);
		}

		if (withdrawal.status !== WithdrawalStatus.APPROVED) {
			throw new HttpException(
				'Apenas saques aprovados podem ser confirmados',
				HttpStatus.BAD_REQUEST,
			);
		}

		const updated = await this.prisma.withdrawalRequest.update({
			where: { id },
			data: {
				status: WithdrawalStatus.PROCESSING,
				eulenStatus: 'unsent',
			},
			include: { user: { select: { id: true, email: true, username: true } } },
		});

		this.logger.log(`[WITHDRAWAL] Confirmed Eulen send for ${id} by admin ${adminId}`);

		return updated;
	}

	/**
	 * Cron: Poll Eulen for PROCESSING withdrawals
	 */
	@Cron(CronExpression.EVERY_MINUTE)
	async pollEulenWithdrawals() {
		try {
			const processing = await this.prisma.withdrawalRequest.findMany({
				where: {
					status: WithdrawalStatus.PROCESSING,
					eulenWithdrawalId: { not: null },
				},
				include: { user: { select: { id: true, email: true, username: true } } },
			});

			if (processing.length === 0) return;

			this.logger.log(`[WITHDRAWAL] Polling Eulen for ${processing.length} processing withdrawal(s)`);

			for (const w of processing) {
				try {
					const splits = w.eulenSplits as any[] | null;

					if (splits && Array.isArray(splits) && splits.length > 1) {
						// Multi-split withdrawal: check each split individually
						let allSent = true;
						let anyFailed = false;
						let failedStatus = '';
						const updatedSplits = [...splits];

						for (let i = 0; i < updatedSplits.length; i++) {
							const split = updatedSplits[i];
							if (split.status === 'sent') continue; // Already completed

							const eulenStatus = await this.eulenClient.getWithdrawStatus(split.withdrawalId);
							updatedSplits[i] = { ...split, status: eulenStatus.status };

							if (eulenStatus.status === 'sent') {
								this.logger.log(`[WITHDRAWAL] Split ${i + 1}/${splits.length} for ${w.id} completed`);
							} else if (['error', 'canceled', 'refunded'].includes(eulenStatus.status)) {
								anyFailed = true;
								failedStatus = eulenStatus.status;
								this.logger.log(`[WITHDRAWAL] Split ${i + 1}/${splits.length} for ${w.id} failed: ${eulenStatus.status}`);
							} else {
								allSent = false;
							}
						}

						const updateData: any = { eulenSplits: updatedSplits };

						if (anyFailed) {
							updateData.status = WithdrawalStatus.FAILED;
							updateData.eulenStatus = failedStatus;
							updateData.statusReason = `Eulen split failed: ${failedStatus}`;
							this.logger.log(`[WITHDRAWAL] Failed ${w.id} - split failure`);
						} else if (allSent) {
							updateData.status = WithdrawalStatus.COMPLETED;
							updateData.eulenStatus = 'sent';
							updateData.processedAt = new Date();
							updateData.receiptData = {
								senderName: 'PLEBZ TECNOLOGIA',
								senderCnpj: '**.***.***/0001-**',
								senderInstitution: 'CELCOIN IP S.A.',
								recipientName: w.fullName,
								recipientCpfCnpj: w.cpfCnpj,
								recipientPixKey: w.pixKey,
								amount: w.netAmount,
								date: new Date().toISOString(),
								transactionId: w.eulenWithdrawalId,
								splits: updatedSplits.length,
							};
							this.logger.log(`[WITHDRAWAL] Completed ${w.id} - all ${splits.length} splits sent`);
						} else {
							updateData.eulenStatus = `${updatedSplits.filter(s => s.status === 'sent').length}/${splits.length} sent`;
						}

						await this.prisma.withdrawalRequest.update({
							where: { id: w.id },
							data: updateData,
						});
					} else {
						// Single withdrawal (no splits)
						const eulenStatus = await this.eulenClient.getWithdrawStatus(w.eulenWithdrawalId!);
						const updateData: any = { eulenStatus: eulenStatus.status };

						if (eulenStatus.status === 'sent') {
							updateData.status = WithdrawalStatus.COMPLETED;
							updateData.processedAt = new Date();
							updateData.receiptData = {
								senderName: 'PLEBZ TECNOLOGIA',
								senderCnpj: '**.***.***/0001-**',
								senderInstitution: 'CELCOIN IP S.A.',
								recipientName: w.fullName,
								recipientCpfCnpj: w.cpfCnpj,
								recipientPixKey: w.pixKey,
								amount: w.netAmount,
								date: new Date().toISOString(),
								transactionId: w.eulenWithdrawalId,
								bankTxId: eulenStatus.bankTxId,
								authCode: eulenStatus.bankTxId || w.eulenWithdrawalId,
							};
							this.logger.log(`[WITHDRAWAL] Completed ${w.id} - Eulen sent PIX`);
						} else if (['error', 'canceled', 'refunded'].includes(eulenStatus.status)) {
							updateData.status = WithdrawalStatus.FAILED;
							updateData.statusReason = `Eulen status: ${eulenStatus.status}`;
							this.logger.log(`[WITHDRAWAL] Failed ${w.id} - Eulen status: ${eulenStatus.status}`);
						}

						await this.prisma.withdrawalRequest.update({
							where: { id: w.id },
							data: updateData,
						});
					}
				} catch (error) {
					this.logger.error(`[WITHDRAWAL] Eulen polling error for ${w.id}: ${error.message}`);
				}
			}
		} catch (error) {
			this.logger.error(`[WITHDRAWAL] Eulen polling cron error: ${error.message}`);
		}
	}

	/**
	 * Admin: Reject withdrawal
	 */
	async adminRejectWithdrawal(id: string, adminId: string, reason?: string) {
		const withdrawal = await this.prisma.withdrawalRequest.findUnique({
			where: { id },
		});

		if (!withdrawal) {
			throw new HttpException('Saque não encontrado', HttpStatus.NOT_FOUND);
		}

		if (![WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED].includes(withdrawal.status as any)) {
			throw new HttpException(
				'Apenas saques pendentes ou aprovados podem ser rejeitados',
				HttpStatus.BAD_REQUEST,
			);
		}

		const updated = await this.prisma.withdrawalRequest.update({
			where: { id },
			data: {
				status: WithdrawalStatus.REJECTED,
				rejectedBy: adminId,
				rejectedAt: new Date(),
				statusReason: reason || 'Rejeitado pelo administrador',
			},
			include: { user: { select: { id: true, email: true, username: true } } },
		});

		this.logger.log(`[WITHDRAWAL] Rejected ${id} by admin ${adminId}: ${reason}`);

		return updated;
	}

	/**
	 * Get receipt data for a completed withdrawal
	 */
	async getReceipt(id: string, userId?: string) {
		const where: any = { id };
		if (userId) where.userId = userId;

		const withdrawal = await this.prisma.withdrawalRequest.findFirst({
			where,
			include: { user: { select: { id: true, email: true, username: true } } },
		});

		if (!withdrawal) {
			throw new HttpException('Saque não encontrado', HttpStatus.NOT_FOUND);
		}

		if (withdrawal.status !== WithdrawalStatus.COMPLETED) {
			throw new HttpException('Comprovante disponível apenas para saques concluídos', HttpStatus.BAD_REQUEST);
		}

		return {
			receiptData: withdrawal.receiptData || {
				senderName: 'PLEBZ TECNOLOGIA',
				senderCnpj: '**.***.***/0001-**',
				senderInstitution: 'CELCOIN IP S.A.',
				recipientName: withdrawal.fullName,
				recipientCpfCnpj: withdrawal.cpfCnpj,
				recipientPixKey: withdrawal.pixKey,
				amount: withdrawal.netAmount,
				date: withdrawal.processedAt?.toISOString() || withdrawal.updatedAt.toISOString(),
				transactionId: withdrawal.eulenWithdrawalId || withdrawal.id,
				authCode: withdrawal.eulenWithdrawalId || withdrawal.id,
			},
			withdrawal: {
				id: withdrawal.id,
				amount: withdrawal.amount,
				fee: withdrawal.fee,
				netAmount: withdrawal.netAmount,
				status: withdrawal.status,
				processedAt: withdrawal.processedAt,
			},
		};
	}

	/**
	 * Get user withdrawals
	 */
	async getUserWithdrawals(userId: string, status?: WithdrawalStatus) {
		const where: any = { userId };
		if (status) where.status = status;

		return this.prisma.withdrawalRequest.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				amount: true,
				fee: true,
				netAmount: true,
				method: true,
				status: true,
				statusReason: true,
				requestedAt: true,
				scheduledFor: true,
				processedAt: true,
				pixKey: true,
				pixKeyType: true,
				depixReceiveAddress: true,
				pollingExpiresAt: true,
				receivedAmount: true,
				eulenStatus: true,
				excessAmount: true,
			},
		});
	}

	/**
	 * Get withdrawal by ID
	 */
	async getWithdrawalById(id: string, userId?: string) {
		const where: any = { id };
		if (userId) where.userId = userId;

		const withdrawal = await this.prisma.withdrawalRequest.findFirst({
			where,
			include: {
				user: { select: { id: true, email: true, username: true } },
			},
		});

		if (!withdrawal) {
			throw new HttpException('Saque não encontrado', HttpStatus.NOT_FOUND);
		}

		return withdrawal;
	}

	/**
	 * Cancel withdrawal (user) - only AWAITING_DEPOSIT
	 */
	async cancelWithdrawal(id: string, userId: string) {
		const withdrawal = await this.prisma.withdrawalRequest.findFirst({
			where: { id, userId },
		});

		if (!withdrawal) {
			throw new HttpException('Saque não encontrado', HttpStatus.NOT_FOUND);
		}

		if (withdrawal.status !== WithdrawalStatus.AWAITING_DEPOSIT) {
			throw new HttpException(
				'Apenas saques aguardando depósito podem ser cancelados',
				HttpStatus.BAD_REQUEST,
			);
		}

		const updated = await this.prisma.withdrawalRequest.update({
			where: { id },
			data: {
				status: WithdrawalStatus.CANCELLED,
				statusReason: 'Cancelado pelo usuário',
			},
		});

		this.logger.log(`[WITHDRAWAL] Cancelled ${id} by user ${userId}`);

		return {
			id: updated.id,
			status: updated.status,
			message: 'Saque cancelado com sucesso',
		};
	}

	// ========== Admin methods ==========

	async getAllWithdrawals(status?: WithdrawalStatus) {
		const where: any = {};
		if (status) where.status = status;

		return this.prisma.withdrawalRequest.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			include: {
				user: { select: { id: true, email: true, username: true } },
			},
		});
	}

	async getPendingWithdrawals() {
		return this.prisma.withdrawalRequest.findMany({
			where: { status: WithdrawalStatus.PENDING },
			orderBy: { createdAt: 'asc' },
			include: {
				user: { select: { id: true, email: true, username: true } },
			},
		});
	}

	async getProcessingWithdrawals() {
		return this.prisma.withdrawalRequest.findMany({
			where: {
				status: {
					in: [WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING],
				},
			},
			orderBy: { createdAt: 'asc' },
			include: {
				user: { select: { id: true, email: true, username: true } },
			},
		});
	}

	async getWithdrawalStats(userId?: string) {
		const where = userId ? { userId } : {};

		const [total, awaitingDeposit, pending, processing, completed, failed, expired] = await Promise.all([
			this.prisma.withdrawalRequest.count({ where }),
			this.prisma.withdrawalRequest.count({ where: { ...where, status: WithdrawalStatus.AWAITING_DEPOSIT } }),
			this.prisma.withdrawalRequest.count({ where: { ...where, status: WithdrawalStatus.PENDING } }),
			this.prisma.withdrawalRequest.count({ where: { ...where, status: WithdrawalStatus.PROCESSING } }),
			this.prisma.withdrawalRequest.count({ where: { ...where, status: WithdrawalStatus.COMPLETED } }),
			this.prisma.withdrawalRequest.count({ where: { ...where, status: WithdrawalStatus.FAILED } }),
			this.prisma.withdrawalRequest.count({ where: { ...where, status: WithdrawalStatus.EXPIRED } }),
		]);

		const aggregates = await this.prisma.withdrawalRequest.aggregate({
			where,
			_sum: { amount: true, fee: true, netAmount: true },
		});

		return {
			total,
			awaitingDeposit,
			pending,
			processing,
			completed,
			failed,
			expired,
			totalAmount: aggregates._sum.amount || 0,
			totalFees: aggregates._sum.fee || 0,
			totalNetAmount: aggregates._sum.netAmount || 0,
		};
	}

	async validateCoupon(dto: ValidateCouponDto, userId: string) {
		return this.couponsService.validateCoupon(dto, userId);
	}

	// ========== Private helpers ==========

	private async getNextAddressIndex(): Promise<number> {
		// Check both collateral and withdrawal tables for highest index
		const [lastWithdrawal, lastCollateral] = await Promise.all([
			this.prisma.withdrawalRequest.findFirst({
				where: { addressIndex: { not: null } },
				orderBy: { addressIndex: 'desc' },
				select: { addressIndex: true },
			}),
			this.prisma.collateralTransaction.findFirst({
				where: { addressIndex: { not: null } },
				orderBy: { addressIndex: 'desc' },
				select: { addressIndex: true },
			}),
		]);

		const maxWithdrawal = lastWithdrawal?.addressIndex ?? -1;
		const maxCollateral = lastCollateral?.addressIndex ?? -1;

		return Math.max(maxWithdrawal, maxCollateral) + 1;
	}

	private calculateNextBusinessDay(date: Date): Date {
		const nextDay = new Date(date);
		nextDay.setDate(nextDay.getDate() + 1);
		while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
			nextDay.setDate(nextDay.getDate() + 1);
		}
		nextDay.setHours(10, 0, 0, 0);
		return nextDay;
	}
}
