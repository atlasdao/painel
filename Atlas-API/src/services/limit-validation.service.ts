import {
	Injectable,
	BadRequestException,
	ForbiddenException,
} from '@nestjs/common';
import { UserLimitRepository } from '../repositories/user-limit.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

export interface LimitValidationResult {
	allowed: boolean;
	reason?: string;
	currentUsage?: {
		daily: number;
		monthly: number;
	};
	limits?: {
		dailyLimit: number;
		monthlyLimit: number;
		perTransactionLimit: number;
	};
}

@Injectable()
export class LimitValidationService {
	constructor(
		private readonly userLimitRepository: UserLimitRepository,
		private readonly prisma: PrismaService,
	) {}

	/**
	 * Validate if user can perform a transaction within their limits
	 */
	async validateTransactionLimits(
		userId: string,
		transactionType: TransactionType,
		amount: number,
	): Promise<LimitValidationResult> {
		// FIRST: Check if account validation is required and if user is validated
		const isValidationRequired = await this.isAccountValidationRequired(userId);

		if (isValidationRequired) {
			return {
				allowed: false,
				reason:
					'Conta não validada. Você precisa validar sua conta antes de realizar transações.',
			};
		}

		// Get or create user limits
		const userLimits =
			await this.userLimitRepository.getOrCreateUserLimits(userId);

		// Get current usage
		const dailyUsage = await this.userLimitRepository.getUserDailyUsage(userId);
		const monthlyUsage =
			await this.userLimitRepository.getUserMonthlyUsage(userId);

		let dailyLimit: number;
		let monthlyLimit: number;
		let perTxLimit: number;
		let currentDailyUsage: number;
		let currentMonthlyUsage: number;

		// Set limits based on transaction type
		switch (transactionType) {
			case TransactionType.DEPOSIT:
				dailyLimit = userLimits.dailyDepositLimit;
				monthlyLimit = userLimits.monthlyDepositLimit;
				perTxLimit = userLimits.maxDepositPerTx;
				currentDailyUsage = dailyUsage.depositToday;
				currentMonthlyUsage = monthlyUsage.depositThisMonth;
				break;
			case TransactionType.WITHDRAW:
				dailyLimit = userLimits.dailyWithdrawLimit;
				monthlyLimit = userLimits.monthlyWithdrawLimit;
				perTxLimit = userLimits.maxWithdrawPerTx;
				currentDailyUsage = dailyUsage.withdrawToday;
				currentMonthlyUsage = monthlyUsage.withdrawThisMonth;
				break;
			case TransactionType.TRANSFER:
				dailyLimit = userLimits.dailyTransferLimit;
				monthlyLimit = userLimits.monthlyTransferLimit;
				perTxLimit = userLimits.maxTransferPerTx;
				currentDailyUsage = dailyUsage.transferToday;
				currentMonthlyUsage = monthlyUsage.transferThisMonth;
				break;
			default:
				return {
					allowed: false,
					reason: 'Tipo de transação não suportado',
				};
		}

		// Check per-transaction limit
		if (amount > perTxLimit) {
			return {
				allowed: false,
				reason: `Valor excede o limite por transação de R$ ${perTxLimit.toFixed(2)}`,
				limits: {
					dailyLimit,
					monthlyLimit,
					perTransactionLimit: perTxLimit,
				},
			};
		}

		// Check daily limit
		if (currentDailyUsage + amount > dailyLimit) {
			return {
				allowed: false,
				reason: `Valor excede o limite diário de R$ ${dailyLimit.toFixed(2)}. Já utilizado hoje: R$ ${currentDailyUsage.toFixed(2)}`,
				currentUsage: {
					daily: currentDailyUsage,
					monthly: currentMonthlyUsage,
				},
				limits: {
					dailyLimit,
					monthlyLimit,
					perTransactionLimit: perTxLimit,
				},
			};
		}

		// Check monthly limit
		if (currentMonthlyUsage + amount > monthlyLimit) {
			return {
				allowed: false,
				reason: `Valor excede o limite mensal de R$ ${monthlyLimit.toFixed(2)}. Já utilizado este mês: R$ ${currentMonthlyUsage.toFixed(2)}`,
				currentUsage: {
					daily: currentDailyUsage,
					monthly: currentMonthlyUsage,
				},
				limits: {
					dailyLimit,
					monthlyLimit,
					perTransactionLimit: perTxLimit,
				},
			};
		}

		// Special first day check (MED compliance)
		if (userLimits.isFirstDay && transactionType === TransactionType.DEPOSIT) {
			if (amount > 500.0) {
				return {
					allowed: false,
					reason:
						'No primeiro dia, o limite máximo é de R$ 500,00 (compliance MED)',
					currentUsage: {
						daily: currentDailyUsage,
						monthly: currentMonthlyUsage,
					},
					limits: {
						dailyLimit: 500.0, // Override to show first day limit
						monthlyLimit,
						perTransactionLimit: perTxLimit,
					},
				};
			}
		}

		// High risk user additional checks
		if (userLimits.isHighRiskUser) {
			// Reduce limits by 50% for high risk users
			const reducedDailyLimit = dailyLimit * 0.5;
			const reducedMonthlyLimit = monthlyLimit * 0.5;
			const reducedPerTxLimit = perTxLimit * 0.5;

			if (amount > reducedPerTxLimit) {
				return {
					allowed: false,
					reason: `Usuário de alto risco: limite por transação reduzido para R$ ${reducedPerTxLimit.toFixed(2)}`,
					limits: {
						dailyLimit: reducedDailyLimit,
						monthlyLimit: reducedMonthlyLimit,
						perTransactionLimit: reducedPerTxLimit,
					},
				};
			}

			if (currentDailyUsage + amount > reducedDailyLimit) {
				return {
					allowed: false,
					reason: `Usuário de alto risco: limite diário reduzido para R$ ${reducedDailyLimit.toFixed(2)}`,
					currentUsage: {
						daily: currentDailyUsage,
						monthly: currentMonthlyUsage,
					},
					limits: {
						dailyLimit: reducedDailyLimit,
						monthlyLimit: reducedMonthlyLimit,
						perTransactionLimit: reducedPerTxLimit,
					},
				};
			}
		}

		// All checks passed
		return {
			allowed: true,
			currentUsage: {
				daily: currentDailyUsage,
				monthly: currentMonthlyUsage,
			},
			limits: {
				dailyLimit,
				monthlyLimit,
				perTransactionLimit: perTxLimit,
			},
		};
	}

	/**
	 * Throw exception if transaction is not allowed
	 */
	async validateAndThrow(
		userId: string,
		transactionType: TransactionType,
		amount: number,
	): Promise<void> {
		const validation = await this.validateTransactionLimits(
			userId,
			transactionType,
			amount,
		);

		if (!validation.allowed) {
			throw new ForbiddenException({
				message: validation.reason,
				currentUsage: validation.currentUsage,
				limits: validation.limits,
				code: 'LIMIT_EXCEEDED',
			});
		}
	}

	/**
	 * Get user's current limits and usage summary
	 */
	async getUserLimitsSummary(userId: string): Promise<{
		limits: any;
		dailyUsage: any;
		monthlyUsage: any;
		isFirstDay: boolean;
		isKycVerified: boolean;
		isHighRiskUser: boolean;
	}> {
		const userLimits =
			await this.userLimitRepository.getOrCreateUserLimits(userId);
		const dailyUsage = await this.userLimitRepository.getUserDailyUsage(userId);
		const monthlyUsage =
			await this.userLimitRepository.getUserMonthlyUsage(userId);

		return {
			limits: {
				daily: {
					deposit: userLimits.dailyDepositLimit,
					withdraw: userLimits.dailyWithdrawLimit,
					transfer: userLimits.dailyTransferLimit,
				},
				monthly: {
					deposit: userLimits.monthlyDepositLimit,
					withdraw: userLimits.monthlyWithdrawLimit,
					transfer: userLimits.monthlyTransferLimit,
				},
				perTransaction: {
					deposit: userLimits.maxDepositPerTx,
					withdraw: userLimits.maxWithdrawPerTx,
					transfer: userLimits.maxTransferPerTx,
				},
			},
			dailyUsage,
			monthlyUsage,
			isFirstDay: userLimits.isFirstDay,
			isKycVerified: userLimits.isKycVerified,
			isHighRiskUser: userLimits.isHighRiskUser,
		};
	}

	/**
	 * Mark user as not first day after successful transaction
	 */
	async processSuccessfulTransaction(
		userId: string,
		transactionType: TransactionType,
	): Promise<void> {
		const userLimits =
			await this.userLimitRepository.getOrCreateUserLimits(userId);

		// If it's the user's first successful deposit, mark them as no longer first day
		if (userLimits.isFirstDay && transactionType === TransactionType.DEPOSIT) {
			await this.userLimitRepository.markUserAsNotFirstDay(userId);
		}
	}

	/**
	 * Validate withdrawal limits
	 */
	async validateWithdrawLimit(userId: string, amount: number): Promise<void> {
		const validation = await this.validateTransactionLimits(
			userId,
			TransactionType.WITHDRAW,
			amount,
		);

		if (!validation.allowed) {
			throw new ForbiddenException({
				message: validation.reason,
				currentUsage: validation.currentUsage,
				limits: validation.limits,
				code: 'WITHDRAWAL_LIMIT_EXCEEDED',
			});
		}
	}

	/**
	 * Check if account validation is required for this user
	 */
	private async isAccountValidationRequired(userId: string): Promise<boolean> {
		// Check if validation is globally enabled
		const validationEnabledSetting =
			await this.prisma.systemSettings.findUnique({
				where: { key: 'validation_enabled' },
			});

		const validationEnabled = validationEnabledSetting
			? JSON.parse(validationEnabledSetting.value)
			: true;

		// If validation is disabled globally, no validation required
		if (!validationEnabled) {
			return false;
		}

		// Check if user is already validated
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { isAccountValidated: true },
		});

		if (!user) {
			return true; // If user not found, require validation as safety
		}

		// If validation is enabled and user is not validated, validation is required
		return !user.isAccountValidated;
	}
}
