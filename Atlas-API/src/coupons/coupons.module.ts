import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
	imports: [PrismaModule],
	controllers: [CouponsController],
	providers: [CouponsService],
	exports: [CouponsService],
})
export class CouponsModule {}
