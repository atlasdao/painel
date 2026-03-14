import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { ReferralCronService } from './referral.cron';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
	imports: [PrismaModule],
	controllers: [ReferralController],
	providers: [ReferralService, ReferralCronService],
	exports: [ReferralService],
})
export class ReferralModule {}
