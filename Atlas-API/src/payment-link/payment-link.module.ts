import { Module } from '@nestjs/common';
import { PaymentLinkController } from './payment-link.controller';
import { PublicPaymentLinkController } from './public-payment-link.controller';
import { PaymentLinkService } from './payment-link.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PixModule } from '../pix/pix.module';

@Module({
	imports: [PrismaModule, PixModule],
	controllers: [PaymentLinkController, PublicPaymentLinkController],
	providers: [PaymentLinkService],
	exports: [PaymentLinkService],
})
export class PaymentLinkModule {}
