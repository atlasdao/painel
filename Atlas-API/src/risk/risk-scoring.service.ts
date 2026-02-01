import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskStatus, RiskEventType, DeviceFingerprint } from '@prisma/client';
import { FingerprintService } from './fingerprint.service';
import { IpAnalysisService, IpAnalysisResult } from './ip-analysis.service';

export interface RiskAssessment {
	overallScore: number;
	status: RiskStatus;
	deviceScore: number;
	ipScore: number;
	behaviorScore: number;
	transactionScore: number;
	identityScore: number;
	flags: {
		hasMultipleAccounts: boolean;
		hasSuspiciousDevice: boolean;
		hasSuspiciousIp: boolean;
		hasAnomalousBehavior: boolean;
		hasFraudHistory: boolean;
	};
	requiresReview: boolean;
	reasons: string[];
}

export interface BehaviorMetrics {
	mouseMovements: number;
	keystrokes: number;
	scrollEvents: number;
	clickEvents: number;
	touchEvents: number;
	sessionDuration: number;
	pagesVisited: number;
	avgMouseSpeed?: number;
	avgKeystrokeDelay?: number;
}

// Thresholds calibrados para público focado em privacidade
const THRESHOLDS = {
	// Scores de risco (0-100)
	LOW_RISK_MAX: 25,
	MEDIUM_RISK_MAX: 50,
	HIGH_RISK_MAX: 75,
	// Comportamento mínimo esperado de humano
	MIN_MOUSE_MOVEMENTS: 5,
	MIN_KEYSTROKES: 3,
	MIN_SESSION_DURATION: 10, // segundos
	// Bot detection
	BOT_SCORE_THRESHOLD: 0.7,
	// Velocidade suspeita
	SUSPICIOUS_MOUSE_SPEED: 5000, // pixels/segundo (muito rápido = bot)
	SUSPICIOUS_KEYSTROKE_DELAY: 20, // ms (muito rápido = bot/paste)
};

@Injectable()
export class RiskScoringService {
	private readonly logger = new Logger(RiskScoringService.name);

	constructor(
		private prisma: PrismaService,
		private fingerprintService: FingerprintService,
		private ipAnalysisService: IpAnalysisService,
	) {}

	/**
	 * Calcula o risco geral de um usuário/sessão
	 */
	async assessRisk(params: {
		userId?: string;
		fingerprint?: DeviceFingerprint;
		ipAnalysis?: IpAnalysisResult;
		behavior?: BehaviorMetrics;
		isNewUser?: boolean;
		transactionAmount?: number;
	}): Promise<RiskAssessment> {
		const reasons: string[] = [];
		const flags = {
			hasMultipleAccounts: false,
			hasSuspiciousDevice: false,
			hasSuspiciousIp: false,
			hasAnomalousBehavior: false,
			hasFraudHistory: false,
		};

		// === DEVICE SCORE ===
		let deviceScore = 0;
		if (params.fingerprint) {
			const suspiciousResult = this.fingerprintService.isSuspiciousFingerprint(
				params.fingerprint,
			);
			if (suspiciousResult.suspicious) {
				deviceScore += 30;
				flags.hasSuspiciousDevice = true;
				reasons.push(...suspiciousResult.reasons);
			}

			// Verifica múltiplas contas no mesmo dispositivo
			const multipleAccounts = await this.fingerprintService.hasMultipleAccounts(
				params.fingerprint.id,
			);
			if (multipleAccounts.hasMultiple) {
				const extraScore = Math.min((multipleAccounts.accountCount - 1) * 15, 45);
				deviceScore += extraScore;
				flags.hasMultipleAccounts = true;
				reasons.push(
					`Device used by ${multipleAccounts.accountCount} accounts`,
				);
			}

			// Bot score
			if (params.fingerprint.botScore > THRESHOLDS.BOT_SCORE_THRESHOLD) {
				deviceScore += 40;
				reasons.push(`High bot probability: ${(params.fingerprint.botScore * 100).toFixed(1)}%`);
			}
		}

		// === IP SCORE ===
		let ipScore = 0;
		if (params.ipAnalysis) {
			// Score base do IP
			ipScore = params.ipAnalysis.riskScore;
			flags.hasSuspiciousIp =
				params.ipAnalysis.isTor ||
				params.ipAnalysis.isDatacenter ||
				params.ipAnalysis.riskScore > 30;

			if (params.ipAnalysis.riskReasons.length > 0) {
				reasons.push(...params.ipAnalysis.riskReasons);
			}
		}

		// === BEHAVIOR SCORE ===
		let behaviorScore = 0;
		if (params.behavior) {
			behaviorScore = this.calculateBehaviorScore(params.behavior);
			if (behaviorScore > 30) {
				flags.hasAnomalousBehavior = true;
				reasons.push('Suspicious behavior patterns detected');
			}
		}

		// === TRANSACTION SCORE ===
		let transactionScore = 0;
		if (params.isNewUser && params.transactionAmount) {
			// Novo usuário com transação alta = suspeito
			if (params.transactionAmount > 5000) {
				transactionScore = 20;
				reasons.push(`High value transaction for new user: R$${params.transactionAmount}`);
			} else if (params.transactionAmount > 2000) {
				transactionScore = 10;
			}
		}

		// === IDENTITY SCORE ===
		let identityScore = 0;
		if (params.userId) {
			// Verifica histórico de fraude
			const fraudHistory = await this.checkFraudHistory(params.userId);
			if (fraudHistory.hasFraud) {
				identityScore = 80;
				flags.hasFraudHistory = true;
				reasons.push(`Fraud history: ${fraudHistory.reason}`);
			}
		}

		// === CÁLCULO FINAL ===
		// Pesos ajustados para público focado em privacidade
		const weights = {
			device: 0.25, // 25%
			ip: 0.15, // 15% (menor peso - muitos usam VPN legitimamente)
			behavior: 0.30, // 30%
			transaction: 0.10, // 10%
			identity: 0.20, // 20%
		};

		const overallScore = Math.round(
			deviceScore * weights.device +
				ipScore * weights.ip +
				behaviorScore * weights.behavior +
				transactionScore * weights.transaction +
				identityScore * weights.identity,
		);

		// Determina status
		let status: RiskStatus;
		let requiresReview = false;

		if (flags.hasFraudHistory) {
			status = RiskStatus.BLOCKED;
		} else if (overallScore > THRESHOLDS.HIGH_RISK_MAX) {
			status = RiskStatus.HIGH_RISK;
			requiresReview = true;
		} else if (overallScore > THRESHOLDS.MEDIUM_RISK_MAX) {
			status = RiskStatus.MEDIUM_RISK;
			requiresReview = overallScore > 60;
		} else if (overallScore > THRESHOLDS.LOW_RISK_MAX) {
			status = RiskStatus.LOW_RISK;
		} else {
			status = RiskStatus.CLEAR;
		}

		return {
			overallScore,
			status,
			deviceScore,
			ipScore,
			behaviorScore,
			transactionScore,
			identityScore,
			flags,
			requiresReview,
			reasons,
		};
	}

	/**
	 * Calcula score de comportamento
	 */
	private calculateBehaviorScore(behavior: BehaviorMetrics): number {
		let score = 0;
		const reasons: string[] = [];

		// Muito pouco movimento de mouse (pode ser bot)
		if (behavior.mouseMovements < THRESHOLDS.MIN_MOUSE_MOVEMENTS) {
			score += 15;
			reasons.push('Low mouse activity');
		}

		// Muito pouca digitação
		if (behavior.keystrokes < THRESHOLDS.MIN_KEYSTROKES) {
			score += 10;
			reasons.push('Low keyboard activity');
		}

		// Sessão muito curta
		if (behavior.sessionDuration < THRESHOLDS.MIN_SESSION_DURATION) {
			score += 20;
			reasons.push('Very short session');
		}

		// Velocidade de mouse suspeita (muito rápido = automação)
		if (
			behavior.avgMouseSpeed &&
			behavior.avgMouseSpeed > THRESHOLDS.SUSPICIOUS_MOUSE_SPEED
		) {
			score += 25;
			reasons.push('Abnormally fast mouse movements');
		}

		// Digitação muito rápida (bot ou paste)
		if (
			behavior.avgKeystrokeDelay &&
			behavior.avgKeystrokeDelay < THRESHOLDS.SUSPICIOUS_KEYSTROKE_DELAY
		) {
			score += 20;
			reasons.push('Abnormally fast typing');
		}

		// Sem eventos de scroll ou click (suspeito)
		if (behavior.scrollEvents === 0 && behavior.clickEvents === 0) {
			score += 15;
			reasons.push('No scroll or click events');
		}

		// Mobile sem touch events é suspeito
		if (behavior.touchEvents === 0 && behavior.mouseMovements === 0) {
			// Pode ser mobile sem touch ou automação
			score += 10;
		}

		return Math.min(score, 100);
	}

	/**
	 * Verifica histórico de fraude do usuário
	 */
	private async checkFraudHistory(
		userId: string,
	): Promise<{ hasFraud: boolean; reason?: string }> {
		// Verifica se tem RiskProfile com fraude
		const profile = await this.prisma.riskProfile.findUnique({
			where: { userId },
		});

		if (profile?.hasFraudHistory) {
			return { hasFraud: true, reason: 'Previous fraud confirmed' };
		}

		if (profile?.status === RiskStatus.BLOCKED) {
			return { hasFraud: true, reason: 'Account blocked' };
		}

		// Verifica eventos de fraude
		const fraudEvents = await this.prisma.riskEvent.count({
			where: {
				userId,
				eventType: RiskEventType.FRAUD_ATTEMPT,
			},
		});

		if (fraudEvents > 0) {
			return { hasFraud: true, reason: `${fraudEvents} fraud attempts detected` };
		}

		return { hasFraud: false };
	}

	/**
	 * Atualiza ou cria o perfil de risco do usuário
	 */
	async updateRiskProfile(
		userId: string,
		assessment: RiskAssessment,
	): Promise<void> {
		await this.prisma.riskProfile.upsert({
			where: { userId },
			create: {
				userId,
				status: assessment.status,
				overallScore: assessment.overallScore,
				deviceScore: assessment.deviceScore,
				ipScore: assessment.ipScore,
				behaviorScore: assessment.behaviorScore,
				transactionScore: assessment.transactionScore,
				identityScore: assessment.identityScore,
				hasMultipleAccounts: assessment.flags.hasMultipleAccounts,
				hasSuspiciousDevice: assessment.flags.hasSuspiciousDevice,
				hasSuspiciousIp: assessment.flags.hasSuspiciousIp,
				hasAnomalousBehavior: assessment.flags.hasAnomalousBehavior,
				hasFraudHistory: assessment.flags.hasFraudHistory,
				requiresReview: assessment.requiresReview,
				lastAnalyzedAt: new Date(),
			},
			update: {
				status: assessment.status,
				overallScore: assessment.overallScore,
				deviceScore: assessment.deviceScore,
				ipScore: assessment.ipScore,
				behaviorScore: assessment.behaviorScore,
				transactionScore: assessment.transactionScore,
				identityScore: assessment.identityScore,
				hasMultipleAccounts: assessment.flags.hasMultipleAccounts,
				hasSuspiciousDevice: assessment.flags.hasSuspiciousDevice,
				hasSuspiciousIp: assessment.flags.hasSuspiciousIp,
				hasAnomalousBehavior: assessment.flags.hasAnomalousBehavior,
				hasFraudHistory: assessment.flags.hasFraudHistory,
				requiresReview: assessment.requiresReview,
				lastAnalyzedAt: new Date(),
			},
		});
	}

	/**
	 * Registra um evento de risco
	 */
	async logRiskEvent(params: {
		userId?: string;
		sessionId?: string;
		fingerprintId?: string;
		ipAddress?: string;
		eventType: RiskEventType;
		severity: number;
		riskScore: number;
		details?: string;
		actionTaken?: string;
	}): Promise<void> {
		await this.prisma.riskEvent.create({
			data: {
				userId: params.userId,
				sessionId: params.sessionId,
				fingerprintId: params.fingerprintId,
				ipAddress: params.ipAddress,
				eventType: params.eventType,
				severity: params.severity,
				riskScore: params.riskScore,
				details: params.details,
				actionTaken: params.actionTaken,
			},
		});
	}

	/**
	 * Busca usuários que precisam de revisão
	 */
	async getUsersRequiringReview(limit = 50): Promise<any[]> {
		return this.prisma.riskProfile.findMany({
			where: { requiresReview: true, reviewedAt: null },
			include: {
				user: {
					select: {
						id: true,
						email: true,
						username: true,
						createdAt: true,
						isAccountValidated: true,
						verifiedTaxNumber: true,
					},
				},
			},
			orderBy: { overallScore: 'desc' },
			take: limit,
		});
	}

	/**
	 * Marca um perfil como revisado
	 */
	async markAsReviewed(
		userId: string,
		reviewedBy: string,
		notes: string,
		newStatus?: RiskStatus,
	): Promise<void> {
		await this.prisma.riskProfile.update({
			where: { userId },
			data: {
				requiresReview: false,
				reviewedAt: new Date(),
				reviewedBy,
				reviewNotes: notes,
				status: newStatus,
			},
		});
	}
}
