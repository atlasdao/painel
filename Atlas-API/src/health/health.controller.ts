import { Controller, Get, Query, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../common/decorators/public.decorator';
import { CacheService } from '../common/services/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
	constructor(
		private readonly healthService: HealthService,
		private readonly cacheService: CacheService,
		private readonly prisma: PrismaService,
	) {}

	@Get()
	@Public()
	async check() {
		return this.healthService.check();
	}

	@Get('detailed')
	@UseGuards(AdminGuard)
	async detailed() {
		return this.healthService.detailedCheck();
	}

	@Get('metrics')
	@UseGuards(AdminGuard)
	async metrics() {
		return this.healthService.getMetrics();
	}

	@Get('ready')
	@Public()
	async ready() {
		return this.healthService.readinessCheck();
	}

	@Get('live')
	@Public()
	async live() {
		return this.healthService.livenessCheck();
	}

	@Get('status')
	@Public()
	async status() {
		const CACHE_KEY = 'health:status:page';
		const cached = await this.cacheService.get<any>(CACHE_KEY);
		if (cached) {
			cached.data.lastUpdated = new Date().toISOString();
			return cached;
		}

		const detailedCheck = await this.healthService.detailedCheck();

		// Map service names to Portuguese and assign icons
		const nameMap: Record<string, { name: string; icon: string }> = {
			'Database': { name: 'Banco de Dados', icon: 'Database' },
			'Cache': { name: 'Cache', icon: 'Server' },
			'Payment Service': { name: 'Processamento PIX', icon: 'Activity' },
			'API Gateway': { name: 'API Gateway', icon: 'Server' },
			'Dashboard': { name: 'Dashboard', icon: 'Wifi' },
			'Webhooks': { name: 'Webhooks', icon: 'RefreshCw' },
			'Authentication': { name: 'Autenticação', icon: 'Shield' },
		};

		const services = detailedCheck.services.map(service => {
			const mapping = nameMap[service.name] || { name: service.name, icon: 'Activity' };
			return {
				name: mapping.name,
				status: service.status === 'up' ? 'operational' :
						service.status === 'down' ? 'down' : 'degraded',
				responseTime: service.responseTime || 0,
				icon: mapping.icon,
			};
		});

		const overallStatus = services.some(s => s.status === 'down') ? 'down' :
							  services.some(s => s.status === 'degraded') ? 'degraded' : 'operational';

		// Get active incidents
		const incidents = await this.healthService.getActiveIncidents();

		// Get uptime history (last 7 days)
		const uptimeHistory = await this.healthService.getUptimeHistory(7);

		const result = {
			success: true,
			data: {
				overallStatus,
				services,
				lastUpdated: new Date().toISOString(),
				uptime: detailedCheck.status.uptime,
				metrics: detailedCheck.metrics,
				uptimeHistory,
				incidents: incidents.map(incident => ({
					id: incident.id,
					title: incident.title,
					description: incident.description,
					status: incident.status.toLowerCase(),
					severity: incident.severity.toLowerCase(),
					timestamp: incident.createdAt.toISOString(),
					updates: incident.updates.map(update => ({
						message: update.message,
						timestamp: update.createdAt.toISOString()
					}))
				}))
			}
		};

		// Cache for 15 seconds
		await this.cacheService.set(CACHE_KEY, result, { ttl: 15 });

		return result;
	}

	@Get('support-widget-key')
	@Public()
	async getSupportWidgetKey(@Query('context') context: string) {
		const key = context === 'logged' ? 'SUPPORT_WIDGET_KEY_LOGGED' : 'SUPPORT_WIDGET_KEY_UNLOGGED';
		const setting = await this.prisma.systemSettings.findUnique({ where: { key } });
		return { key: setting?.value || '' };
	}
}
