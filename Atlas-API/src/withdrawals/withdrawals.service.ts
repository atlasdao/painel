import {
	Injectable,
	HttpException,
	HttpStatus,
	Logger,
	Inject,
	forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { AdminApprovalDto } from './dto/admin-approval.dto';
import { WithdrawalMethod, WithdrawalStatus, UserRole } from '@prisma/client';
import { LiquidValidationService } from '../services/liquid-validation.service';
import { LimitValidationService } from '../services/limit-validation.service';
import { CouponsService } from '../coupons/coupons.service';
import { ValidateCouponDto } from '../coupons/dto/coupon.dto';

@Injectable()
export class WithdrawalsService {
	private readonly logger = new Logger(WithdrawalsService.name);
	private readonly PIX_FEE_PERCENTAGE = 0.015; // 1.5%
	private readonly DEPIX_FEE_FIXED = 3.5; // R$ 3.50

	constructor(
		private prisma: PrismaService,
		private liquidValidation: LiquidValidationService,
		private limitValidation: LimitValidationService,
		@Inject(forwardRef(() => CouponsService))
		private couponsService: CouponsService,
	) {}

	async createWithdrawal(userId: string, dto: CreateWithdrawalDto) {
		// Validate user exists and is active
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

		// Check if user has validated account
		if (!user.isAccountValidated) {
			throw new HttpException(
				'Conta não validada. Por favor, complete a validação antes de solicitar saques.',
				HttpStatus.FORBIDDEN,
			);
		}

		// Calculate base fee
		let originalFee: number;
		let fee: number;
		let netAmount: number;
		let couponDiscount = 0;

		if (dto.method === WithdrawalMethod.PIX) {
			originalFee = dto.amount * this.PIX_FEE_PERCENTAGE;
			fee = originalFee;

			// Validate PIX key
			if (!dto.pixKey || !dto.pixKeyType) {
				throw new HttpException(
					'Chave PIX e tipo são obrigatórios para saques PIX',
					HttpStatus.BAD_REQUEST,
				);
			}
		} else if (dto.method === WithdrawalMethod.DEPIX) {
			originalFee = this.DEPIX_FEE_FIXED;
			fee = originalFee;

			// Validate Liquid address
			if (!dto.liquidAddress) {
				throw new HttpException(
					'Endereço Liquid é obrigatório para saques DePix',
					HttpStatus.BAD_REQUEST,
				);
			}

			if (!this.liquidValidation.validateLiquidAddress(dto.liquidAddress)) {
				throw new HttpException(
					'Endereço Liquid inválido',
					HttpStatus.BAD_REQUEST,
				);
			}

			if (!this.liquidValidation.isMainnetAddress(dto.liquidAddress)) {
				throw new HttpException(
					'Por favor, use um endereço da mainnet Liquid',
					HttpStatus.BAD_REQUEST,
				);
			}
		} else {
			throw new HttpException(
				'Método de saque inválido',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Apply coupon discount if provided
		if (dto.couponCode) {
			const couponValidation = await this.couponsService.validateCoupon(
				{ code: dto.couponCode, amount: dto.amount, method: dto.method },
				userId,
			);

			if (couponValidation.valid && couponValidation.discountPercentage) {
				couponDiscount =
					originalFee * (couponValidation.discountPercentage / 100);
				fee = Math.max(0, originalFee - couponDiscount);
				this.logger.log(
					`Coupon applied: ${couponValidation.discountPercentage}% discount`,
				);
			} else {
				this.logger.warn(`Invalid coupon attempt: ${couponValidation.message}`);
				// Don't throw error, just ignore invalid coupon
			}
		}

		// Calculate net amount after fee (with or without discount)
		netAmount = dto.amount - fee;

		// Check minimum withdrawal amount after fees
		if (netAmount < 10) {
			throw new HttpException(
				`Valor líquido após taxa (R$ ${netAmount.toFixed(2)}) é menor que o mínimo permitido (R$ 10.00)`,
				HttpStatus.BAD_REQUEST,
			);
		}

		// Validate withdrawal limits
		await this.limitValidation.validateWithdrawLimit(userId, dto.amount);

		// Calculate D+1 schedule (next business day)
		const scheduledFor = this.calculateNextBusinessDay(new Date());

		// Save PIX key to user profile if requested
		if (dto.savePixKey && dto.pixKey && dto.method === WithdrawalMethod.PIX) {
			try {
				await this.prisma.user.update({
					where: { id: userId },
					data: {
						pixKey: dto.pixKey,
						pixKeyType: dto.pixKeyType,
					},
				});
				this.logger.log(`PIX key saved to user profile for user ${userId}`);
			} catch (error) {
				this.logger.error(`Failed to save PIX key to user profile: ${error.message}`);
				// Don't fail the withdrawal if saving PIX key fails
			}
		}

		// Create withdrawal request
		const withdrawal = await this.prisma.withdrawalRequest.create({
			data: {
				userId,
				amount: dto.amount,
				method: dto.method,
				pixKey: dto.pixKey,
				pixKeyType: dto.pixKeyType,
				liquidAddress: dto.liquidAddress,
				fee,
				netAmount,
				scheduledFor,
				cpfCnpj: dto.cpfCnpj,
				fullName: dto.fullName,
				status: WithdrawalStatus.PENDING,
			},
			include: {
				user: {
					select: {
						id: true,
						email: true,
						username: true,
					},
				},
			},
		});

		// Apply coupon if valid and create usage record
		if (dto.couponCode && couponDiscount > 0) {
			try {
				await this.couponsService.applyCoupon(
					dto.couponCode,
					userId,
					withdrawal.id,
					originalFee,
					fee,
				);
				this.logger.log(
					`Coupon ${dto.couponCode} applied to withdrawal ${withdrawal.id}`,
				);
			} catch (error) {
				this.logger.error(`Failed to apply coupon: ${error.message}`);
				// Don't fail the withdrawal if coupon application fails
			}
		}

		this.logger.log(
			`Withdrawal request created: ${withdrawal.id} for user ${userId}`,
		);

		return {
			id: withdrawal.id,
			amount: withdrawal.amount,
			fee: withdrawal.fee,
			netAmount: withdrawal.netAmount,
			method: withdrawal.method,
			status: withdrawal.status,
			scheduledFor: withdrawal.scheduledFor,
			message: `Solicitação de saque criada. Será processada em ${this.formatDate(scheduledFor)}`,
		};
	}

	async getUserWithdrawals(userId: string, status?: WithdrawalStatus) {
		const where: any = { userId };
		if (status) {
			where.status = status;
		}

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
				liquidAddress: true,
			},
		});
	}

	async getWithdrawalById(id: string, userId?: string) {
		const where: any = { id };
		if (userId) {
			where.userId = userId;
		}

		const withdrawal = await this.prisma.withdrawalRequest.findUnique({
			where,
			include: {
				user: {
					select: {
						id: true,
						email: true,
						username: true,
					},
				},
			},
		});

		if (!withdrawal) {
			throw new HttpException(
				'Solicitação de saque não encontrada',
				HttpStatus.NOT_FOUND,
			);
		}

		return withdrawal;
	}

	async cancelWithdrawal(id: string, userId: string) {
		const withdrawal = await this.prisma.withdrawalRequest.findFirst({
			where: { id, userId },
		});

		if (!withdrawal) {
			throw new HttpException(
				'Solicitação de saque não encontrada',
				HttpStatus.NOT_FOUND,
			);
		}

		if (withdrawal.status !== WithdrawalStatus.PENDING) {
			throw new HttpException(
				'Apenas saques pendentes podem ser cancelados',
				HttpStatus.BAD_REQUEST,
			);
		}

		const updated = await this.prisma.withdrawalRequest.update({
			where: { id },
			data: {
				status: WithdrawalStatus.CANCELLED,
				statusReason: 'Cancelado pelo usuário',
				updatedAt: new Date(),
			},
		});

		this.logger.log(`Withdrawal ${id} cancelled by user ${userId}`);

		return {
			id: updated.id,
			status: updated.status,
			message: 'Solicitação de saque cancelada com sucesso',
		};
	}

	// Admin methods
	async getAllWithdrawals(
		status?: WithdrawalStatus,
		method?: WithdrawalMethod,
	) {
		const where: any = {};
		if (status) where.status = status;
		if (method) where.method = method;

		return this.prisma.withdrawalRequest.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			include: {
				user: {
					select: {
						id: true,
						email: true,
						username: true,
					},
				},
			},
		});
	}

	async getPendingWithdrawals() {
		return this.prisma.withdrawalRequest.findMany({
			where: {
				status: WithdrawalStatus.PENDING,
				scheduledFor: {
					lte: new Date(), // Scheduled for today or earlier
				},
			},
			orderBy: { scheduledFor: 'asc' },
			include: {
				user: {
					select: {
						id: true,
						email: true,
						username: true,
					},
				},
			},
		});
	}

	async approveOrRejectWithdrawal(
		id: string,
		adminId: string,
		dto: AdminApprovalDto,
	) {
		const withdrawal = await this.prisma.withdrawalRequest.findUnique({
			where: { id },
		});

		if (!withdrawal) {
			throw new HttpException(
				'Solicitação de saque não encontrada',
				HttpStatus.NOT_FOUND,
			);
		}

		if (withdrawal.status !== WithdrawalStatus.PENDING) {
			throw new HttpException(
				'Apenas saques pendentes podem ser aprovados ou rejeitados',
				HttpStatus.BAD_REQUEST,
			);
		}

		const updateData: any = {
			adminNotes: dto.adminNotes,
			updatedAt: new Date(),
		};

		if (dto.approve) {
			updateData.status = WithdrawalStatus.APPROVED;
			updateData.approvedBy = adminId;
			updateData.approvedAt = new Date();

			if (dto.coldwalletTxId) {
				updateData.coldwalletTxId = dto.coldwalletTxId;
			}
		} else {
			updateData.status = WithdrawalStatus.REJECTED;
			updateData.rejectedBy = adminId;
			updateData.rejectedAt = new Date();
			updateData.statusReason =
				dto.statusReason || 'Rejeitado pelo administrador';
		}

		const updated = await this.prisma.withdrawalRequest.update({
			where: { id },
			data: updateData,
			include: {
				user: {
					select: {
						id: true,
						email: true,
						username: true,
					},
				},
			},
		});

		this.logger.log(
			`Withdrawal ${id} ${dto.approve ? 'approved' : 'rejected'} by admin ${adminId}`,
		);

		return updated;
	}

	async processApprovedWithdrawals() {
		// This method will be called by a cron job to process approved withdrawals
		const withdrawals = await this.prisma.withdrawalRequest.findMany({
			where: {
				status: WithdrawalStatus.APPROVED,
				scheduledFor: {
					lte: new Date(),
				},
			},
			include: {
				user: true,
			},
		});

		for (const withdrawal of withdrawals) {
			try {
				// Here you would integrate with actual payment processing
				// For now, we just mark as processing
				await this.prisma.withdrawalRequest.update({
					where: { id: withdrawal.id },
					data: {
						status: WithdrawalStatus.PROCESSING,
						updatedAt: new Date(),
					},
				});

				this.logger.log(`Processing withdrawal ${withdrawal.id}`);

				// TODO: Integrate with actual PIX/Liquid payment processing
				// After successful processing, update to COMPLETED
			} catch (error) {
				this.logger.error(
					`Error processing withdrawal ${withdrawal.id}:`,
					error,
				);
			}
		}
	}

	async getWithdrawalStats(userId?: string) {
		const where = userId ? { userId } : {};

		const [total, pending, approved, completed, failed] = await Promise.all([
			this.prisma.withdrawalRequest.count({ where }),
			this.prisma.withdrawalRequest.count({
				where: { ...where, status: WithdrawalStatus.PENDING },
			}),
			this.prisma.withdrawalRequest.count({
				where: { ...where, status: WithdrawalStatus.APPROVED },
			}),
			this.prisma.withdrawalRequest.count({
				where: { ...where, status: WithdrawalStatus.COMPLETED },
			}),
			this.prisma.withdrawalRequest.count({
				where: { ...where, status: WithdrawalStatus.FAILED },
			}),
		]);

		const aggregates = await this.prisma.withdrawalRequest.aggregate({
			where,
			_sum: {
				amount: true,
				fee: true,
				netAmount: true,
			},
		});

		return {
			total,
			pending,
			approved,
			completed,
			failed,
			totalAmount: aggregates._sum.amount || 0,
			totalFees: aggregates._sum.fee || 0,
			totalNetAmount: aggregates._sum.netAmount || 0,
		};
	}

	async validateCoupon(dto: ValidateCouponDto, userId: string) {
		return this.couponsService.validateCoupon(dto, userId);
	}

	private calculateNextBusinessDay(date: Date): Date {
		const nextDay = new Date(date);
		nextDay.setDate(nextDay.getDate() + 1);

		// Skip weekends
		while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
			nextDay.setDate(nextDay.getDate() + 1);
		}

		// Set to 10:00 AM
		nextDay.setHours(10, 0, 0, 0);

		return nextDay;
	}

	private formatDate(date: Date): string {
		const options: Intl.DateTimeFormatOptions = {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			weekday: 'long',
		};
		return date.toLocaleDateString('pt-BR', options);
	}
}
