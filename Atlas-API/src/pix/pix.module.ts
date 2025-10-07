import { Module } from '@nestjs/common';
import { PixController } from './pix.controller';
import { PixService } from './pix.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesModule } from '../services/services.module';
import { LevelsModule } from '../levels/levels.module';

@Module({
	imports: [AuthModule, PrismaModule, ServicesModule, LevelsModule],
	controllers: [PixController],
	providers: [PixService, TransactionRepository, AuditLogRepository],
	exports: [PixService],
})
export class PixModule {}
