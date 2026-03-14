import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheService } from '../common/services/cache.service';

@Module({
	imports: [PrismaModule, HttpModule.register({ timeout: 5000 })],
	controllers: [HealthController],
	providers: [HealthService, CacheService],
	exports: [HealthService],
})
export class HealthModule {}
