import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EulenClientService } from './eulen-client.service';
import { RateLimiterService } from './rate-limiter.service';
import { LimitValidationService } from './limit-validation.service';
import { EmailService } from './email.service';
import { TransactionCleanupService } from './transaction-cleanup.service';
import { LiquidValidationService } from './liquid-validation.service';
import { UserLimitRepository } from '../repositories/user-limit.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  providers: [
    EulenClientService, 
    RateLimiterService, 
    LimitValidationService,
    EmailService,
    TransactionCleanupService,
    LiquidValidationService,
    UserLimitRepository,
  ],
  exports: [
    EulenClientService, 
    RateLimiterService, 
    LimitValidationService,
    EmailService,
    TransactionCleanupService,
    LiquidValidationService,
    UserLimitRepository,
  ],
})
export class ServicesModule {}