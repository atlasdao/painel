import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';

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
	private requestHistory: number[] = [];

	constructor(
		private readonly prisma: PrismaService,
		private readonly cacheService: CacheService,
	) {
		// Track request metrics
		setInterval(() => {
			this.requestHistory.push(this.requestCount);
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
		const services: ServiceHealth[] = [];

		// Check database
		services.push(await this.checkDatabase());

		// Check cache
		services.push(await this.checkCache());

		// Check external services
		services.push(await this.checkExternalServices());

		const status = await this.check();
		const metrics = await this.getMetrics();

		return { status, services, metrics };
	}

	async readinessCheck(): Promise<{ ready: boolean; checks: ServiceHealth[] }> {
		const checks: ServiceHealth[] = [];

		try {
			// Check if database is ready
			const dbCheck = await this.checkDatabase();
			checks.push(dbCheck);

			// Check if cache is ready
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
				used: Math.round(usedMem / 1024 / 1024), // MB
				total: Math.round(totalMem / 1024 / 1024), // MB
				percentage: Math.round((usedMem / totalMem) * 100),
			},
			cpu: {
				usage: process.cpuUsage().user / 1000000, // Convert to seconds
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

	private async checkDatabase(): Promise<ServiceHealth> {
		const startTime = Date.now();

		try {
			await this.prisma.$queryRaw`SELECT 1`;
			const responseTime = Date.now() - startTime;

			return {
				name: 'Database',
				status: 'up',
				responseTime,
			};
		} catch (error) {
			this.logger.error('Database health check failed:', error);
			return {
				name: 'Database',
				status: 'down',
				error: error.message,
			};
		}
	}

	private async checkCache(): Promise<ServiceHealth> {
		const startTime = Date.now();

		try {
			const testKey = 'health:check';
			await this.cacheService.set(testKey, 'ok', { ttl: 10 });
			const value = await this.cacheService.get(testKey);
			await this.cacheService.delete(testKey);

			if (value !== 'ok') {
				throw new Error('Cache verification failed');
			}

			const responseTime = Date.now() - startTime;

			return {
				name: 'Cache',
				status: 'up',
				responseTime,
			};
		} catch (error) {
			this.logger.error('Cache health check failed:', error);
			return {
				name: 'Cache',
				status: 'down',
				error: error.message,
			};
		}
	}

	private async checkExternalServices(): Promise<ServiceHealth> {
		// Check if external payment service is reachable
		const startTime = Date.now();

		try {
			// This would normally check your payment provider
			// For now, we'll simulate it
			const responseTime = Date.now() - startTime;

			return {
				name: 'Payment Service',
				status: 'up',
				responseTime,
			};
		} catch (error) {
			return {
				name: 'Payment Service',
				status: 'degraded',
				error: 'Service temporarily unavailable',
			};
		}
	}

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
}
