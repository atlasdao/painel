import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { MedLimitsController } from './med-limits.controller';
import { AdminService } from './admin.service';
import { UserRepository } from '../repositories/user.repository';
import { UserLimitRepository } from '../repositories/user-limit.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { LimitValidationService } from '../services/limit-validation.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AdminController, MedLimitsController],
  providers: [
    AdminService,
    UserRepository,
    TransactionRepository,
    AuditLogRepository,
    UserLimitRepository,
    LimitValidationService,
  ],
})
export class AdminModule {}