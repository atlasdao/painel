import { Module, forwardRef } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { BotSyncService } from '../common/services/bot-sync.service';
import { ConfigModule } from '@nestjs/config';
import { PaymentLinkModule } from '../payment-link/payment-link.module';

@Module({
	imports: [PrismaModule, ConfigModule, forwardRef(() => PaymentLinkModule)],
	controllers: [WebhookController],
	providers: [WebhookService, TransactionRepository, AuditLogRepository, BotSyncService],
	exports: [WebhookService],
})
export class WebhooksModule {}
