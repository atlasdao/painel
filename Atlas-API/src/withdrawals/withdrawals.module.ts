import { Module, forwardRef } from '@nestjs/common';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesModule } from '../services/services.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
	imports: [PrismaModule, ServicesModule, forwardRef(() => CouponsModule)],
	controllers: [WithdrawalsController],
	providers: [WithdrawalsService],
	exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
