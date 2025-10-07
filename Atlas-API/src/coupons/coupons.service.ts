import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
	CreateCouponDto,
	UpdateCouponDto,
	ValidateCouponDto,
} from './dto/coupon.dto';

@Injectable()
export class CouponsService {
	constructor(private prisma: PrismaService) {}

	async create(createCouponDto: CreateCouponDto, adminId: string) {
		const existingCoupon = await this.prisma.discountCoupon.findUnique({
			where: { code: createCouponDto.code.toUpperCase() },
		});

		if (existingCoupon) {
			throw new BadRequestException('Código de cupom já existe');
		}

		return this.prisma.discountCoupon.create({
			data: {
				...createCouponDto,
				code: createCouponDto.code.toUpperCase(),
				createdBy: adminId,
			},
		});
	}

	async findAll() {
		return this.prisma.discountCoupon.findMany({
			include: {
				_count: {
					select: { usages: true },
				},
			},
			orderBy: { createdAt: 'desc' },
		});
	}

	async findOne(id: string) {
		const coupon = await this.prisma.discountCoupon.findUnique({
			where: { id },
			include: {
				usages: {
					include: {
						user: {
							select: { email: true, username: true },
						},
						withdrawalRequest: true,
					},
					orderBy: { usedAt: 'desc' },
				},
			},
		});

		if (!coupon) {
			throw new NotFoundException('Cupom não encontrado');
		}

		return coupon;
	}

	async update(id: string, updateCouponDto: UpdateCouponDto) {
		const coupon = await this.prisma.discountCoupon.findUnique({
			where: { id },
		});

		if (!coupon) {
			throw new NotFoundException('Cupom não encontrado');
		}

		return this.prisma.discountCoupon.update({
			where: { id },
			data: {
				...updateCouponDto,
				code: updateCouponDto.code?.toUpperCase(),
			},
		});
	}

	async delete(id: string) {
		const coupon = await this.prisma.discountCoupon.findUnique({
			where: { id },
		});

		if (!coupon) {
			throw new NotFoundException('Cupom não encontrado');
		}

		return this.prisma.discountCoupon.delete({
			where: { id },
		});
	}

	async validateCoupon(validateDto: ValidateCouponDto, userId: string) {
		const { code, amount, method } = validateDto;

		// Find the coupon
		const coupon = await this.prisma.discountCoupon.findUnique({
			where: {
				code: code.toUpperCase(),
				isActive: true,
			},
			include: {
				usages: {
					where: { userId },
				},
			},
		});

		if (!coupon) {
			return {
				valid: false,
				message: 'Cupom inválido ou inexistente',
			};
		}

		// Check if expired
		if (coupon.validUntil && new Date() > coupon.validUntil) {
			return {
				valid: false,
				message: 'Cupom expirado',
			};
		}

		// Check if not yet valid
		if (new Date() < coupon.validFrom) {
			return {
				valid: false,
				message: 'Cupom ainda não está válido',
			};
		}

		// Check max uses
		if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
			return {
				valid: false,
				message: 'Cupom atingiu o limite máximo de usos',
			};
		}

		// Check user's usage limit
		const userUsages = coupon.usages.length;
		if (userUsages >= coupon.maxUsesPerUser) {
			return {
				valid: false,
				message: `Você já utilizou este cupom ${userUsages} vez(es)`,
			};
		}

		// Check withdrawal method
		if (!coupon.allowedMethods.includes(method)) {
			return {
				valid: false,
				message: `Cupom não válido para saques ${method}`,
			};
		}

		// Check amount limits
		if (coupon.minAmount && amount < coupon.minAmount) {
			return {
				valid: false,
				message: `Valor mínimo para usar este cupom: R$ ${coupon.minAmount.toFixed(2)}`,
			};
		}

		if (coupon.maxAmount && amount > coupon.maxAmount) {
			return {
				valid: false,
				message: `Valor máximo para usar este cupom: R$ ${coupon.maxAmount.toFixed(2)}`,
			};
		}

		return {
			valid: true,
			discountPercentage: coupon.discountPercentage,
			message: `Cupom válido: ${coupon.discountPercentage}% de desconto na taxa`,
		};
	}

	async applyCoupon(
		code: string,
		userId: string,
		withdrawalRequestId: string,
		originalFee: number,
		finalFee: number,
	) {
		const coupon = await this.prisma.discountCoupon.findUnique({
			where: { code: code.toUpperCase() },
		});

		if (!coupon) {
			throw new BadRequestException('Cupom não encontrado');
		}

		const discountApplied = originalFee - finalFee;

		// Create usage record
		await this.prisma.couponUsage.create({
			data: {
				couponId: coupon.id,
				userId,
				withdrawalRequestId,
				discountApplied,
				originalFee,
				finalFee,
			},
		});

		// Update usage count
		await this.prisma.discountCoupon.update({
			where: { id: coupon.id },
			data: {
				currentUses: { increment: 1 },
			},
		});

		return { discountApplied, discountPercentage: coupon.discountPercentage };
	}

	async getStats() {
		const [total, active, expired, totalUsages, totalDiscounts] =
			await Promise.all([
				this.prisma.discountCoupon.count(),
				this.prisma.discountCoupon.count({ where: { isActive: true } }),
				this.prisma.discountCoupon.count({
					where: {
						validUntil: {
							lt: new Date(),
						},
					},
				}),
				this.prisma.couponUsage.count(),
				this.prisma.couponUsage.aggregate({
					_sum: {
						discountApplied: true,
					},
				}),
			]);

		return {
			total,
			active,
			expired,
			totalUsages,
			totalDiscounts: totalDiscounts._sum.discountApplied || 0,
		};
	}
}
