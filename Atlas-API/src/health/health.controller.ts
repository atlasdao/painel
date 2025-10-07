import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
	constructor(private readonly healthService: HealthService) {}

	@Get()
	@Public()
	async check() {
		return this.healthService.check();
	}

	@Get('detailed')
	async detailed() {
		return this.healthService.detailedCheck();
	}

	@Get('metrics')
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
}
