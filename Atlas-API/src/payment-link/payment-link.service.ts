import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
	CreatePaymentLinkDto,
	UpdatePaymentLinkDto,
	PaymentLinkResponseDto,
	GenerateQRWithTaxNumberDto,
	QRCodeResponseDto,
} from './dto/payment-link.dto';
import { PixService } from '../pix/pix.service';
import { WebhookService } from './webhook.service';
import { IdentityVaultService } from '../identity-vault/identity-vault.service';
import {
	hashEuid,
	hashTaxNumber,
	maskTaxNumber,
} from '../identity-vault/identity-vault.utils';
import { nanoid } from 'nanoid';
import { validateTaxNumber } from './utils/tax-number-validator';
import { PixKeyType } from '@prisma/client';

@Injectable()
export class PaymentLinkService {
	private readonly logger = new Logger(PaymentLinkService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly pixService: PixService,
		private readonly webhookService: WebhookService,
		private readonly identityVaultService: IdentityVaultService,
	) {}

	async create(
		userId: string,
		dto: CreatePaymentLinkDto,
		collabContext?: { isCollaborating: boolean; role: 'GESTOR' | 'AUXILIAR' | null },
	): Promise<PaymentLinkResponseDto> {
		// Enhanced logging for debugging
		this.logger.log(`Creating payment link for user: ${userId}`);
		this.logger.log(`DTO received: ${JSON.stringify(dto, null, 2)}`);
		this.logger.log(`Collaborator context: ${JSON.stringify(collabContext, null, 2)}`);

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

		// Commerce mode limits: min 1 real, max 3000 reais (or 5000 with tax number)
		const COMMERCE_MIN_AMOUNT = 1.00;
		const COMMERCE_MAX_AMOUNT_BASIC = 3000.00;
		const COMMERCE_MAX_AMOUNT_WITH_TAX = 5000.00;

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

		// Limite máximo é sempre R$ 5.000 (CPF/CNPJ é exigido automaticamente acima de R$ 3.000)
		const commerceMaxAmount = COMMERCE_MAX_AMOUNT_WITH_TAX; // R$ 5.000

		// Commerce mode amount validations
		if (user.commerceMode) {
			if (dto.amount && dto.amount < COMMERCE_MIN_AMOUNT) {
				throw new HttpException(
					`O valor deve ser pelo menos R$ ${COMMERCE_MIN_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.amount && dto.amount > commerceMaxAmount) {
				throw new HttpException(
					`O valor não pode exceder R$ ${commerceMaxAmount.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.minAmount && dto.minAmount < COMMERCE_MIN_AMOUNT) {
				throw new HttpException(
					`O valor mínimo deve ser pelo menos R$ ${COMMERCE_MIN_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.maxAmount && dto.maxAmount > commerceMaxAmount) {
				throw new HttpException(
					`O valor máximo não pode exceder R$ ${commerceMaxAmount.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.minAmount && dto.minAmount > commerceMaxAmount) {
				throw new HttpException(
					`O valor mínimo não pode exceder R$ ${commerceMaxAmount.toFixed(2)} para usuários do modo comércio.`,
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

		// CPF/CNPJ é obrigatório automaticamente para valores acima de R$ 3.000
		// O campo requiresTaxNumber agora é sempre true - a verificação real acontece no generateQRCode
		// baseada no valor efetivo da transação
		const TAX_NUMBER_THRESHOLD = 3000.00;
		const requiresTaxNumber = true; // Sempre habilitado - verificação dinâmica por valor
		const minAmountForTaxNumber = TAX_NUMBER_THRESHOLD;

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
					requiresTaxNumber,
					minAmountForTaxNumber,
				},
			});

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

		// Commerce mode limits: min 1 real, max 3000 reais (or 5000 with tax number)
		const COMMERCE_MIN_AMOUNT = 1.00;
		const COMMERCE_MAX_AMOUNT_BASIC = 3000.00;
		const COMMERCE_MAX_AMOUNT_WITH_TAX = 5000.00;

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

		// Limite máximo é sempre R$ 5.000 (CPF/CNPJ é exigido automaticamente acima de R$ 3.000)
		const commerceMaxAmount = COMMERCE_MAX_AMOUNT_WITH_TAX; // R$ 5.000

		// Commerce mode amount validations
		if (user.commerceMode) {
			if (dto.amount !== undefined && dto.amount < COMMERCE_MIN_AMOUNT) {
				throw new HttpException(
					`O valor deve ser pelo menos R$ ${COMMERCE_MIN_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.amount !== undefined && dto.amount > commerceMaxAmount) {
				throw new HttpException(
					`O valor não pode exceder R$ ${commerceMaxAmount.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.minAmount !== undefined && dto.minAmount < COMMERCE_MIN_AMOUNT) {
				throw new HttpException(
					`O valor mínimo deve ser pelo menos R$ ${COMMERCE_MIN_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.maxAmount !== undefined && dto.maxAmount > commerceMaxAmount) {
				throw new HttpException(
					`O valor máximo não pode exceder R$ ${commerceMaxAmount.toFixed(2)} para usuários do modo comércio.`,
					HttpStatus.BAD_REQUEST,
				);
			}

			if (dto.minAmount !== undefined && dto.minAmount > commerceMaxAmount) {
				throw new HttpException(
					`O valor mínimo não pode exceder R$ ${commerceMaxAmount.toFixed(2)} para usuários do modo comércio.`,
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

			// CPF/CNPJ é sempre obrigatório para valores acima de R$ 3.000
			// Mantém requiresTaxNumber = true e minAmountForTaxNumber = 3000 como padrão
			updateData.requiresTaxNumber = true;
			updateData.minAmountForTaxNumber = 3000;

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
	): Promise<QRCodeResponseDto> {
		const link = await this.prisma.paymentLink.findUnique({
			where: { shortCode },
			include: {
				user: {
					select: { commerceMode: true, verifiedTaxNumber: true },
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

		// Commerce mode limits: min 1 real, max 3000 reais (or 5000 with tax number)
		const COMMERCE_MIN_AMOUNT = 1.00;
		const COMMERCE_MAX_AMOUNT_BASIC = 3000.00;
		const COMMERCE_MAX_AMOUNT_WITH_TAX = 5000.00;

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
				const commerceMaxAmount = link.requiresTaxNumber ? COMMERCE_MAX_AMOUNT_WITH_TAX : COMMERCE_MAX_AMOUNT_BASIC;
				if (customAmount < COMMERCE_MIN_AMOUNT) {
					throw new HttpException(
						`O valor deve ser pelo menos R$ ${COMMERCE_MIN_AMOUNT.toFixed(2)} para usuários do modo comércio.`,
						HttpStatus.BAD_REQUEST,
					);
				}
				if (customAmount > commerceMaxAmount) {
					throw new HttpException(
						`O valor não pode exceder R$ ${commerceMaxAmount.toFixed(2)} para usuários do modo comércio.`,
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

		return {
			qrCode: '',
			expiresAt: new Date(),
			transactionId: '',
			needsTaxNumber: true,
		};

	}

	async generateQRCodeWithTaxNumber(
		shortCode: string,
		dto: GenerateQRWithTaxNumberDto,
	): Promise<QRCodeResponseDto> {
		const link = await this.prisma.paymentLink.findUnique({
			where: { shortCode },
			include: {
				user: {
					select: { commerceMode: true },
				},
			},
		});

		if (!link) {
			throw new HttpException('Link de pagamento não encontrado', HttpStatus.NOT_FOUND);
		}

		if (!link.isActive) {
			throw new HttpException(
				'Link de pagamento está inativo',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Validate tax number
		const taxValidation = validateTaxNumber(dto.taxNumber);
		if (!taxValidation.isValid) {
			throw new HttpException(
				'CPF/CNPJ inválido',
				HttpStatus.BAD_REQUEST,
			);
		}

		// Determine the amount
		let amount: number;
		if (link.isCustomAmount) {
			if (!dto.amount) {
				throw new HttpException(
					'Valor é obrigatório para links de valor customizado',
					HttpStatus.BAD_REQUEST,
				);
			}
			if (link.minAmount && dto.amount < link.minAmount) {
				throw new HttpException(
					`O valor deve ser pelo menos R$ ${link.minAmount.toFixed(2)}`,
					HttpStatus.BAD_REQUEST,
				);
			}
			if (link.maxAmount && dto.amount > link.maxAmount) {
				throw new HttpException(
					`O valor não pode exceder R$ ${link.maxAmount.toFixed(2)}`,
					HttpStatus.BAD_REQUEST,
				);
			}
			amount = dto.amount;
		} else {
			if (!link.amount) {
				throw new HttpException(
					'Link de pagamento não possui valor configurado',
					HttpStatus.INTERNAL_SERVER_ERROR,
				);
			}
			amount = link.amount;
		}

		// Ensure amount doesn't exceed 5000 for tax number payments
		if (amount > 5000) {
			throw new HttpException(
				'Valor máximo para pagamentos com CPF/CNPJ é R$ 5.000,00',
				HttpStatus.BAD_REQUEST,
			);
		}

		const contact = await this.identityVaultService.findMerchantContactByTaxNumber(
			link.userId,
			taxValidation.formatted,
		);
		const fullName = dto.fullName?.trim();

		if (!contact?.identity?.euid && !fullName) {
			return {
				qrCode: '',
				expiresAt: new Date(),
				transactionId: '',
				needsFullName: true,
				contactFound: Boolean(contact),
				payerNameHint: contact?.displayName,
			};
		}

		try {
			// Create payment session
			const sessionToken = nanoid(32);
			const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

			await this.prisma.paymentLinkSession.create({
				data: {
					paymentLinkId: link.id,
					sessionToken,
					payerTaxNumber: taxValidation.formatted,
					payerTaxNumberType: taxValidation.type === 'CPF' ? PixKeyType.CPF : PixKeyType.CNPJ,
					payerFullName: fullName || contact?.displayName,
					payerIdentityId: contact?.identity?.id,
					merchantContactId: contact?.id,
					expectedPayerTaxNumberHash: hashTaxNumber(taxValidation.formatted),
					expectedPayerTaxNumberMasked: maskTaxNumber(taxValidation.formatted),
					expectedPayerEuidHash: contact?.identity?.euid
						? hashEuid(contact.identity.euid)
						: null,
					amount,
					expiresAt,
				},
			});

			// Generate PIX QR Code with tax number
			this.logger.log(`🔗 PAYMENT LINK: Generating QR code with tax number for link ${link.id} (${link.shortCode})`);
			this.logger.log(`  Amount: ${amount}, Tax Number: ${taxValidation.type}`);

			const metadata = {
				paymentLinkId: link.id,
				shortCode: link.shortCode,
				payerTaxNumberMasked: maskTaxNumber(taxValidation.formatted),
				payerTaxNumberHash: hashTaxNumber(taxValidation.formatted),
				sessionToken,
				merchantContactId: contact?.id,
				expectedPayerIdentityId: contact?.identity?.id,
			};

			const qrCodeData = await this.pixService.generatePixQRCode(link.userId, {
				amount,
				depixAddress: link.walletAddress,
				description: link.description || `Pagamento ${shortCode}`,
				metadata,
				payerContactId: contact?.identity?.euid ? contact.id : undefined,
				payerTaxNumber: contact?.identity?.euid ? undefined : taxValidation.formatted,
				payerFullName: contact?.identity?.euid ? undefined : fullName,
			});

			// Update session with QR code
			await this.prisma.paymentLinkSession.update({
				where: { sessionToken },
				data: {
					qrCode: qrCodeData.qrCode,
					qrCodeGeneratedAt: new Date(),
				},
			});

			// Update link with new QR code
			await this.prisma.paymentLink.update({
				where: { id: link.id },
				data: {
					currentQrCode: qrCodeData.qrCode,
					qrCodeGeneratedAt: new Date(),
				},
			});

			// Trigger webhook with tax number info
			const webhookPayload = {
				paymentLinkId: link.id,
				shortCode: link.shortCode,
				amount,
				qrCode: qrCodeData.qrCode,
				walletAddress: link.walletAddress,
				description: link.description,
				expiresAt: expiresAt.toISOString(),
				generatedAt: new Date().toISOString(),
				payerTaxNumber: maskTaxNumber(taxValidation.formatted),
				payerTaxNumberType: taxValidation.type,
			};

			this.logger.log(`🎯 Triggering payment.created webhook with tax number for ${link.shortCode}`);

			// Fire and forget
			this.webhookService.triggerWebhooks(link.id, 'payment.created', webhookPayload)
				.catch(error => {
					this.logger.error('Webhook trigger failed:', error);
				});

			return {
				qrCode: qrCodeData.qrCode,
				expiresAt,
				transactionId: qrCodeData.transactionId || '',
				sessionToken,
				contactFound: Boolean(contact),
			};
		} catch (error) {
			this.logger.error(`Failed to generate QR code with tax number for ${shortCode}:`, error);
			if (error instanceof HttpException) {
				throw error;
			}
			throw new HttpException(
				'Falha ao gerar código de pagamento',
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async checkPaymentStatus(shortCode: string, transactionId: string): Promise<{ status: string; paid: boolean }> {
		try {
			const link = await this.prisma.paymentLink.findUnique({
				where: { shortCode },
				select: { id: true, userId: true },
			});

			if (!link) {
				return { status: 'not_found', paid: false };
			}

			const transaction = await this.prisma.transaction.findFirst({
				where: {
					OR: [
						{ id: transactionId },
						{ externalId: transactionId },
					],
					userId: link.userId,
				},
			});

			if (!transaction) {
				return { status: 'not_found', paid: false };
			}

			const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
			if (metadata.paymentLinkId !== link.id && metadata.shortCode !== shortCode) {
				return { status: 'not_found', paid: false };
			}

			const isPaid = transaction.status === 'COMPLETED';
			return {
				status: isPaid ? 'paid' : transaction.status.toLowerCase(),
				paid: isPaid,
			};
		} catch (error) {
			this.logger.error(`Error checking payment status for ${transactionId}:`, error);
			return { status: 'error', paid: false };
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
			requiresTaxNumber: link.requiresTaxNumber || false,
			minAmountForTaxNumber: link.minAmountForTaxNumber || 3000,
			createdAt: link.createdAt,
			updatedAt: link.updatedAt,
		};
	}
}
