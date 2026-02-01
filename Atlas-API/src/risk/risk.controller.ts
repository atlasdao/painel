import {
	Controller,
	Post,
	Get,
	Put,
	Body,
	Param,
	Query,
	Req,
	HttpCode,
	HttpStatus,
	UseGuards,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FingerprintService, FingerprintData } from './fingerprint.service';
import { IpAnalysisService } from './ip-analysis.service';
import { RiskScoringService } from './risk-scoring.service';
import { EuidValidationService } from './euid-validation.service';
import { BlockedEntityService } from './blocked-entity.service';
import { VisitorSessionService, UpdateBehaviorParams } from './visitor-session.service';
import { BlockedEntityType, BlockReason, RiskStatus } from '@prisma/client';

// DTOs
interface CollectFingerprintDto {
	sessionToken: string;
	fingerprint: FingerprintData;
}

interface UpdateBehaviorDto {
	sessionToken: string;
	behavior: UpdateBehaviorParams;
}

interface BlockEntityDto {
	type: BlockedEntityType;
	value: string;
	reason: BlockReason;
	reasonDetails?: string;
	expiresAt?: string;
}

interface ReviewUserDto {
	notes: string;
	newStatus?: RiskStatus;
}

@Controller('risk')
export class RiskController {
	constructor(
		private fingerprintService: FingerprintService,
		private ipAnalysisService: IpAnalysisService,
		private riskScoringService: RiskScoringService,
		private euidValidationService: EuidValidationService,
		private blockedEntityService: BlockedEntityService,
		private visitorSessionService: VisitorSessionService,
	) {}

	// ==========================================
	// ENDPOINTS PÚBLICOS (para coleta de dados)
	// ==========================================

	/**
	 * Inicia uma sessão de visitante (chamado pelo frontend antes de qualquer ação)
	 */
	@Public()
	@Post('session/start')
	@HttpCode(HttpStatus.CREATED)
	async startSession(@Req() req: any) {
		const ipAddress = this.getClientIp(req);
		const userAgent = req.headers['user-agent'];
		const referrer = req.headers['referer'] as string;

		// Extrai UTM params da query string se disponível
		const url = new URL(req.url, `http://${req.headers.host}`);
		const utmSource = url.searchParams.get('utm_source') ?? undefined;
		const utmMedium = url.searchParams.get('utm_medium') ?? undefined;
		const utmCampaign = url.searchParams.get('utm_campaign') ?? undefined;

		const session = await this.visitorSessionService.createSession({
			ipAddress,
			userAgent,
			referrer,
			landingPage: req.url,
			utmSource,
			utmMedium,
			utmCampaign,
		});

		return {
			sessionToken: session.sessionToken,
			expiresAt: session.expiresAt,
		};
	}

	/**
	 * Coleta fingerprint do dispositivo
	 */
	@Public()
	@Post('collect/fingerprint')
	@HttpCode(HttpStatus.OK)
	async collectFingerprint(@Body() dto: CollectFingerprintDto, @Req() req: any) {
		// Verifica se sessão existe
		const session = await this.visitorSessionService.getSession(dto.sessionToken);
		if (!session) {
			return { success: false, error: 'Invalid session' };
		}

		// Cria ou atualiza fingerprint
		const fingerprint = await this.fingerprintService.upsertFingerprint(dto.fingerprint);

		// Vincula fingerprint à sessão
		await this.visitorSessionService.updateFingerprint(
			dto.sessionToken,
			fingerprint.id,
		);

		return {
			success: true,
			fingerprintId: fingerprint.id,
		};
	}

	/**
	 * Atualiza métricas comportamentais
	 */
	@Public()
	@Post('collect/behavior')
	@HttpCode(HttpStatus.OK)
	async collectBehavior(@Body() dto: UpdateBehaviorDto) {
		const session = await this.visitorSessionService.updateBehavior(
			dto.sessionToken,
			dto.behavior,
		);

		if (!session) {
			return { success: false, error: 'Invalid session' };
		}

		return {
			success: true,
			behaviorScore: session.behaviorScore,
		};
	}

	/**
	 * Analisa um IP (endpoint público para debugging/testing)
	 */
	@Public()
	@Get('analyze/ip')
	async analyzeIp(@Req() req: any) {
		const ip = this.getClientIp(req);
		const analysis = await this.ipAnalysisService.analyzeIp(ip);

		return {
			ip: analysis.ip,
			country: analysis.countryCode,
			city: analysis.city,
			isp: analysis.isp,
			isVpn: analysis.isVpn,
			isTor: analysis.isTor,
			isDatacenter: analysis.isDatacenter,
			riskScore: analysis.riskScore,
		};
	}

	// ==========================================
	// ENDPOINTS ADMIN (requer autenticação admin)
	// ==========================================

	/**
	 * Lista usuários que precisam de revisão
	 */
	@Get('admin/review-queue')
	@UseGuards(JwtAuthGuard, AdminGuard)
	async getReviewQueue(@Query('limit') limit?: string) {
		const users = await this.riskScoringService.getUsersRequiringReview(
			limit ? parseInt(limit, 10) : 50,
		);

		return {
			count: users.length,
			users: users.map((profile) => ({
				userId: profile.userId,
				email: profile.user?.email,
				username: profile.user?.username,
				createdAt: profile.user?.createdAt,
				isValidated: profile.user?.isAccountValidated,
				verifiedTaxNumber: profile.user?.verifiedTaxNumber
					? this.maskTaxNumber(profile.user.verifiedTaxNumber)
					: null,
				riskStatus: profile.status,
				overallScore: profile.overallScore,
				flags: {
					hasMultipleAccounts: profile.hasMultipleAccounts,
					hasSuspiciousDevice: profile.hasSuspiciousDevice,
					hasSuspiciousIp: profile.hasSuspiciousIp,
					hasAnomalousBehavior: profile.hasAnomalousBehavior,
					hasFraudHistory: profile.hasFraudHistory,
				},
				linkedAccounts: profile.linkedAccountIds,
				linkedReason: profile.linkedReason,
			})),
		};
	}

	/**
	 * Visualiza perfil de risco de um usuário
	 */
	@Get('admin/user/:userId')
	@UseGuards(JwtAuthGuard, AdminGuard)
	async getUserRiskProfile(@Param('userId') userId: string) {
		const [fingerprints, sessions] = await Promise.all([
			this.fingerprintService.getFingerprintsByUser(userId),
			this.visitorSessionService.getSessionsByUser(userId),
		]);

		return {
			devices: fingerprints.map((device) => ({
				id: device.id,
				fingerprintId: device.fingerprintId,
				browserName: device.browserName,
				osName: device.osName,
				deviceType: device.deviceType,
				isTrusted: device.isTrusted,
				trustScore: device.trustScore,
				firstSeenAt: device.firstSeenAt,
				lastSeenAt: device.lastSeenAt,
				loginCount: device.loginCount,
				fingerprint: {
					visitorId: device.fingerprint.visitorId.substring(0, 8) + '...',
					isBot: device.fingerprint.isBot,
					botScore: device.fingerprint.botScore,
					isIncognito: device.fingerprint.isIncognito,
					hasLied:
						device.fingerprint.hasLiedBrowser ||
						device.fingerprint.hasLiedOs ||
						device.fingerprint.hasLiedResolution,
				},
			})),
			sessions: sessions.slice(0, 20).map((session) => ({
				id: session.id,
				ipAddress: session.ipAddress,
				ipCountry: session.ipCountry,
				ipCity: session.ipCity,
				ipOrg: session.ipOrg,
				isVpn: session.isVpn,
				isTor: session.isTor,
				isDatacenter: session.isDatacenter,
				ipRiskScore: session.ipRiskScore,
				behaviorScore: session.behaviorScore,
				sessionDuration: session.sessionDuration,
				hasLoggedIn: session.hasLoggedIn,
				hasTransacted: session.hasTransacted,
				createdAt: session.createdAt,
			})),
		};
	}

	/**
	 * Marca usuário como revisado
	 */
	@Put('admin/review/:userId')
	@UseGuards(JwtAuthGuard, AdminGuard)
	async reviewUser(
		@Param('userId') userId: string,
		@Body() dto: ReviewUserDto,
		@Req() req: any,
	) {
		const adminId = req.user?.id;

		await this.riskScoringService.markAsReviewed(
			userId,
			adminId,
			dto.notes,
			dto.newStatus,
		);

		return { success: true, message: 'User reviewed successfully' };
	}

	/**
	 * Bloqueia uma entidade
	 */
	@Post('admin/block')
	@UseGuards(JwtAuthGuard, AdminGuard)
	async blockEntity(@Body() dto: BlockEntityDto, @Req() req: any) {
		const adminId = req.user?.id;

		await this.blockedEntityService.block({
			type: dto.type,
			value: dto.value,
			reason: dto.reason,
			reasonDetails: dto.reasonDetails,
			blockedBy: adminId,
			expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
		});

		return { success: true, message: 'Entity blocked successfully' };
	}

	/**
	 * Desbloqueia uma entidade
	 */
	@Put('admin/unblock/:type/:value')
	@UseGuards(JwtAuthGuard, AdminGuard)
	async unblockEntity(
		@Param('type') type: BlockedEntityType,
		@Param('value') value: string,
	) {
		await this.blockedEntityService.unblock(type, value);
		return { success: true, message: 'Entity unblocked successfully' };
	}

	/**
	 * Lista entidades bloqueadas
	 */
	@Get('admin/blocked')
	@UseGuards(JwtAuthGuard, AdminGuard)
	async getBlockedEntities(
		@Query('type') type?: BlockedEntityType,
		@Query('limit') limit?: string,
		@Query('offset') offset?: string,
	) {
		if (type) {
			const entities = await this.blockedEntityService.getBlockedByType(type, {
				limit: limit ? parseInt(limit, 10) : 100,
				offset: offset ? parseInt(offset, 10) : 0,
			});
			return { type, count: entities.length, entities };
		}

		// Retorna contagem por tipo
		const counts = await this.blockedEntityService.countBlockedByType();
		return { counts };
	}

	/**
	 * Estatísticas do sistema de risco
	 */
	@Get('admin/stats')
	@UseGuards(JwtAuthGuard, AdminGuard)
	async getStats() {
		const [sessionStats, ipCacheStats, blockCounts] = await Promise.all([
			this.visitorSessionService.getStats(),
			this.ipAnalysisService.getCacheStats(),
			this.blockedEntityService.countBlockedByType(),
		]);

		return {
			sessions: sessionStats,
			ipCache: ipCacheStats,
			blockedEntities: blockCounts,
		};
	}

	/**
	 * Valida EUID (usado internamente e por admin)
	 */
	@Get('admin/validate-euid/:euid/:userId')
	@UseGuards(JwtAuthGuard, AdminGuard)
	async validateEuid(@Param('euid') euid: string, @Param('userId') userId: string) {
		const result = await this.euidValidationService.validateEuid(euid, userId);
		return result;
	}

	// ==========================================
	// HELPERS
	// ==========================================

	/**
	 * Extrai IP real do cliente (considera proxies/load balancers)
	 */
	private getClientIp(req: any): string {
		const forwarded = req.headers['x-forwarded-for'];
		if (forwarded) {
			const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
			return ips.split(',')[0].trim();
		}
		const realIp = req.headers['x-real-ip'];
		if (realIp) {
			return Array.isArray(realIp) ? realIp[0] : realIp;
		}
		return req.ip || req.socket?.remoteAddress || '0.0.0.0';
	}

	/**
	 * Mascara CPF/CNPJ para exibição
	 */
	private maskTaxNumber(taxNumber: string): string {
		if (taxNumber.length <= 4) return '****';
		return taxNumber.substring(0, 3) + '***' + taxNumber.substring(taxNumber.length - 2);
	}
}
