import { Module } from '@nestjs/common';
import { ExternalApiController } from './external-api.controller';
import { ExternalApiService } from './external-api.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PixModule } from '../pix/pix.module';
import { PaymentLinkModule } from '../payment-link/payment-link.module';
import { EulenModule } from '../eulen/eulen.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PixModule,
    PaymentLinkModule,
    EulenModule,
  ],
  controllers: [ExternalApiController],
  providers: [ExternalApiService],
  exports: [ExternalApiService],
})
export class ExternalApiModule {}