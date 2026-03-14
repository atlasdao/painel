import {
	Injectable,
	Logger,
	BadRequestException,
	NotFoundException,
	ForbiddenException,
	ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomizeShortCodeDto } from './dto/customize-shortcode.dto';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { AdminApprovePayoutDto, AdminRejectPayoutDto, AdminBlockUserDto } from './dto/admin-payout.dto';
import { ReferralStatus, CommissionPayoutStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { nanoid, customAlphabet } from 'nanoid';

// Shortcode generator: lowercase alphanumeric, 6 chars default
const generateShortCode = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

// Reserved shortcodes that cannot be used
const RESERVED_SHORTCODES = [
	'admin', 'api', 'atlas', 'login', 'register', 'help', 'support',
	'depix', 'pix', 'panel', 'painel', 'app', 'www', 'mail', 'email',
];

@Injectable()
export class ReferralService {
	private readonly logger = new Logger(ReferralService.name);

	// Configuration (could be loaded from SystemSettings)
	private readonly MIN_SALES_TO_REFER = 10000; // R$ 10.000
	private readonly MIN_SALES_FOR_VALID = 10000; // R$ 10.000
	private readonly VALIDITY_MONTHS = 3;
	private readonly COMMISSION_MIN = 20; // R$ 20
	private readonly COMMISSION_MAX = 150; // R$ 150
	private readonly MIN_WITHDRAWAL = 100; // R$ 100

	constructor(private readonly prisma: PrismaService) {}

	// ==========================================
	// USER METHODS
	// ==========================================

	/**
	 * Get user's referral status and eligibility
	 */
	async getReferralStatus(userId: string) {
		// Campaign is permanent (no expiration)
		const isCampaignActive = true;

		// Calculate user's commerce sales
		const commerceSalesTotal = await this.calculateCommerceSales(userId);

		// Get user's referral link if exists
		const referralLink = await this.prisma.referralLink.findUnique({
			where: { userId },
			include: {
				referrals: {
					include: {
						referredUser: {
							select: { email: true, createdAt: true },
						},
						commissionPayout: {
							select: { status: true },
						},
					},
					orderBy: { createdAt: 'desc' },
				},
			},
		});

		// Eligible if meets sales threshold OR already has a link (admin-created)
		const isEligible = commerceSalesTotal >= this.MIN_SALES_TO_REFER || !!referralLink;

		// Check terms acceptance
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { referralTermsAcceptedAt: true },
		});

		// Calculate available balance (commissions with AVAILABLE status)
		let availableBalance = 0;
		let pendingCommissions = 0;

		if (referralLink) {
			const commissions = await this.prisma.commissionPayout.findMany({
				where: { userId },
			});

			for (const c of commissions) {
				if (c.status === 'AVAILABLE') {
					availableBalance += Number(c.amount);
				} else if (c.status === 'REQUESTED' || c.status === 'PROCESSING') {
					pendingCommissions += Number(c.amount);
				}
			}
		}

		// Format referrals for response
		const referrals = referralLink?.referrals.map((r) => ({
			id: r.id,
			email: this.censorEmail(r.referredUser.email),
			status: r.status,
			signupDate: r.signupDate,
			deadlineDate: r.deadlineDate,
			validatedAt: r.validatedAt,
			commerceSalesTotal: Number(r.commerceSalesTotal),
			commissionAmount: r.commissionAmount ? Number(r.commissionAmount) : null,
			commissionStatus: r.commissionPayout?.status || null,
		})) || [];

		return {
			isCampaignActive,
			campaignEndDate: null,
			isEligible,
			commerceSalesTotal,
			requiredSales: this.MIN_SALES_TO_REFER,
			hasAcceptedTerms: !!user?.referralTermsAcceptedAt,
			referralLink: referralLink ? {
				id: referralLink.id,
				shortCode: referralLink.shortCode,
				isCustomShortCode: referralLink.isCustomShortCode,
				isActive: referralLink.isActive,
				isBlocked: referralLink.isBlocked,
				totalSignups: referralLink.totalSignups,
				validReferrals: referralLink.validReferrals,
				totalCommissions: Number(referralLink.totalCommissions),
				fullUrl: `${process.env.FRONTEND_URL || 'https://atlas.finance'}/i/${referralLink.shortCode}`,
			} : null,
			referrals,
			availableBalance,
			pendingCommissions,
			canWithdraw: availableBalance >= this.MIN_WITHDRAWAL,
			minWithdrawal: this.MIN_WITHDRAWAL,
		};
	}

	/**
	 * Accept referral program terms
	 */
	async acceptTerms(userId: string) {
		await this.prisma.user.update({
			where: { id: userId },
			data: { referralTermsAcceptedAt: new Date() },
		});

		return { success: true, message: 'Termos aceitos com sucesso' };
	}

	/**
	 * Create referral link for user
	 */
	async createReferralLink(userId: string) {
		// Check if user already has a link
		const existing = await this.prisma.referralLink.findUnique({
			where: { userId },
		});

		if (existing) {
			throw new ConflictException('Voce ja possui um link de indicacao');
		}

		// Check eligibility
		const commerceSalesTotal = await this.calculateCommerceSales(userId);
		if (commerceSalesTotal < this.MIN_SALES_TO_REFER) {
			throw new ForbiddenException(
				`Voce precisa ter pelo menos R$ ${this.MIN_SALES_TO_REFER.toLocaleString('pt-BR')} em vendas para criar um link de indicacao`
			);
		}

		// Check terms acceptance
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { referralTermsAcceptedAt: true },
		});

		if (!user?.referralTermsAcceptedAt) {
			throw new BadRequestException('Voce precisa aceitar os termos do programa primeiro');
		}

		// Generate unique shortcode
		let shortCode = generateShortCode();
		let attempts = 0;
		while (attempts < 10) {
			const exists = await this.prisma.referralLink.findUnique({
				where: { shortCode },
			});
			if (!exists) break;
			shortCode = generateShortCode();
			attempts++;
		}

		// Create referral link
		const referralLink = await this.prisma.referralLink.create({
			data: {
				userId,
				shortCode,
				isCustomShortCode: false,
			},
		});

		this.logger.log(`[REFERRAL] Created referral link for user ${userId}: ${shortCode}`);

		return {
			id: referralLink.id,
			shortCode: referralLink.shortCode,
			fullUrl: `${process.env.FRONTEND_URL || 'https://atlas.finance'}/i/${referralLink.shortCode}`,
		};
	}

	/**
	 * Customize referral link shortcode
	 */
	async customizeShortCode(userId: string, dto: CustomizeShortCodeDto) {
		const { shortCode } = dto;

		// Check reserved words
		if (RESERVED_SHORTCODES.includes(shortCode.toLowerCase())) {
			throw new BadRequestException('Este codigo nao esta disponivel');
		}

		// Check if user has a link
		const link = await this.prisma.referralLink.findUnique({
			where: { userId },
		});

		if (!link) {
			throw new NotFoundException('Voce ainda nao possui um link de indicacao');
		}

		if (link.isBlocked) {
			throw new ForbiddenException('Seu link de indicacao esta bloqueado');
		}

		// Check if shortcode is available
		const existing = await this.prisma.referralLink.findUnique({
			where: { shortCode: shortCode.toLowerCase() },
		});

		if (existing && existing.id !== link.id) {
			throw new ConflictException('Este codigo ja esta em uso');
		}

		// Update shortcode
		const updated = await this.prisma.referralLink.update({
			where: { id: link.id },
			data: {
				shortCode: shortCode.toLowerCase(),
				isCustomShortCode: true,
			},
		});

		this.logger.log(`[REFERRAL] User ${userId} customized shortcode to: ${shortCode}`);

		return {
			shortCode: updated.shortCode,
			fullUrl: `${process.env.FRONTEND_URL || 'https://atlas.finance'}/i/${updated.shortCode}`,
		};
	}

	/**
	 * Check if shortcode is available
	 */
	async checkShortCodeAvailability(shortCode: string) {
		const normalized = shortCode.toLowerCase();

		// Check reserved words
		if (RESERVED_SHORTCODES.includes(normalized)) {
			return { available: false, reason: 'Codigo reservado' };
		}

		// Validate format
		if (!/^[a-z0-9-]{5,15}$/.test(normalized)) {
			return { available: false, reason: 'Formato invalido' };
		}

		// Check if exists
		const existing = await this.prisma.referralLink.findUnique({
			where: { shortCode: normalized },
		});

		return {
			available: !existing,
			reason: existing ? 'Codigo ja em uso' : null,
		};
	}

	/**
	 * Request commission payout
	 */
	async requestCommissionPayout(userId: string, dto: RequestPayoutDto) {
		const { liquidAddress } = dto;

		// Get available commissions
		const availableCommissions = await this.prisma.commissionPayout.findMany({
			where: {
				userId,
				status: 'AVAILABLE',
			},
		});

		if (availableCommissions.length === 0) {
			throw new BadRequestException('Voce nao possui comissoes disponiveis para saque');
		}

		// Calculate total available
		const totalAvailable = availableCommissions.reduce(
			(sum, c) => sum + Number(c.amount),
			0
		);

		if (totalAvailable < this.MIN_WITHDRAWAL) {
			throw new BadRequestException(
				`Saldo minimo para saque e de R$ ${this.MIN_WITHDRAWAL.toLocaleString('pt-BR')}`
			);
		}

		// TODO: Validate liquid address format (use existing validation)
		// For now, basic check
		if (!liquidAddress || liquidAddress.length < 20) {
			throw new BadRequestException('Endereco Liquid invalido');
		}

		// Update all available commissions to REQUESTED
		await this.prisma.commissionPayout.updateMany({
			where: {
				userId,
				status: 'AVAILABLE',
			},
			data: {
				status: 'REQUESTED',
				liquidAddress,
				requestedAt: new Date(),
			},
		});

		this.logger.log(`[REFERRAL] User ${userId} requested payout of R$ ${totalAvailable} to ${liquidAddress}`);

		return {
			success: true,
			message: 'Solicitacao de saque enviada com sucesso',
			totalRequested: totalAvailable,
			liquidAddress,
		};
	}

	/**
	 * Get user's commissions summary
	 */
	async getCommissions(userId: string) {
		const commissions = await this.prisma.commissionPayout.findMany({
			where: { userId },
			include: {
				referredUser: {
					include: {
						referredUser: {
							select: { email: true },
						},
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		const summary = {
			available: 0,
			requested: 0,
			processing: 0,
			completed: 0,
			rejected: 0,
		};

		const items = commissions.map((c) => {
			const amount = Number(c.amount);
			switch (c.status) {
				case 'AVAILABLE':
					summary.available += amount;
					break;
				case 'REQUESTED':
					summary.requested += amount;
					break;
				case 'PROCESSING':
					summary.processing += amount;
					break;
				case 'COMPLETED':
					summary.completed += amount;
					break;
				case 'REJECTED':
					summary.rejected += amount;
					break;
			}

			return {
				id: c.id,
				amount,
				status: c.status,
				statusReason: c.statusReason,
				liquidAddress: c.liquidAddress,
				requestedAt: c.requestedAt,
				approvedAt: c.approvedAt,
				coldwalletTxId: c.coldwalletTxId,
				createdAt: c.createdAt,
				referredEmail: this.censorEmail(c.referredUser.referredUser.email),
			};
		});

		return { summary, items };
	}

	// ==========================================
	// PUBLIC METHODS (for registration)
	// ==========================================

	/**
	 * Validate referral link exists
	 */
	async validateReferralLink(shortCode: string) {
		const link = await this.prisma.referralLink.findUnique({
			where: { shortCode: shortCode.toLowerCase() },
			select: {
				id: true,
				isActive: true,
				isBlocked: true,
			},
		});

		if (!link) {
			return { valid: false, reason: 'Link nao encontrado' };
		}

		if (!link.isActive) {
			return { valid: false, reason: 'Link desativado' };
		}

		if (link.isBlocked) {
			return { valid: false, reason: 'Link bloqueado' };
		}

		return { valid: true };
	}

	/**
	 * Track referral signup during registration
	 */
	async trackReferralSignup(referredUserId: string, shortCode: string) {
		const link = await this.prisma.referralLink.findUnique({
			where: { shortCode: shortCode.toLowerCase() },
		});

		if (!link) {
			this.logger.warn(`[REFERRAL] Invalid referral code used: ${shortCode}`);
			return;
		}

		// Prevent self-referral
		if (link.userId === referredUserId) {
			this.logger.warn(`[REFERRAL] Self-referral attempt by user ${referredUserId}`);
			return;
		}

		// Check if user is already referred
		const existingReferral = await this.prisma.referredUser.findUnique({
			where: { referredUserId },
		});

		if (existingReferral) {
			this.logger.warn(`[REFERRAL] User ${referredUserId} already referred`);
			return;
		}

		// Check for linked accounts (fraud prevention)
		const referrerRisk = await this.prisma.riskProfile.findUnique({
			where: { userId: link.userId },
		});

		if (referrerRisk?.linkedAccountIds?.includes(referredUserId)) {
			this.logger.warn(`[REFERRAL] Linked accounts detected: ${link.userId} -> ${referredUserId}`);
			return;
		}

		// Calculate deadline (3 months from now)
		const deadlineDate = new Date();
		deadlineDate.setMonth(deadlineDate.getMonth() + this.VALIDITY_MONTHS);

		// Create referral record
		await this.prisma.$transaction([
			this.prisma.referredUser.create({
				data: {
					referralLinkId: link.id,
					referredUserId,
					deadlineDate,
				},
			}),
			this.prisma.referralLink.update({
				where: { id: link.id },
				data: {
					totalSignups: { increment: 1 },
				},
			}),
		]);

		this.logger.log(`[REFERRAL] User ${referredUserId} registered via referral link ${shortCode}`);
	}

	// ==========================================
	// ADMIN METHODS
	// ==========================================

	/**
	 * Get pending payout requests
	 */
	async getPendingPayoutRequests() {
		return this.prisma.commissionPayout.findMany({
			where: {
				status: { in: ['REQUESTED', 'PROCESSING'] },
			},
			include: {
				user: {
					select: { id: true, email: true, username: true },
				},
				referredUser: {
					include: {
						referredUser: {
							select: { email: true },
						},
					},
				},
			},
			orderBy: { requestedAt: 'asc' },
		});
	}

	/**
	 * Get payout history
	 */
	async getPayoutHistory(status?: CommissionPayoutStatus) {
		return this.prisma.commissionPayout.findMany({
			where: status ? { status } : {},
			include: {
				user: {
					select: { id: true, email: true, username: true },
				},
				referredUser: {
					include: {
						referredUser: {
							select: { email: true },
						},
					},
				},
			},
			orderBy: { updatedAt: 'desc' },
			take: 100,
		});
	}

	/**
	 * Approve payout request
	 */
	async approvePayout(adminId: string, payoutId: string, dto: AdminApprovePayoutDto) {
		const payout = await this.prisma.commissionPayout.findUnique({
			where: { id: payoutId },
		});

		if (!payout) {
			throw new NotFoundException('Solicitacao nao encontrada');
		}

		if (payout.status !== 'REQUESTED') {
			throw new BadRequestException('Solicitacao nao esta pendente');
		}

		await this.prisma.commissionPayout.update({
			where: { id: payoutId },
			data: {
				status: 'PROCESSING',
				approvedBy: adminId,
				approvedAt: new Date(),
				adminNotes: dto.adminNotes,
				coldwalletTxId: dto.coldwalletTxId,
			},
		});

		this.logger.log(`[REFERRAL] Admin ${adminId} approved payout ${payoutId}`);

		return { success: true, message: 'Pagamento aprovado' };
	}

	/**
	 * Mark payout as completed
	 */
	async completePayout(adminId: string, payoutId: string, coldwalletTxId: string) {
		const payout = await this.prisma.commissionPayout.findUnique({
			where: { id: payoutId },
		});

		if (!payout) {
			throw new NotFoundException('Solicitacao nao encontrada');
		}

		if (payout.status !== 'PROCESSING') {
			throw new BadRequestException('Solicitacao nao esta em processamento');
		}

		await this.prisma.commissionPayout.update({
			where: { id: payoutId },
			data: {
				status: 'COMPLETED',
				coldwalletTxId,
			},
		});

		this.logger.log(`[REFERRAL] Payout ${payoutId} completed with tx ${coldwalletTxId}`);

		return { success: true, message: 'Pagamento concluido' };
	}

	/**
	 * Reject payout request
	 */
	async rejectPayout(adminId: string, payoutId: string, dto: AdminRejectPayoutDto) {
		const payout = await this.prisma.commissionPayout.findUnique({
			where: { id: payoutId },
		});

		if (!payout) {
			throw new NotFoundException('Solicitacao nao encontrada');
		}

		if (!['REQUESTED', 'PROCESSING'].includes(payout.status)) {
			throw new BadRequestException('Solicitacao nao pode ser rejeitada');
		}

		await this.prisma.commissionPayout.update({
			where: { id: payoutId },
			data: {
				status: 'REJECTED',
				rejectedBy: adminId,
				rejectedAt: new Date(),
				statusReason: dto.statusReason,
				adminNotes: dto.adminNotes,
			},
		});

		this.logger.log(`[REFERRAL] Admin ${adminId} rejected payout ${payoutId}: ${dto.statusReason}`);

		return { success: true, message: 'Pagamento rejeitado' };
	}

	/**
	 * Block user from referral program
	 */
	async blockReferralLink(adminId: string, userId: string, dto: AdminBlockUserDto) {
		const link = await this.prisma.referralLink.findUnique({
			where: { userId },
		});

		if (!link) {
			throw new NotFoundException('Usuario nao possui link de indicacao');
		}

		await this.prisma.referralLink.update({
			where: { id: link.id },
			data: {
				isBlocked: true,
				blockReason: dto.blockReason,
			},
		});

		this.logger.log(`[REFERRAL] Admin ${adminId} blocked user ${userId}: ${dto.blockReason}`);

		return { success: true, message: 'Usuario bloqueado do programa' };
	}

	// ==========================================
	// CRON/BACKGROUND METHODS
	// ==========================================

	/**
	 * Update sales for all pending referrals
	 */
	async updatePendingReferralSales() {
		const pendingReferrals = await this.prisma.referredUser.findMany({
			where: { status: 'PENDING' },
		});

		this.logger.log(`[REFERRAL CRON] Updating sales for ${pendingReferrals.length} pending referrals`);

		for (const referral of pendingReferrals) {
			try {
				const sales = await this.calculateCommerceSales(referral.referredUserId);

				await this.prisma.referredUser.update({
					where: { id: referral.id },
					data: {
						commerceSalesTotal: sales,
						lastSalesUpdate: new Date(),
					},
				});

				// Check if reached threshold
				if (sales >= this.MIN_SALES_FOR_VALID) {
					await this.validateReferral(referral.id);
				}
			} catch (error) {
				this.logger.error(`[REFERRAL CRON] Error updating referral ${referral.id}:`, error);
			}
		}
	}

	/**
	 * Expire old referrals past deadline
	 */
	async expireOldReferrals() {
		const now = new Date();

		const expired = await this.prisma.referredUser.updateMany({
			where: {
				status: 'PENDING',
				deadlineDate: { lt: now },
			},
			data: {
				status: 'EXPIRED',
			},
		});

		if (expired.count > 0) {
			this.logger.log(`[REFERRAL CRON] Expired ${expired.count} referrals`);
		}
	}

	// ==========================================
	// HELPER METHODS
	// ==========================================

	/**
	 * Calculate user's commerce sales (DEPOSIT COMPLETED transactions)
	 */
	private async calculateCommerceSales(userId: string): Promise<number> {
		const result = await this.prisma.transaction.aggregate({
			where: {
				userId,
				type: 'DEPOSIT',
				status: 'COMPLETED',
			},
			_sum: { amount: true },
		});

		return result._sum.amount || 0;
	}

	/**
	 * Validate a referral (when sales threshold is reached)
	 */
	private async validateReferral(referralId: string) {
		const referral = await this.prisma.referredUser.findUnique({
			where: { id: referralId },
			include: { referralLink: true },
		});

		if (!referral || referral.status !== 'PENDING') {
			return;
		}

		// Check deadline
		if (new Date() > referral.deadlineDate) {
			await this.prisma.referredUser.update({
				where: { id: referralId },
				data: { status: 'EXPIRED' },
			});
			return;
		}

		// Generate commission amount
		const commissionAmount = this.generateCommissionAmount();

		// Update referral and create commission payout
		await this.prisma.$transaction([
			this.prisma.referredUser.update({
				where: { id: referralId },
				data: {
					status: 'VALID',
					validatedAt: new Date(),
					commissionAmount,
				},
			}),
			this.prisma.referralLink.update({
				where: { id: referral.referralLinkId },
				data: {
					validReferrals: { increment: 1 },
					totalCommissions: { increment: commissionAmount },
				},
			}),
			this.prisma.commissionPayout.create({
				data: {
					referredUserId: referralId,
					userId: referral.referralLink.userId,
					amount: commissionAmount,
					status: 'AVAILABLE',
				},
			}),
		]);

		this.logger.log(
			`[REFERRAL] Referral ${referralId} validated! Commission: R$ ${commissionAmount}`
		);
	}

	/**
	 * Generate random commission amount (uniform distribution R$20-R$150)
	 */
	private generateCommissionAmount(): number {
		const min = this.COMMISSION_MIN;
		const max = this.COMMISSION_MAX;

		// Use crypto for better randomness
		const randomBuffer = crypto.randomBytes(4);
		const randomValue = randomBuffer.readUInt32BE(0) / 0xffffffff;

		// Uniform distribution
		const amount = min + randomValue * (max - min);

		// Round to 2 decimal places
		return Math.round(amount * 100) / 100;
	}

	/**
	 * Censor email for display (show first 3 chars + asterisks + domain)
	 */
	censorEmail(email: string): string {
		if (!email || !email.includes('@')) {
			return '***@***.***';
		}

		const [local, domain] = email.split('@');
		const visible = local.slice(0, 3);
		return `${visible}${'*'.repeat(8)}@${domain}`;
	}
}
