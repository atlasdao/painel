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
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { UserRepository } from './repositories/user.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { AuditLogRepository } from './repositories/audit-log.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    ServicesModule,
    AuthModule,
    EulenModule,
    PixModule,
    AdminModule,
    ApiKeyRequestModule,
    PaymentLinkModule,
    AccountValidationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    UserRepository,
    TransactionRepository,
    AuditLogRepository,
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
  ],
})
export class AppModule {}
