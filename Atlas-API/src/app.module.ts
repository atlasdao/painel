import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EulenModule } from './eulen/eulen.module';
import { PixModule } from './pix/pix.module';
import { AdminModule } from './admin/admin.module';
import { ApiKeyRequestModule } from './api-key-request/api-key-request.module';
import { PaymentLinkModule } from './payment-link/payment-link.module';
import { AccountValidationModule } from './account-validation/account-validation.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CouponsModule } from './coupons/coupons.module';
import { CommerceModule } from './commerce/commerce.module';
import { HealthModule } from './health/health.module';
import { ProfileModule } from './profile/profile.module';
import { LevelsModule } from './levels/levels.module';
import { DonationsModule } from './donations/donations.module';
import { ExternalApiModule } from './external-api/external-api.module';
import { CollaboratorModule } from './collaborator/collaborator.module';
import { RiskModule } from './risk/risk.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AccountContextInterceptor } from './common/interceptors/account-context.interceptor';
import { UserRepository } from './repositories/user.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { IsNotDisposableEmailConstraint } from './common/decorators/email-validation.decorator';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: '.env',
		}),
		PrismaModule,
		ServicesModule,
		HealthModule,
		AuthModule,
		ProfileModule,
		EulenModule,
		PixModule,
		AdminModule,
		ApiKeyRequestModule,
		PaymentLinkModule,
		AccountValidationModule,
		WithdrawalsModule,
		WebhooksModule,
		CouponsModule,
		CommerceModule,
		LevelsModule,
		DonationsModule,
		ExternalApiModule,
		CollaboratorModule,
		RiskModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		UserRepository,
		TransactionRepository,
		AuditLogRepository,
		IsNotDisposableEmailConstraint,
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: LoggingInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: AuditInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: AccountContextInterceptor,
		},
	],
})
export class AppModule {}
