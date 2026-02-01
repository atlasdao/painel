import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockedEntityType, BlockReason, BlockedEntity } from '@prisma/client';

export interface BlockCheck {
	isBlocked: boolean;
	type?: BlockedEntityType;
	reason?: BlockReason;
	reasonDetails?: string;
	expiresAt?: Date;
}

@Injectable()
export class BlockedEntityService {
	private readonly logger = new Logger(BlockedEntityService.name);

	// Cache para verificações rápidas (5 minutos)
	private readonly blockCache = new Map<
		string,
		{ result: boolean; timestamp: number }
	>();
	private readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutos

	constructor(private prisma: PrismaService) {}

	/**
	 * Verifica se uma entidade está bloqueada
	 */
	async isBlocked(type: BlockedEntityType, value: string): Promise<BlockCheck> {
		const cacheKey = `${type}:${value}`;

		// Verifica cache
		const cached = this.blockCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return { isBlocked: cached.result };
		}

		const blocked = await this.prisma.blockedEntity.findFirst({
			where: {
				type,
				value,
				isActive: true,
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
		});

		const result = !!blocked;
		this.blockCache.set(cacheKey, { result, timestamp: Date.now() });

		if (blocked) {
			return {
				isBlocked: true,
				type: blocked.type,
				reason: blocked.reason,
				reasonDetails: blocked.reasonDetails ?? undefined,
				expiresAt: blocked.expiresAt ?? undefined,
			};
		}

		return { isBlocked: false };
	}

	/**
	 * Verifica múltiplas entidades de uma vez
	 */
	async checkMultiple(checks: { type: BlockedEntityType; value: string }[]): Promise<BlockCheck[]> {
		return Promise.all(checks.map((check) => this.isBlocked(check.type, check.value)));
	}

	/**
	 * Bloqueia uma entidade
	 */
	async block(params: {
		type: BlockedEntityType;
		value: string;
		reason: BlockReason;
		reasonDetails?: string;
		blockedBy?: string;
		expiresAt?: Date;
	}): Promise<BlockedEntity> {
		// Invalida cache
		this.blockCache.delete(`${params.type}:${params.value}`);

		return this.prisma.blockedEntity.upsert({
			where: {
				type_value: {
					type: params.type,
					value: params.value,
				},
			},
			create: {
				type: params.type,
				value: params.value,
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
	}

	/**
	 * Desbloqueia uma entidade
	 */
	async unblock(type: BlockedEntityType, value: string): Promise<void> {
		// Invalida cache
		this.blockCache.delete(`${type}:${value}`);

		await this.prisma.blockedEntity.updateMany({
			where: { type, value },
			data: { isActive: false },
		});
	}

	/**
	 * Busca todas as entidades bloqueadas por tipo
	 */
	async getBlockedByType(
		type: BlockedEntityType,
		options?: { limit?: number; offset?: number; includeExpired?: boolean },
	): Promise<BlockedEntity[]> {
		const where: any = { type };

		if (!options?.includeExpired) {
			where.isActive = true;
			where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
		}

		return this.prisma.blockedEntity.findMany({
			where,
			orderBy: { lastBlockedAt: 'desc' },
			take: options?.limit ?? 100,
			skip: options?.offset ?? 0,
		});
	}

	/**
	 * Conta entidades bloqueadas por tipo
	 */
	async countBlockedByType(): Promise<Record<BlockedEntityType, number>> {
		const counts = await this.prisma.blockedEntity.groupBy({
			by: ['type'],
			where: {
				isActive: true,
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
			_count: true,
		});

		const result: Record<string, number> = {};
		for (const type of Object.values(BlockedEntityType)) {
			result[type] = 0;
		}
		for (const count of counts) {
			result[count.type] = count._count;
		}

		return result as Record<BlockedEntityType, number>;
	}

	/**
	 * Bloqueia IP
	 */
	async blockIp(
		ip: string,
		reason: BlockReason,
		reasonDetails?: string,
		blockedBy?: string,
	): Promise<void> {
		await this.block({
			type: BlockedEntityType.IP_ADDRESS,
			value: ip,
			reason,
			reasonDetails,
			blockedBy,
		});
		this.logger.log(`IP blocked: ${ip} - ${reason}`);
	}

	/**
	 * Bloqueia fingerprint
	 */
	async blockFingerprint(
		visitorId: string,
		reason: BlockReason,
		reasonDetails?: string,
		blockedBy?: string,
	): Promise<void> {
		await this.block({
			type: BlockedEntityType.FINGERPRINT,
			value: visitorId,
			reason,
			reasonDetails,
			blockedBy,
		});
		this.logger.log(`Fingerprint blocked: ${visitorId.substring(0, 8)}... - ${reason}`);
	}

	/**
	 * Bloqueia ASN inteiro
	 */
	async blockAsn(
		asn: number,
		reason: BlockReason,
		reasonDetails?: string,
		blockedBy?: string,
	): Promise<void> {
		await this.block({
			type: BlockedEntityType.ASN,
			value: asn.toString(),
			reason,
			reasonDetails,
			blockedBy,
		});
		this.logger.log(`ASN blocked: ${asn} - ${reason}`);
	}

	/**
	 * Verifica se um IP está bloqueado (direto ou via ASN)
	 */
	async isIpBlocked(ip: string, asn?: number): Promise<BlockCheck> {
		// Verifica IP direto
		const ipBlock = await this.isBlocked(BlockedEntityType.IP_ADDRESS, ip);
		if (ipBlock.isBlocked) return ipBlock;

		// Verifica ASN se fornecido
		if (asn) {
			const asnBlock = await this.isBlocked(BlockedEntityType.ASN, asn.toString());
			if (asnBlock.isBlocked) return asnBlock;
		}

		return { isBlocked: false };
	}

	/**
	 * Limpa entidades expiradas
	 */
	async cleanupExpired(): Promise<number> {
		const result = await this.prisma.blockedEntity.updateMany({
			where: {
				expiresAt: { lt: new Date() },
				isActive: true,
			},
			data: { isActive: false },
		});

		if (result.count > 0) {
			this.logger.log(`Cleaned up ${result.count} expired blocked entities`);
		}

		return result.count;
	}

	/**
	 * Limpa o cache
	 */
	clearCache(): void {
		this.blockCache.clear();
	}

	/**
	 * Estatísticas do cache
	 */
	getCacheStats(): { size: number } {
		return { size: this.blockCache.size };
	}
}
