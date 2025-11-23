import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PaymentLinkController } from './payment-link.controller';
import { PublicPaymentLinkController } from './public-payment-link.controller';
import { WebhookController } from './webhook.controller';
import { PaymentConfirmationController } from './payment-confirmation.controller';
import { PaymentLinkService } from './payment-link.service';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PixModule } from '../pix/pix.module';
import { AuthModule } from '../auth/auth.module';
import { EncryptionUtil } from '../common/utils/encryption.util';

@Module({
	imports: [PrismaModule, PixModule, AuthModule, HttpModule.register({ timeout: 15000, maxRedirects: 5 }), ConfigModule],
	controllers: [PaymentLinkController, PublicPaymentLinkController, WebhookController, PaymentConfirmationController],
	providers: [PaymentLinkService, WebhookService, EncryptionUtil],
	exports: [PaymentLinkService, WebhookService],
})
export class PaymentLinkModule {}
