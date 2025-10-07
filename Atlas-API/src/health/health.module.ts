import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheService } from '../common/services/cache.service';

@Module({
	imports: [PrismaModule],
	controllers: [HealthController],
	providers: [HealthService, CacheService],
	exports: [HealthService],
})
export class HealthModule {}
