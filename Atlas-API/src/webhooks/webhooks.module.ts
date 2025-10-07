import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    TransactionRepository,
    AuditLogRepository,
  ],
  exports: [WebhookService],
})
export class WebhooksModule {}