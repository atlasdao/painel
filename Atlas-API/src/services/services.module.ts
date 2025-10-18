import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EulenClientService } from './eulen-client.service';
import { RateLimiterService } from './rate-limiter.service';
import { LimitValidationService } from './limit-validation.service';
import { EmailService } from './email.service';
import { TransactionCleanupService } from './transaction-cleanup.service';
import { LiquidValidationService } from './liquid-validation.service';
import { MockPaymentService } from './mock-payment.service';
import { EmailDomainSyncService } from './email-domain-sync.service';
import { UserLimitRepository } from '../repositories/user-limit.repository';
import { BlockedEmailDomainRepository } from '../repositories/blocked-email-domain.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { IsNotDisposableEmailConstraint } from '../common/decorators/email-validation.decorator';

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
		MockPaymentService,
		EmailDomainSyncService,
		UserLimitRepository,
		BlockedEmailDomainRepository,
		IsNotDisposableEmailConstraint,
	],
	exports: [
		EulenClientService,
		RateLimiterService,
		LimitValidationService,
		EmailService,
		TransactionCleanupService,
		LiquidValidationService,
		MockPaymentService,
		EmailDomainSyncService,
		UserLimitRepository,
		BlockedEmailDomainRepository,
		IsNotDisposableEmailConstraint,
	],
})
export class ServicesModule {}
