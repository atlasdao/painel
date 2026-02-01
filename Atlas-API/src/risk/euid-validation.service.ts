import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockedEntityType, BlockReason, RiskEventType } from '@prisma/client';

export interface EuidValidationResult {
	isValid: boolean;
	isDuplicate: boolean;
	isBlocked: boolean;
	existingUserId?: string;
	existingUsername?: string;
	existingEmail?: string;
	blockReason?: string;
	errorMessage?: string;
}

@Injectable()
export class EuidValidationService {
	private readonly logger = new Logger(EuidValidationService.name);

	constructor(private prisma: PrismaService) {}

	/**
	 * Valida se um EUID (CPF/CNPJ) pode ser usado por um usuário
	 * Regra: Apenas 1 conta por CPF/CNPJ verificado
	 */
	async validateEuid(
		euid: string,
		requestingUserId: string,
	): Promise<EuidValidationResult> {
		// Remove formatação do EUID (pontos, traços, barras)
		const normalizedEuid = this.normalizeEuid(euid);

		// Verifica se o EUID está bloqueado
		const blocked = await this.isEuidBlocked(normalizedEuid);
		if (blocked.isBlocked) {
			return {
				isValid: false,
				isDuplicate: false,
				isBlocked: true,
				blockReason: blocked.reason,
				errorMessage: 'Este CPF/CNPJ está bloqueado. Entre em contato com o suporte.',
			};
		}

		// Verifica se já existe outro usuário com este EUID
		const existingUser = await this.prisma.user.findFirst({
			where: {
				verifiedTaxNumber: normalizedEuid,
				id: { not: requestingUserId }, // Exclui o próprio usuário
			},
			select: {
				id: true,
				username: true,
				email: true,
			},
		});

		if (existingUser) {
			// Registra evento de tentativa de duplicação
			await this.logDuplicateAttempt(normalizedEuid, requestingUserId, existingUser.id);

			return {
				isValid: false,
				isDuplicate: true,
				isBlocked: false,
				existingUserId: existingUser.id,
				existingUsername: this.maskUsername(existingUser.username),
				existingEmail: this.maskEmail(existingUser.email),
				errorMessage: 'Este CPF/CNPJ já está vinculado a outra conta.',
			};
		}

		return {
			isValid: true,
			isDuplicate: false,
			isBlocked: false,
		};
	}

	/**
	 * Verifica se um EUID está na lista de bloqueados
	 */
	async isEuidBlocked(
		euid: string,
	): Promise<{ isBlocked: boolean; reason?: string }> {
		const normalizedEuid = this.normalizeEuid(euid);

		const blocked = await this.prisma.blockedEntity.findFirst({
			where: {
				type: BlockedEntityType.EUID,
				value: normalizedEuid,
				isActive: true,
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
		});

		if (blocked) {
			return {
				isBlocked: true,
				reason: blocked.reasonDetails || this.getBlockReasonText(blocked.reason),
			};
		}

		return { isBlocked: false };
	}

	/**
	 * Bloqueia um EUID
	 */
	async blockEuid(params: {
		euid: string;
		reason: BlockReason;
		reasonDetails?: string;
		blockedBy?: string;
		expiresAt?: Date;
	}): Promise<void> {
		const normalizedEuid = this.normalizeEuid(params.euid);

		await this.prisma.blockedEntity.upsert({
			where: {
				type_value: {
					type: BlockedEntityType.EUID,
					value: normalizedEuid,
				},
			},
			create: {
				type: BlockedEntityType.EUID,
				value: normalizedEuid,
				reason: params.reason,
				reasonDetails: params.reasonDetails,
				blockedBy: params.blockedBy,
				isAutomatic: !params.blockedBy,
				expiresAt: params.expiresAt,
			},
			update: {
				reason: params.reason,
				reasonDetails: params.reasonDetails,
				blockedBy: params.blockedBy,
				isActive: true,
				expiresAt: params.expiresAt,
				blockedCount: { increment: 1 },
				lastBlockedAt: new Date(),
			},
		});

		this.logger.log(`EUID blocked: ${this.maskEuid(normalizedEuid)} - ${params.reason}`);
	}

	/**
	 * Desbloqueia um EUID
	 */
	async unblockEuid(euid: string): Promise<void> {
		const normalizedEuid = this.normalizeEuid(euid);

		await this.prisma.blockedEntity.updateMany({
			where: {
				type: BlockedEntityType.EUID,
				value: normalizedEuid,
			},
			data: { isActive: false },
		});

		this.logger.log(`EUID unblocked: ${this.maskEuid(normalizedEuid)}`);
	}

	/**
	 * Busca todas as contas vinculadas a um EUID
	 */
	async getAccountsByEuid(euid: string): Promise<any[]> {
		const normalizedEuid = this.normalizeEuid(euid);

		return this.prisma.user.findMany({
			where: { verifiedTaxNumber: normalizedEuid },
			select: {
				id: true,
				email: true,
				username: true,
				createdAt: true,
				isAccountValidated: true,
				isActive: true,
			},
		});
	}

	/**
	 * Verifica se é um CPF ou CNPJ válido (apenas formato)
	 */
	isValidEuidFormat(euid: string): boolean {
		const normalized = this.normalizeEuid(euid);
		return normalized.length === 11 || normalized.length === 14;
	}

	/**
	 * Determina se é CPF ou CNPJ
	 */
	getEuidType(euid: string): 'CPF' | 'CNPJ' | 'UNKNOWN' {
		const normalized = this.normalizeEuid(euid);
		if (normalized.length === 11) return 'CPF';
		if (normalized.length === 14) return 'CNPJ';
		return 'UNKNOWN';
	}

	/**
	 * Normaliza EUID removendo formatação
	 */
	private normalizeEuid(euid: string): string {
		// Remove prefixo EU se existir (formato Eulen)
		let normalized = euid.replace(/^EU0*/i, '');
		// Remove todos os caracteres não numéricos
		normalized = normalized.replace(/\D/g, '');
		return normalized;
	}

	/**
	 * Mascara username para exibição
	 */
	private maskUsername(username: string): string {
		if (username.length <= 3) return '***';
		return username.substring(0, 2) + '***' + username.substring(username.length - 1);
	}

	/**
	 * Mascara email para exibição
	 */
	private maskEmail(email: string): string {
		const [local, domain] = email.split('@');
		if (local.length <= 2) return '***@' + domain;
		return local.substring(0, 2) + '***@' + domain;
	}

	/**
	 * Mascara EUID para logs
	 */
	private maskEuid(euid: string): string {
		if (euid.length <= 4) return '****';
		return euid.substring(0, 3) + '***' + euid.substring(euid.length - 2);
	}

	/**
	 * Converte BlockReason para texto legível
	 */
	private getBlockReasonText(reason: BlockReason): string {
		const texts: Record<BlockReason, string> = {
			FRAUD_CONFIRMED: 'Fraude confirmada',
			FRAUD_SUSPECTED: 'Suspeita de fraude',
			CHARGEBACK: 'Chargeback registrado',
			MULTIPLE_ACCOUNTS: 'Múltiplas contas',
			SUSPICIOUS_BEHAVIOR: 'Comportamento suspeito',
			MANUAL_REVIEW: 'Bloqueio manual',
			TOR_EXIT_NODE: 'TOR detectado',
			DATACENTER_IP: 'IP de datacenter',
			BOT_DETECTED: 'Bot detectado',
		};
		return texts[reason] || reason;
	}

	/**
	 * Registra tentativa de usar EUID duplicado
	 */
	private async logDuplicateAttempt(
		euid: string,
		attemptingUserId: string,
		existingUserId: string,
	): Promise<void> {
		await this.prisma.riskEvent.create({
			data: {
				userId: attemptingUserId,
				eventType: RiskEventType.EUID_DUPLICATE,
				severity: 7, // Alta severidade
				riskScore: 50,
				details: JSON.stringify({
					attemptedEuid: this.maskEuid(euid),
					existingUserId,
				}),
				actionTaken: 'blocked',
			},
		});

		// Atualiza perfil de risco do usuário que tentou
		await this.prisma.riskProfile.upsert({
			where: { userId: attemptingUserId },
			create: {
				userId: attemptingUserId,
				requiresReview: true,
				hasMultipleAccounts: true,
				linkedAccountIds: [existingUserId],
				linkedReason: 'Attempted to use EUID already linked to another account',
			},
			update: {
				requiresReview: true,
				hasMultipleAccounts: true,
				linkedAccountIds: { push: existingUserId },
				linkedReason: 'Attempted to use EUID already linked to another account',
			},
		});
	}
}
