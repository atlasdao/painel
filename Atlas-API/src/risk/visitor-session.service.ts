import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisitorSession } from '@prisma/client';
import { IpAnalysisService, IpAnalysisResult } from './ip-analysis.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateSessionParams {
	ipAddress: string;
	userAgent?: string;
	fingerprintId?: string;
	referrer?: string;
	landingPage?: string;
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
}

export interface UpdateBehaviorParams {
	mouseMovements?: number;
	keystrokes?: number;
	scrollEvents?: number;
	clickEvents?: number;
	touchEvents?: number;
	sessionDuration?: number;
	pagesVisited?: number;
	avgMouseSpeed?: number;
	avgKeystrokeDelay?: number;
}

@Injectable()
export class VisitorSessionService {
	private readonly logger = new Logger(VisitorSessionService.name);
	private readonly SESSION_TTL_HOURS = 24;

	constructor(
		private prisma: PrismaService,
		private ipAnalysisService: IpAnalysisService,
	) {}

	/**
	 * Cria uma nova sessão de visitante
	 */
	async createSession(params: CreateSessionParams): Promise<VisitorSession> {
		const sessionToken = uuidv4();
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + this.SESSION_TTL_HOURS);

		// Analisa o IP
		let ipAnalysis: IpAnalysisResult | null = null;
		try {
			ipAnalysis = await this.ipAnalysisService.analyzeIp(params.ipAddress);
		} catch (error) {
			this.logger.warn(`Failed to analyze IP ${params.ipAddress}`, error);
		}

		return this.prisma.visitorSession.create({
			data: {
				sessionToken,
				fingerprintId: params.fingerprintId,
				ipAddress: params.ipAddress,
				ipCountry: ipAnalysis?.countryCode,
				ipCity: ipAnalysis?.city,
				ipRegion: ipAnalysis?.region,
				ipAsn: ipAnalysis?.asn,
				ipOrg: ipAnalysis?.org,
				ipIsp: ipAnalysis?.isp,
				isVpn: ipAnalysis?.isVpn ?? false,
				isTor: ipAnalysis?.isTor ?? false,
				isProxy: ipAnalysis?.isProxy ?? false,
				isDatacenter: ipAnalysis?.isDatacenter ?? false,
				isMobile: ipAnalysis?.isMobile ?? false,
				ipRiskScore: ipAnalysis?.riskScore ?? 0,
				userAgent: params.userAgent,
				referrer: params.referrer,
				landingPage: params.landingPage,
				utmSource: params.utmSource,
				utmMedium: params.utmMedium,
				utmCampaign: params.utmCampaign,
				expiresAt,
			},
		});
	}

	/**
	 * Busca sessão por token
	 */
	async getSession(sessionToken: string): Promise<VisitorSession | null> {
		return this.prisma.visitorSession.findUnique({
			where: { sessionToken },
		});
	}

	/**
	 * Atualiza métricas comportamentais da sessão
	 */
	async updateBehavior(
		sessionToken: string,
		behavior: UpdateBehaviorParams,
	): Promise<VisitorSession | null> {
		const session = await this.getSession(sessionToken);
		if (!session) return null;

		// Calcula score comportamental
		const behaviorScore = this.calculateBehaviorScore({
			...session,
			...behavior,
		});

		return this.prisma.visitorSession.update({
			where: { sessionToken },
			data: {
				mouseMovements: behavior.mouseMovements ?? session.mouseMovements,
				keystrokes: behavior.keystrokes ?? session.keystrokes,
				scrollEvents: behavior.scrollEvents ?? session.scrollEvents,
				clickEvents: behavior.clickEvents ?? session.clickEvents,
				touchEvents: behavior.touchEvents ?? session.touchEvents,
				sessionDuration: behavior.sessionDuration ?? session.sessionDuration,
				pagesVisited: behavior.pagesVisited ?? session.pagesVisited,
				avgMouseSpeed: behavior.avgMouseSpeed ?? session.avgMouseSpeed,
				avgKeystrokeDelay: behavior.avgKeystrokeDelay ?? session.avgKeystrokeDelay,
				behaviorScore,
			},
		});
	}

	/**
	 * Vincula sessão a um usuário (após login/registro)
	 */
	async linkToUser(sessionToken: string, userId: string): Promise<void> {
		await this.prisma.visitorSession.updateMany({
			where: { sessionToken },
			data: {
				userId,
				hasLoggedIn: true,
			},
		});
	}

	/**
	 * Marca sessão como tendo registrado
	 */
	async markRegistered(sessionToken: string): Promise<void> {
		await this.prisma.visitorSession.updateMany({
			where: { sessionToken },
			data: { hasRegistered: true },
		});
	}

	/**
	 * Marca sessão como tendo validado conta
	 */
	async markValidated(sessionToken: string): Promise<void> {
		await this.prisma.visitorSession.updateMany({
			where: { sessionToken },
			data: { hasValidated: true },
		});
	}

	/**
	 * Marca sessão como tendo feito transação
	 */
	async markTransacted(sessionToken: string): Promise<void> {
		await this.prisma.visitorSession.updateMany({
			where: { sessionToken },
			data: { hasTransacted: true },
		});
	}

	/**
	 * Atualiza fingerprint da sessão
	 */
	async updateFingerprint(sessionToken: string, fingerprintId: string): Promise<void> {
		await this.prisma.visitorSession.updateMany({
			where: { sessionToken },
			data: { fingerprintId },
		});
	}

	/**
	 * Busca sessões por fingerprint
	 */
	async getSessionsByFingerprint(fingerprintId: string): Promise<VisitorSession[]> {
		return this.prisma.visitorSession.findMany({
			where: { fingerprintId },
			orderBy: { createdAt: 'desc' },
		});
	}

	/**
	 * Busca sessões por IP
	 */
	async getSessionsByIp(ipAddress: string): Promise<VisitorSession[]> {
		return this.prisma.visitorSession.findMany({
			where: { ipAddress },
			orderBy: { createdAt: 'desc' },
		});
	}

	/**
	 * Busca sessões por usuário
	 */
	async getSessionsByUser(userId: string): Promise<VisitorSession[]> {
		return this.prisma.visitorSession.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
		});
	}

	/**
	 * Calcula score comportamental (0-100, maior = mais confiável)
	 */
	private calculateBehaviorScore(data: Partial<VisitorSession>): number {
		let score = 50; // Base

		// Movimentos de mouse
		if ((data.mouseMovements ?? 0) > 100) score += 10;
		else if ((data.mouseMovements ?? 0) < 5) score -= 15;

		// Teclas digitadas
		if ((data.keystrokes ?? 0) > 20) score += 10;
		else if ((data.keystrokes ?? 0) < 3) score -= 10;

		// Scroll events
		if ((data.scrollEvents ?? 0) > 5) score += 5;

		// Cliques
		if ((data.clickEvents ?? 0) > 3) score += 5;

		// Duração da sessão
		if ((data.sessionDuration ?? 0) > 120) score += 10; // > 2 min
		else if ((data.sessionDuration ?? 0) < 10) score -= 20; // < 10 sec

		// Páginas visitadas
		if ((data.pagesVisited ?? 0) > 2) score += 5;

		// Velocidade do mouse suspeita
		if (data.avgMouseSpeed && data.avgMouseSpeed > 5000) {
			score -= 20; // Muito rápido = bot
		}

		// Digitação suspeita
		if (data.avgKeystrokeDelay && data.avgKeystrokeDelay < 20) {
			score -= 15; // Muito rápido = bot/paste
		}

		// Touch events (bom indicador de mobile real)
		if ((data.touchEvents ?? 0) > 0) score += 5;

		return Math.max(0, Math.min(100, score));
	}

	/**
	 * Limpa sessões expiradas
	 */
	async cleanupExpired(): Promise<number> {
		const result = await this.prisma.visitorSession.deleteMany({
			where: {
				expiresAt: { lt: new Date() },
			},
		});

		if (result.count > 0) {
			this.logger.log(`Cleaned up ${result.count} expired visitor sessions`);
		}

		return result.count;
	}

	/**
	 * Estatísticas de sessões
	 */
	async getStats(): Promise<{
		total: number;
		activeToday: number;
		withFingerprint: number;
		withUser: number;
		suspicious: number;
	}> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const [total, activeToday, withFingerprint, withUser, suspicious] =
			await Promise.all([
				this.prisma.visitorSession.count(),
				this.prisma.visitorSession.count({
					where: { createdAt: { gte: today } },
				}),
				this.prisma.visitorSession.count({
					where: { fingerprintId: { not: null } },
				}),
				this.prisma.visitorSession.count({
					where: { userId: { not: null } },
				}),
				this.prisma.visitorSession.count({
					where: {
						OR: [{ isTor: true }, { isDatacenter: true }, { behaviorScore: { lt: 30 } }],
					},
				}),
			]);

		return { total, activeToday, withFingerprint, withUser, suspicious };
	}
}
