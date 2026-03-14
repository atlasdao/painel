import { Module } from '@nestjs/common';
import { CollateralController } from './collateral.controller';
import { CollateralService } from './collateral.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ServicesModule } from '../services/services.module';

@Module({
	imports: [PrismaModule, AuthModule, ServicesModule],
	controllers: [CollateralController],
	providers: [CollateralService],
	exports: [CollateralService],
})
export class CollateralModule {}
