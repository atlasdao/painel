import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get()
	@Public()
	@ApiOperation({ summary: 'Health check endpoint' })
	@ApiResponse({ status: 200, description: 'API is healthy' })
	getHealth(): { status: string; message: string; timestamp: string } {
		return {
			status: 'healthy',
			message: 'Depix API is running',
			timestamp: new Date().toISOString(),
		};
	}
}
