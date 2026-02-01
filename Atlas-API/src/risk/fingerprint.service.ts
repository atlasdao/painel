import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceFingerprint, UserDevice } from '@prisma/client';

export interface FingerprintData {
	visitorId: string;
	canvasHash?: string;
	webglHash?: string;
	audioHash?: string;
	screenResolution?: string;
	colorDepth?: number;
	timezone?: string;
	timezoneOffset?: number;
	language?: string;
	platform?: string;
	hardwareConcurrency?: number;
	deviceMemory?: number;
	isBot?: boolean;
	botScore?: number;
	isIncognito?: boolean;
	hasLiedBrowser?: boolean;
	hasLiedOs?: boolean;
	hasLiedResolution?: boolean;
	hasLiedLanguages?: boolean;
	webrtcLocalIps?: string[];
	webrtcPublicIp?: string;
	fontsHash?: string;
	pluginsHash?: string;
	userAgent?: string;
	browserName?: string;
	browserVersion?: string;
	osName?: string;
	osVersion?: string;
	deviceType?: string;
}

@Injectable()
export class FingerprintService {
	private readonly logger = new Logger(FingerprintService.name);

	constructor(private prisma: PrismaService) {}

	/**
	 * Registra ou atualiza um fingerprint de dispositivo
	 */
	async upsertFingerprint(data: FingerprintData): Promise<DeviceFingerprint> {
		try {
			const existing = await this.prisma.deviceFingerprint.findUnique({
				where: { visitorId: data.visitorId },
			});

			if (existing) {
				return this.prisma.deviceFingerprint.update({
					where: { visitorId: data.visitorId },
					data: {
						canvasHash: data.canvasHash ?? existing.canvasHash,
						webglHash: data.webglHash ?? existing.webglHash,
						audioHash: data.audioHash ?? existing.audioHash,
						screenResolution: data.screenResolution ?? existing.screenResolution,
						colorDepth: data.colorDepth ?? existing.colorDepth,
						timezone: data.timezone ?? existing.timezone,
						timezoneOffset: data.timezoneOffset ?? existing.timezoneOffset,
						language: data.language ?? existing.language,
						platform: data.platform ?? existing.platform,
						hardwareConcurrency:
							data.hardwareConcurrency ?? existing.hardwareConcurrency,
						deviceMemory: data.deviceMemory ?? existing.deviceMemory,
						isBot: data.isBot ?? existing.isBot,
						botScore: data.botScore ?? existing.botScore,
						isIncognito: data.isIncognito ?? existing.isIncognito,
						hasLiedBrowser: data.hasLiedBrowser ?? existing.hasLiedBrowser,
						hasLiedOs: data.hasLiedOs ?? existing.hasLiedOs,
						hasLiedResolution:
							data.hasLiedResolution ?? existing.hasLiedResolution,
						hasLiedLanguages: data.hasLiedLanguages ?? existing.hasLiedLanguages,
						webrtcLocalIps: data.webrtcLocalIps ?? existing.webrtcLocalIps,
						webrtcPublicIp: data.webrtcPublicIp ?? existing.webrtcPublicIp,
						fontsHash: data.fontsHash ?? existing.fontsHash,
						pluginsHash: data.pluginsHash ?? existing.pluginsHash,
						lastSeenAt: new Date(),
						timesSeenCount: { increment: 1 },
					},
				});
			}

			return this.prisma.deviceFingerprint.create({
				data: {
					visitorId: data.visitorId,
					canvasHash: data.canvasHash,
					webglHash: data.webglHash,
					audioHash: data.audioHash,
					screenResolution: data.screenResolution,
					colorDepth: data.colorDepth,
					timezone: data.timezone,
					timezoneOffset: data.timezoneOffset,
					language: data.language,
					platform: data.platform,
					hardwareConcurrency: data.hardwareConcurrency,
					deviceMemory: data.deviceMemory,
					isBot: data.isBot ?? false,
					botScore: data.botScore ?? 0,
					isIncognito: data.isIncognito ?? false,
					hasLiedBrowser: data.hasLiedBrowser ?? false,
					hasLiedOs: data.hasLiedOs ?? false,
					hasLiedResolution: data.hasLiedResolution ?? false,
					hasLiedLanguages: data.hasLiedLanguages ?? false,
					webrtcLocalIps: data.webrtcLocalIps ?? [],
					webrtcPublicIp: data.webrtcPublicIp,
					fontsHash: data.fontsHash,
					pluginsHash: data.pluginsHash,
				},
			});
		} catch (error) {
			this.logger.error('Error upserting fingerprint', error);
			throw error;
		}
	}

	/**
	 * Vincula um fingerprint a um usuário
	 */
	async linkFingerprintToUser(
		userId: string,
		fingerprintId: string,
		data: FingerprintData,
	): Promise<UserDevice> {
		try {
			const existing = await this.prisma.userDevice.findUnique({
				where: {
					userId_fingerprintId: { userId, fingerprintId },
				},
			});

			if (existing) {
				return this.prisma.userDevice.update({
					where: { id: existing.id },
					data: {
						userAgent: data.userAgent ?? existing.userAgent,
						browserName: data.browserName ?? existing.browserName,
						browserVersion: data.browserVersion ?? existing.browserVersion,
						osName: data.osName ?? existing.osName,
						osVersion: data.osVersion ?? existing.osVersion,
						deviceType: data.deviceType ?? existing.deviceType,
						lastSeenAt: new Date(),
						loginCount: { increment: 1 },
					},
				});
			}

			return this.prisma.userDevice.create({
				data: {
					userId,
					fingerprintId,
					userAgent: data.userAgent,
					browserName: data.browserName,
					browserVersion: data.browserVersion,
					osName: data.osName,
					osVersion: data.osVersion,
					deviceType: data.deviceType,
				},
			});
		} catch (error) {
			this.logger.error('Error linking fingerprint to user', error);
			throw error;
		}
	}

	/**
	 * Busca todos os usuários que usaram um determinado fingerprint
	 */
	async getUsersByFingerprint(fingerprintId: string): Promise<string[]> {
		const devices = await this.prisma.userDevice.findMany({
			where: { fingerprintId },
			select: { userId: true },
		});
		return devices.map((d) => d.userId);
	}

	/**
	 * Busca todos os fingerprints de um usuário
	 */
	async getFingerprintsByUser(
		userId: string,
	): Promise<(UserDevice & { fingerprint: DeviceFingerprint })[]> {
		return this.prisma.userDevice.findMany({
			where: { userId },
			include: { fingerprint: true },
		});
	}

	/**
	 * Verifica se um fingerprint está associado a múltiplas contas
	 */
	async hasMultipleAccounts(fingerprintId: string): Promise<{
		hasMultiple: boolean;
		accountCount: number;
		accountIds: string[];
	}> {
		const userIds = await this.getUsersByFingerprint(fingerprintId);
		const uniqueIds = [...new Set(userIds)];
		return {
			hasMultiple: uniqueIds.length > 1,
			accountCount: uniqueIds.length,
			accountIds: uniqueIds,
		};
	}

	/**
	 * Busca fingerprint por visitorId
	 */
	async getByVisitorId(visitorId: string): Promise<DeviceFingerprint | null> {
		return this.prisma.deviceFingerprint.findUnique({
			where: { visitorId },
		});
	}

	/**
	 * Marca um dispositivo como confiável
	 */
	async trustDevice(userId: string, fingerprintId: string): Promise<void> {
		await this.prisma.userDevice.updateMany({
			where: { userId, fingerprintId },
			data: { isTrusted: true, trustScore: 100 },
		});
	}

	/**
	 * Remove confiança de um dispositivo
	 */
	async untrustDevice(userId: string, fingerprintId: string): Promise<void> {
		await this.prisma.userDevice.updateMany({
			where: { userId, fingerprintId },
			data: { isTrusted: false, trustScore: 0 },
		});
	}

	/**
	 * Verifica se fingerprint parece ser de um bot
	 */
	isSuspiciousFingerprint(fingerprint: DeviceFingerprint): {
		suspicious: boolean;
		reasons: string[];
	} {
		const reasons: string[] = [];

		if (fingerprint.isBot || fingerprint.botScore > 0.5) {
			reasons.push('Bot detected by FingerprintJS');
		}
		if (fingerprint.hasLiedBrowser) {
			reasons.push('Browser spoofing detected');
		}
		if (fingerprint.hasLiedOs) {
			reasons.push('OS spoofing detected');
		}
		if (fingerprint.hasLiedResolution) {
			reasons.push('Screen resolution spoofing detected');
		}
		if (fingerprint.hasLiedLanguages) {
			reasons.push('Language spoofing detected');
		}
		if (fingerprint.isIncognito) {
			reasons.push('Incognito mode detected');
		}

		return {
			suspicious: reasons.length > 0,
			reasons,
		};
	}
}
