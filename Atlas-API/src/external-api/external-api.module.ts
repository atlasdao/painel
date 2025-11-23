import { Module } from '@nestjs/common';
import { ExternalApiController } from './external-api.controller';
import { ExternalApiService } from './external-api.service';
import { ExternalWebhookService } from './external-webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PixModule } from '../pix/pix.module';
import { PaymentLinkModule } from '../payment-link/payment-link.module';
import { EulenModule } from '../eulen/eulen.module';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PixModule,
    PaymentLinkModule,
    EulenModule,
    ConfigModule,
  ],
  controllers: [ExternalApiController],
  providers: [ExternalApiService, ExternalWebhookService, EncryptionUtil],
  exports: [ExternalApiService, ExternalWebhookService],
})
export class ExternalApiModule {}