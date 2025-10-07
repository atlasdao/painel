import { Module } from '@nestjs/common';
import { AccountValidationController } from './account-validation.controller';
import { AccountValidationService } from './account-validation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PixModule } from '../pix/pix.module';

@Module({
	imports: [PrismaModule, PixModule],
	controllers: [AccountValidationController],
	providers: [AccountValidationService],
	exports: [AccountValidationService],
})
export class AccountValidationModule {}
