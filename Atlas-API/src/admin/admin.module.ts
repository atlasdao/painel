import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { MedLimitsController } from './med-limits.controller';
import { AdminService } from './admin.service';
import { HealthModule } from '../health/health.module';
import { CacheService } from '../common/services/cache.service';
import { UserRepository } from '../repositories/user.repository';
import { UserLimitRepository } from '../repositories/user-limit.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { LimitValidationService } from '../services/limit-validation.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
	imports: [AuthModule, PrismaModule, HealthModule],
	controllers: [AdminController, MedLimitsController],
	providers: [
		AdminService,
		CacheService,
		UserRepository,
		TransactionRepository,
		AuditLogRepository,
		UserLimitRepository,
		LimitValidationService,
	],
})
export class AdminModule {}
