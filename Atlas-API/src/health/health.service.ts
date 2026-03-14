import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { EulenClientService } from '../services/eulen-client.service';
import { firstValueFrom } from 'rxjs';

export interface HealthStatus {
	status: 'healthy' | 'degraded' | 'unhealthy';
	timestamp: string;
	uptime: number;
	version: string;
	environment: string;
}

export interface ServiceHealth {
	name: string;
	status: 'up' | 'down' | 'degraded';
	responseTime?: number;
	error?: string;
}

export interface SystemMetrics {
	memory: {
		used: number;
		total: number;
		percentage: number;
	};
	cpu: {
		usage: number;
	};
	requests: {
		total: number;
		perMinute: number;
	};
	errors: {
		total: number;
		rate: number;
	};
}

@Injectable()
export class HealthService {
	private readonly logger = new Logger(HealthService.name);
	private readonly startTime = Date.now();
	private requestCount = 0;
	private errorCount = 0;
	private lastSnapshotCount = 0;
	private requestHistory: number[] = [];

	// In-memory cache for latest service check results (updated by cron)
	private latestServiceChecks: ServiceHealth[] = [];

	constructor(
		private readonly prisma: PrismaService,
		private readonly cacheService: CacheService,
		private readonly httpService: HttpService,
		private readonly eulenClient: EulenClientService,
	) {
		// Track request metrics delta per minute
		setInterval(() => {
			const delta = this.requestCount - this.lastSnapshotCount;
			this.lastSnapshotCount = this.requestCount;
			this.requestHistory.push(delta);
			if (this.requestHistory.length > 60) {
				this.requestHistory.shift();
			}
		}, 60000);
	}

	async check(): Promise<HealthStatus> {
		const checks = await Promise.allSettled([
			this.checkDatabase(),
			this.checkCache(),
		]);

		const hasFailure = checks.some(
			(check) =>
				check.status === 'rejected' ||
				(check.status === 'fulfilled' && check.value.status === 'down'),
		);

		return {
			status: hasFailure ? 'unhealthy' : 'healthy',
			timestamp: new Date().toISOString(),
			uptime: this.getUptime(),
			version: process.env.npm_package_version || '1.0.0',
			environment: process.env.NODE_ENV || 'development',
		};
	}

	async detailedCheck(): Promise<{
		status: HealthStatus;
		services: ServiceHealth[];
		metrics: SystemMetrics;
	}> {
		// Use cached service checks if available (populated by cron)
		let services: ServiceHealth[];
		if (this.latestServiceChecks.length > 0) {
			services = this.latestServiceChecks;
		} else {
			services = await this.runAllChecks();
		}

		const status = await this.check();
		const metrics = await this.getMetrics();

		return { status, services, metrics };
	}

	async readinessCheck(): Promise<{ ready: boolean; checks: ServiceHealth[] }> {
		const checks: ServiceHealth[] = [];

		try {
			const dbCheck = await this.checkDatabase();
			checks.push(dbCheck);

			const cacheCheck = await this.checkCache();
			checks.push(cacheCheck);

			const ready = checks.every((check) => check.status === 'up');

			return { ready, checks };
		} catch (error) {
			this.logger.error('Readiness check failed:', error);
			return { ready: false, checks };
		}
	}

	async livenessCheck(): Promise<{ alive: boolean; uptime: number }> {
		return {
			alive: true,
			uptime: this.getUptime(),
		};
	}

	async getMetrics(): Promise<SystemMetrics> {
		const memUsage = process.memoryUsage();
		const totalMem = memUsage.heapTotal;
		const usedMem = memUsage.heapUsed;

		return {
			memory: {
				used: Math.round(usedMem / 1024 / 1024),
				total: Math.round(totalMem / 1024 / 1024),
				percentage: Math.round((usedMem / totalMem) * 100),
			},
			cpu: {
				usage: process.cpuUsage().user / 1000000,
			},
			requests: {
				total: this.requestCount,
				perMinute: this.getRequestsPerMinute(),
			},
			errors: {
				total: this.errorCount,
				rate: this.getErrorRate(),
			},
		};
	}

	// ========================
	// Real health checks
	// ========================

	async checkDatabase(): Promise<ServiceHealth> {
		const startTime = Date.now();
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return { name: 'Database', status: 'up', responseTime: Date.now() - startTime };
		} catch (error) {
			this.logger.error('Database health check failed:', error);
			return { name: 'Database', status: 'down', error: error.message };
		}
	}

	async checkCache(): Promise<ServiceHealth> {
		const startTime = Date.now();
		try {
			const testKey = 'health:check';
			await this.cacheService.set(testKey, 'ok', { ttl: 10 });
			const value = await this.cacheService.get(testKey);
			await this.cacheService.delete(testKey);

			if (value !== 'ok') {
				throw new Error('Cache verification failed');
			}

			return { name: 'Cache', status: 'up', responseTime: Date.now() - startTime };
		} catch (error) {
			this.logger.error('Cache health check failed:', error);
			return { name: 'Cache', status: 'down', error: error.message };
		}
	}

	private async checkApiGateway(): Promise<ServiceHealth> {
		const startTime = Date.now();
		const port = process.env.PORT || 19997;
		try {
			const response = await firstValueFrom(
				this.httpService.get(`http://localhost:${port}/health`, { timeout: 3000 }),
			);
			if (response.status === 200) {
				return { name: 'API Gateway', status: 'up', responseTime: Date.now() - startTime };
			}
			return { name: 'API Gateway', status: 'degraded', responseTime: Date.now() - startTime };
		} catch (error) {
			return { name: 'API Gateway', status: 'down', error: error.message };
		}
	}

	private async checkDashboard(): Promise<ServiceHealth> {
		const startTime = Date.now();
		try {
			const response = await firstValueFrom(
				this.httpService.get('http://localhost:11337', { timeout: 3000 }),
			);
			if (response.status >= 200 && response.status < 400) {
				return { name: 'Dashboard', status: 'up', responseTime: Date.now() - startTime };
			}
			return { name: 'Dashboard', status: 'degraded', responseTime: Date.now() - startTime };
		} catch (error) {
			return { name: 'Dashboard', status: 'down', error: error.message };
		}
	}

	private async checkPaymentService(): Promise<ServiceHealth> {
		const startTime = Date.now();
		try {
			await this.eulenClient.ping();
			return { name: 'Payment Service', status: 'up', responseTime: Date.now() - startTime };
		} catch (error) {
			const responseTime = Date.now() - startTime;
			const status = error?.response?.status || error?.status || error?.getStatus?.();
			// 401 = auth issue, 429/520 = rate limited — service is reachable but limited
			if (status === 401) {
				return { name: 'Payment Service', status: 'degraded', responseTime, error: 'Auth issue' };
			}
			if (status === 429 || status === 520) {
				return { name: 'Payment Service', status: 'up', responseTime, error: 'Rate limited' };
			}
			// HttpException from NestJS may wrap the original status
			if (error?.message?.includes('429') || error?.message?.includes('rate') || error?.message?.includes('Too many')) {
				return { name: 'Payment Service', status: 'up', responseTime, error: 'Rate limited' };
			}
			return { name: 'Payment Service', status: 'down', error: error.message };
		}
	}

	private async checkWebhooks(): Promise<ServiceHealth> {
		const startTime = Date.now();
		try {
			await this.prisma.webhookEvent.findFirst({
				orderBy: { createdAt: 'desc' },
				select: { id: true },
			});
			return { name: 'Webhooks', status: 'up', responseTime: Date.now() - startTime };
		} catch (error) {
			return { name: 'Webhooks', status: 'down', error: error.message };
		}
	}

	private async checkAuthentication(): Promise<ServiceHealth> {
		const startTime = Date.now();
		try {
			const jwtSecret = process.env.JWT_SECRET;
			if (!jwtSecret) {
				return { name: 'Authentication', status: 'down', error: 'JWT_SECRET not configured' };
			}
			// Verify the auth module is responsive by querying the DB for a user count (lightweight)
			await this.prisma.user.count({ take: 1 });
			return { name: 'Authentication', status: 'up', responseTime: Date.now() - startTime };
		} catch (error) {
			return { name: 'Authentication', status: 'down', error: error.message };
		}
	}

	/**
	 * Run all health checks and return results
	 */
	async runAllChecks(): Promise<ServiceHealth[]> {
		const checks = await Promise.allSettled([
			this.checkApiGateway(),
			this.checkPaymentService(),
			this.checkDashboard(),
			this.checkDatabase(),
			this.checkCache(),
			this.checkWebhooks(),
			this.checkAuthentication(),
		]);

		return checks.map((result, index) => {
			const names = ['API Gateway', 'Payment Service', 'Dashboard', 'Database', 'Cache', 'Webhooks', 'Authentication'];
			if (result.status === 'fulfilled') {
				return result.value;
			}
			return { name: names[index], status: 'down' as const, error: result.reason?.message };
		});
	}

	// ========================
	// Cron: health checks every 2 minutes + persist uptime
	// ========================

	@Cron('*/2 * * * *')
	async cronHealthCheck() {
		try {
			const services = await this.runAllChecks();
			this.latestServiceChecks = services;

			// Persist uptime per service
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			for (const service of services) {
				const isSuccess = service.status === 'up';
				try {
					await this.prisma.uptimeRecord.upsert({
						where: {
							date_serviceName: { date: today, serviceName: service.name },
						},
						create: {
							date: today,
							serviceName: service.name,
							totalChecks: 1,
							successChecks: isSuccess ? 1 : 0,
							uptime: isSuccess ? 100 : 0,
						},
						update: {
							totalChecks: { increment: 1 },
							successChecks: isSuccess ? { increment: 1 } : undefined,
							uptime: undefined, // will be calculated below
						},
					});

					// Recalculate uptime percentage
					const record = await this.prisma.uptimeRecord.findUnique({
						where: {
							date_serviceName: { date: today, serviceName: service.name },
						},
					});
					if (record && record.totalChecks > 0) {
						const uptimePercent = Number(((record.successChecks / record.totalChecks) * 100).toFixed(2));
						await this.prisma.uptimeRecord.update({
							where: { id: record.id },
							data: { uptime: uptimePercent },
						});
					}
				} catch (err) {
					this.logger.error(`Failed to persist uptime for ${service.name}: ${err.message}`);
				}
			}
		} catch (error) {
			this.logger.error('Cron health check failed:', error);
		}
	}

	// ========================
	// Uptime history from DB
	// ========================

	async getUptimeHistory(days = 7): Promise<{ date: string; uptime: number }[]> {
		const since = new Date();
		since.setDate(since.getDate() - days);
		since.setHours(0, 0, 0, 0);

		const records = await this.prisma.uptimeRecord.findMany({
			where: { date: { gte: since } },
			orderBy: { date: 'asc' },
		});

		// Group by date and compute average uptime across all services
		const grouped = new Map<string, { total: number; count: number }>();
		for (const r of records) {
			const key = r.date.toISOString().split('T')[0];
			const existing = grouped.get(key) || { total: 0, count: 0 };
			existing.total += r.uptime;
			existing.count += 1;
			grouped.set(key, existing);
		}

		const result: { date: string; uptime: number }[] = [];
		for (const [date, { total, count }] of grouped) {
			result.push({ date, uptime: Number((total / count).toFixed(2)) });
		}

		// If we have no data yet, return empty array
		return result;
	}

	// ========================
	// Metrics helpers
	// ========================

	private getUptime(): number {
		return Math.floor((Date.now() - this.startTime) / 1000);
	}

	private getRequestsPerMinute(): number {
		if (this.requestHistory.length === 0) return 0;
		const recent = this.requestHistory.slice(-5);
		const average = recent.reduce((a, b) => a + b, 0) / recent.length;
		return Math.round(average);
	}

	private getErrorRate(): number {
		if (this.requestCount === 0) return 0;
		return Number(((this.errorCount / this.requestCount) * 100).toFixed(2));
	}

	incrementRequestCount(): void {
		this.requestCount++;
	}

	incrementErrorCount(): void {
		this.errorCount++;
	}

	// ========================
	// Incidents
	// ========================

	async getActiveIncidents() {
		return this.prisma.incident.findMany({
			where: {
				status: {
					not: 'RESOLVED'
				}
			},
			include: {
				updates: {
					orderBy: { createdAt: 'desc' },
					include: {
						creator: {
							select: { username: true }
						}
					}
				},
				creator: {
					select: { username: true }
				}
			},
			orderBy: [
				{ severity: 'desc' },
				{ createdAt: 'desc' }
			]
		});
	}

	async getAllIncidents() {
		return this.prisma.incident.findMany({
			include: {
				updates: {
					orderBy: { createdAt: 'desc' },
					include: {
						creator: {
							select: { username: true }
						}
					}
				},
				creator: {
					select: { username: true }
				}
			},
			orderBy: { createdAt: 'desc' }
		});
	}
}
