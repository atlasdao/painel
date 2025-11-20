import { Injectable, Logger, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
	CreatePaymentLinkDto,
	UpdatePaymentLinkDto,
	PaymentLinkResponseDto,
} from './dto/payment-link.dto';
import { PixService } from '../pix/pix.service';
import { WebhookService } from './webhook.service';
import { nanoid } from 'nanoid';

@Injectable()
export class PaymentLinkService {
	private readonly logger = new Logger(PaymentLinkService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly pixService: PixService,
		@Inject(forwardRef(() => WebhookService))
		private readonly webhookService: WebhookService,
	) {}

	async create(
		userId: string,
		dto: CreatePaymentLinkDto,
	): Promise<PaymentLinkResponseDto> {
		// Enhanced logging for debugging
		this.logger.log(`Creating payment link for user: ${userId}`);
		this.logger.log(`DTO received: ${JSON.stringify(dto, null, 2)}`);

		// Get user info to check commerce mode
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { commerceMode: true },
		});

		if (!user) {
			throw new HttpException(
				'Usuário não encontrado.',
				HttpStatus.NOT_FOUND,
			);
		}

		// Commerce mode limits: min 1 real, max 3000 reais
		const COMMERCE_MIN_AMOUNT = 1.00;
		const COMMERCE_MAX_AMOUNT = 3000.00;

		// Comprehensive validation with NaN checks and Portuguese error messages
		if (!dto.isCustomAmount && (!dto.amount || isNaN(dto.amount))) {
			throw new HttpException(
				'Valor é obrigatório para links de valor fixo.',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Check for NaN values in all numeric fields
		if (dto.amount !== undefined && (isNaN(dto.amount) || dto.amount <= 0)) {
			throw new HttpException(
				'Valor inválido fornecido.',
				HttpStatus.BAD_REQUEST,
			);
		}

		if (dto.minAmount !== undefined && (isNaN(dto.minAmount) || dto.minAmount <= 0)) {
			throw new HttpException(
				'Valor mínimo inválido fornecido.',
				HttpStatus.BAD_REQUEST,
			);
		}

		if (dto.maxAmount !== undefined && (isNaN(dto.maxAmount) || dto.maxAmount <= 0)) {
			throw new HttpException(
				'Valor máximo inválido fornecido.',
				HttpStatus.BAD_REQUEST,
			);
		}

		if (
			dto.isCustomAmount &&
			dto.minAmount &&
			dto.maxAmount &&
			dto.minAmount >= dto.maxAmount
		) {
			throw new HttpException(
				'O valor mínimo deve ser menor que o valor máximo.',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Additional validations for user-friendly feedback
		if (dto.isCustomAmount && !dto.minAmount && !dto.maxAmount) {
			throw new HttpException(
				'Para valores personalizados, defina pelo menos um valor mínimo ou máximo.',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Commerce mode amount validations
		if (user.commerceMode) {
			if (dto.amount && dto.amount < COMMERCE_MIN_AMOUNT) {
				throw new HttpException(
					`O valor deve ser pelo menos R$ ${COMMERCE_MIN_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.amount && dto.amount > COMMERCE_MAX_AMOUNT) {
				throw new HttpException(
					`O valor não pode exceder R$ ${COMMERCE_MAX_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.minAmount && dto.minAmount < COMMERCE_MIN_AMOUNT) {
				throw new HttpException(
					`O valor mínimo deve ser pelo menos R$ ${COMMERCE_MIN_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.maxAmount && dto.maxAmount > COMMERCE_MAX_AMOUNT) {
				throw new HttpException(
					`O valor máximo não pode exceder R$ ${COMMERCE_MAX_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.minAmount && dto.minAmount > COMMERCE_MAX_AMOUNT) {
				throw new HttpException(
					`O valor mínimo não pode exceder R$ ${COMMERCE_MAX_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}
		} else {
			// Regular users - existing validations
			if (dto.amount && dto.amount < 0.01) {
				throw new HttpException(
					'O valor deve ser maior que R$ 0,01.',
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.minAmount && dto.minAmount < 0.01) {
				throw new HttpException(
					'O valor mínimo deve ser maior que R$ 0,01.',
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.maxAmount && dto.maxAmount < 0.01) {
				throw new HttpException(
					'O valor máximo deve ser maior que R$ 0,01.',
					HttpStatus.BAD_REQUEST,
				);
			}
		}

		if (!dto.walletAddress || dto.walletAddress.trim().length === 0) {
			throw new HttpException(
				'Endereço da carteira é obrigatório.',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Generate unique short code
		const shortCode = nanoid(8);

		try {
			const paymentLink = await this.prisma.paymentLink.create({
				data: {
					userId,
					shortCode,
					amount: dto.amount || null,
					isCustomAmount: dto.isCustomAmount || false,
					minAmount: dto.minAmount || null,
					maxAmount: dto.maxAmount || null,
					walletAddress: dto.walletAddress.trim(),
					description: dto.description || null,
					expiresAt: dto.expiresAt || null,
				},
			});

			// Create webhooks if provided
			if (dto.webhooks && dto.webhooks.length > 0 && this.webhookService) {
				for (const webhookDto of dto.webhooks) {
					try {
						await this.webhookService.createWebhook(
							paymentLink.id,
							userId,
							webhookDto,
						);
					} catch (webhookError) {
						this.logger.error(`Failed to create webhook: ${webhookError.message}`);
						// Continue creating other webhooks even if one fails
					}
				}
			}

			this.logger.log(`Payment link created successfully: ${paymentLink.id} (${shortCode})`);
			return this.formatResponse(paymentLink);
		} catch (error) {
			this.logger.error('Database error creating payment link:', error);
			throw new HttpException(
				'Erro interno ao criar link de pagamento. Tente novamente.',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async findByUserId(userId: string): Promise<PaymentLinkResponseDto[]> {
		const links = await this.prisma.paymentLink.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
		});

		return links.map((link) => this.formatResponse(link));
	}

	async findByShortCode(
		shortCode: string,
	): Promise<PaymentLinkResponseDto | null> {
		const link = await this.prisma.paymentLink.findUnique({
			where: { shortCode },
		});

		if (!link) return null;

		// Check if link is expired
		if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
			await this.prisma.paymentLink.update({
				where: { id: link.id },
				data: { isActive: false },
			});
			throw new HttpException('Payment link has expired', HttpStatus.GONE);
		}

		return this.formatResponse(link);
	}

	async delete(id: string, userId: string): Promise<void> {
		const link = await this.prisma.paymentLink.findFirst({
			where: { id, userId },
		});

		if (!link) {
			throw new HttpException('Payment link not found', HttpStatus.NOT_FOUND);
		}

		await this.prisma.paymentLink.delete({
			where: { id },
		});
	}

	async toggleStatus(id: string, userId: string): Promise<PaymentLinkResponseDto> {
		// Find the payment link and verify ownership
		const link = await this.prisma.paymentLink.findFirst({
			where: { id, userId },
		});

		if (!link) {
			throw new HttpException('Link de pagamento não encontrado', HttpStatus.NOT_FOUND);
		}

		// Toggle the isActive status
		const updatedLink = await this.prisma.paymentLink.update({
			where: { id },
			data: {
				isActive: !link.isActive,
			},
		});

		this.logger.log(`Payment link ${updatedLink.shortCode} status toggled to ${updatedLink.isActive ? 'active' : 'inactive'}`);

		return this.formatResponse(updatedLink);
	}

	async update(
		id: string,
		userId: string,
		dto: UpdatePaymentLinkDto,
	): Promise<PaymentLinkResponseDto> {
		this.logger.log(`Updating payment link ${id} for user: ${userId}`);
		this.logger.log(`Update DTO received: ${JSON.stringify(dto, null, 2)}`);

		// Find the payment link and verify ownership
		const existingLink = await this.prisma.paymentLink.findFirst({
			where: { id, userId },
		});

		if (!existingLink) {
			throw new HttpException(
				'Link de pagamento não encontrado',
				HttpStatus.NOT_FOUND,
			);
		}

		// Get user info to check commerce mode
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { commerceMode: true },
		});

		if (!user) {
			throw new HttpException(
				'Usuário não encontrado.',
				HttpStatus.NOT_FOUND,
			);
		}

		// Commerce mode limits: min 1 real, max 3000 reais
		const COMMERCE_MIN_AMOUNT = 1.00;
		const COMMERCE_MAX_AMOUNT = 3000.00;

		// Validate numeric fields if provided
		if (dto.amount !== undefined && (isNaN(dto.amount) || dto.amount <= 0)) {
			throw new HttpException(
				'Valor inválido fornecido.',
				HttpStatus.BAD_REQUEST,
			);
		}

		if (dto.minAmount !== undefined && (isNaN(dto.minAmount) || dto.minAmount <= 0)) {
			throw new HttpException(
				'Valor mínimo inválido fornecido.',
				HttpStatus.BAD_REQUEST,
			);
		}

		if (dto.maxAmount !== undefined && (isNaN(dto.maxAmount) || dto.maxAmount <= 0)) {
			throw new HttpException(
				'Valor máximo inválido fornecido.',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Commerce mode amount validations
		if (user.commerceMode) {
			if (dto.amount !== undefined && dto.amount < COMMERCE_MIN_AMOUNT) {
				throw new HttpException(
					`O valor deve ser pelo menos R$ ${COMMERCE_MIN_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.amount !== undefined && dto.amount > COMMERCE_MAX_AMOUNT) {
				throw new HttpException(
					`O valor não pode exceder R$ ${COMMERCE_MAX_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.minAmount !== undefined && dto.minAmount < COMMERCE_MIN_AMOUNT) {
				throw new HttpException(
					`O valor mínimo deve ser pelo menos R$ ${COMMERCE_MIN_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.maxAmount !== undefined && dto.maxAmount > COMMERCE_MAX_AMOUNT) {
				throw new HttpException(
					`O valor máximo não pode exceder R$ ${COMMERCE_MAX_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.minAmount !== undefined && dto.minAmount > COMMERCE_MAX_AMOUNT) {
				throw new HttpException(
					`O valor mínimo não pode exceder R$ ${COMMERCE_MAX_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}
		} else {
			// Regular users - existing validations
			if (dto.amount && dto.amount < 0.01) {
				throw new HttpException(
					'O valor deve ser maior que R$ 0,01.',
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.minAmount && dto.minAmount < 0.01) {
				throw new HttpException(
					'O valor mínimo deve ser maior que R$ 0,01.',
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.maxAmount && dto.maxAmount < 0.01) {
				throw new HttpException(
					'O valor máximo deve ser maior que R$ 0,01.',
					HttpStatus.BAD_REQUEST,
				);
			}
		}

		// Validate min/max relationship
		const newMinAmount = dto.minAmount !== undefined ? dto.minAmount : existingLink.minAmount;
		const newMaxAmount = dto.maxAmount !== undefined ? dto.maxAmount : existingLink.maxAmount;
		const newIsCustomAmount = dto.isCustomAmount !== undefined ? dto.isCustomAmount : existingLink.isCustomAmount;

		if (
			newIsCustomAmount &&
			newMinAmount &&
			newMaxAmount &&
			newMinAmount >= newMaxAmount
		) {
			throw new HttpException(
				'O valor mínimo deve ser menor que o valor máximo.',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Validate wallet address if provided
		if (dto.walletAddress !== undefined && dto.walletAddress.trim().length === 0) {
			throw new HttpException(
				'Endereço da carteira não pode estar vazio.',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Validate custom amount logic
		if (dto.isCustomAmount === true && newMinAmount === null && newMaxAmount === null) {
			throw new HttpException(
				'Para valores personalizados, defina pelo menos um valor mínimo ou máximo.',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Validate fixed amount when not custom
		if (dto.isCustomAmount === false && !dto.amount && !existingLink.amount) {
			throw new HttpException(
				'Valor é obrigatório para links de valor fixo.',
				HttpStatus.BAD_REQUEST,
			);
		}

		try {
			// Prepare update data - only include fields that are actually being updated
			const updateData: any = {};

			if (dto.amount !== undefined) updateData.amount = dto.amount;
			if (dto.isCustomAmount !== undefined) updateData.isCustomAmount = dto.isCustomAmount;
			if (dto.minAmount !== undefined) updateData.minAmount = dto.minAmount;
			if (dto.maxAmount !== undefined) updateData.maxAmount = dto.maxAmount;
			if (dto.walletAddress !== undefined) updateData.walletAddress = dto.walletAddress.trim();
			if (dto.description !== undefined) updateData.description = dto.description;
			if (dto.expiresAt !== undefined) updateData.expiresAt = dto.expiresAt;
			if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

			// Clear QR code when updating since the payment details may have changed
			if (dto.amount !== undefined || dto.walletAddress !== undefined || dto.description !== undefined) {
				updateData.currentQrCode = null;
				updateData.qrCodeGeneratedAt = null;
			}

			const updatedLink = await this.prisma.paymentLink.update({
				where: { id },
				data: updateData,
			});

			this.logger.log(`Payment link ${updatedLink.shortCode} updated successfully`);
			return this.formatResponse(updatedLink);
		} catch (error) {
			this.logger.error('Database error updating payment link:', error);
			throw new HttpException(
				'Erro interno ao atualizar link de pagamento. Tente novamente.',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async generateQRCode(
		shortCode: string,
		customAmount?: number,
	): Promise<{ qrCode: string; expiresAt: Date }> {
		const link = await this.prisma.paymentLink.findUnique({
			where: { shortCode },
			include: {
				user: {
					select: { commerceMode: true },
				},
			},
		});

		if (!link) {
			throw new HttpException('Payment link not found', HttpStatus.NOT_FOUND);
		}

		if (!link.isActive) {
			throw new HttpException(
				'Payment link is inactive',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Commerce mode limits: min 1 real, max 3000 reais
		const COMMERCE_MIN_AMOUNT = 1.00;
		const COMMERCE_MAX_AMOUNT = 3000.00;

		// Determine the amount to use
		let amount: number;
		if (link.isCustomAmount) {
			if (!customAmount) {
				throw new HttpException(
					'Amount is required for custom payment links',
					HttpStatus.BAD_REQUEST,
				);
			}
			if (link.minAmount && customAmount < link.minAmount) {
				throw new HttpException(
					`Amount must be at least ${link.minAmount}`,
					HttpStatus.BAD_REQUEST,
				);
			}
			if (link.maxAmount && customAmount > link.maxAmount) {
				throw new HttpException(
					`Amount cannot exceed ${link.maxAmount}`,
					HttpStatus.BAD_REQUEST,
				);
			}

			// Additional commerce mode validation for custom amounts
			if (link.user.commerceMode) {
				if (customAmount < COMMERCE_MIN_AMOUNT) {
					throw new HttpException(
						`O valor deve ser pelo menos R$ ${COMMERCE_MIN_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
						HttpStatus.BAD_REQUEST,
					);
				}
				if (customAmount > COMMERCE_MAX_AMOUNT) {
					throw new HttpException(
						`O valor não pode exceder R$ ${COMMERCE_MAX_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
						HttpStatus.BAD_REQUEST,
					);
				}
			}

			amount = customAmount;
		} else {
			if (!link.amount) {
				throw new HttpException(
					'Payment link has no amount configured',
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}
			amount = link.amount;
		}

		try {
			// Generate PIX QR Code with paymentLinkId in metadata
			this.logger.log(`🔗 PAYMENT LINK: Generating QR code for link ${link.id} (${link.shortCode})`);
			this.logger.log(`  Amount: ${amount}, Wallet: ${link.walletAddress}`);

			const metadata = {
				paymentLinkId: link.id,
				shortCode: link.shortCode,
			};

			this.logger.log(`  Metadata being passed: ${JSON.stringify(metadata)}`);

			const qrCodeData = await this.pixService.generatePixQRCode(link.userId, {
				amount,
				depixAddress: link.walletAddress,
				description: link.description || `Payment ${shortCode}`,
				metadata,
			});

			// Update link with new QR code
			const expiresAt = new Date(Date.now() + 28 * 60 * 1000); // 28 minutes from now

			await this.prisma.paymentLink.update({
				where: { id: link.id },
				data: {
					currentQrCode: qrCodeData.qrCode,
					qrCodeGeneratedAt: new Date(),
				},
			});

			return {
				qrCode: qrCodeData.qrCode,
				expiresAt,
			};
		} catch (error) {
			this.logger.error(`Failed to generate QR code for ${shortCode}:`, error);
			throw new HttpException(
				'Failed to generate QR code',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}


	async handlePaymentCompleted(transactionId: string, amount: number) {
		// Find payment link by amount and recent QR code generation
		const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

		const link = await this.prisma.paymentLink.findFirst({
			where: {
				amount,
				isActive: true,
				qrCodeGeneratedAt: {
					gte: recentTime,
				},
			},
			orderBy: {
				qrCodeGeneratedAt: 'desc',
			},
		});

		if (link) {
			// Update payment link statistics
			await this.prisma.paymentLink.update({
				where: { id: link.id },
				data: {
					lastPaymentId: transactionId,
					totalPayments: { increment: 1 },
					totalAmount: { increment: amount },
					currentQrCode: null, // Clear QR code to force regeneration
					qrCodeGeneratedAt: null,
				},
			});

			this.logger.log(`Payment completed for link ${link.shortCode}`);
		}
	}

	private formatResponse(link: any): PaymentLinkResponseDto {
		return {
			id: link.id,
			userId: link.userId,
			shortCode: link.shortCode,
			amount: link.amount,
			isCustomAmount: link.isCustomAmount || false,
			minAmount: link.minAmount,
			maxAmount: link.maxAmount,
			walletAddress: link.walletAddress,
			description: link.description,
			currentQrCode: link.currentQrCode,
			qrCodeGeneratedAt: link.qrCodeGeneratedAt,
			lastPaymentId: link.lastPaymentId,
			totalPayments: link.totalPayments,
			totalAmount: link.totalAmount,
			isActive: link.isActive,
			expiresAt: link.expiresAt,
			createdAt: link.createdAt,
			updatedAt: link.updatedAt,
		};
	}
}
