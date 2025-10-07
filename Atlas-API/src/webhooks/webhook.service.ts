import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { WebhookDepositEventDto, WebhookEventResponseDto } from '../common/dto/webhook.dto';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionRepository: TransactionRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async processDepositWebhook(eventData: WebhookDepositEventDto): Promise<WebhookEventResponseDto> {
    this.logger.log(`🔔 WEBHOOK RECEIVED: Processing deposit event for qrId: ${eventData.qrId}`);
    
    try {
      // Find transaction by external ID (qrId from Eulen)
      const transaction = await this.prisma.transaction.findFirst({
        where: {
          externalId: eventData.qrId,
          type: 'DEPOSIT'
        },
        include: {
          user: true
        }
      });

      if (!transaction) {
        this.logger.warn(`⚠️ WEBHOOK: Transaction not found for qrId: ${eventData.qrId}`);
        throw new NotFoundException(`Transaction not found for qrId: ${eventData.qrId}`);
      }

      this.logger.log(`📍 WEBHOOK: Found transaction ${transaction.id} for user ${transaction.userId}`);

      // Map Eulen status to our transaction status
      const previousStatus = transaction.status;
      const newStatus = this.mapEulenStatusToTransactionStatus(eventData.status);

      this.logger.log(`🔄 WEBHOOK: Status mapping - Eulen: "${eventData.status}" → Atlas: "${newStatus}"`);

      // Only update if status actually changed
      if (previousStatus === newStatus) {
        this.logger.log(`✅ WEBHOOK: Status unchanged (${newStatus}) - no update needed`);
        return {
          success: true,
          message: 'Webhook received but status unchanged',
          transactionId: transaction.id,
          previousStatus,
          newStatus
        };
      }

      // Prepare metadata with webhook event data
      const existingMetadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
      const updatedMetadata = {
        ...existingMetadata,
        webhookEvent: {
          bankTxId: eventData.bankTxId,
          blockchainTxID: eventData.blockchainTxID,
          customerMessage: eventData.customerMessage,
          payerName: eventData.payerName,
          payerEUID: eventData.payerEUID,
          payerTaxNumber: eventData.payerTaxNumber,
          expiration: eventData.expiration,
          pixKey: eventData.pixKey,
          valueInCents: eventData.valueInCents,
          eulenStatus: eventData.status,
          webhookReceivedAt: new Date().toISOString()
        }
      };

      // Update transaction status and metadata
      const updatedTransaction = await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: newStatus,
          metadata: JSON.stringify(updatedMetadata),
          processedAt: newStatus === TransactionStatus.COMPLETED ? new Date() : transaction.processedAt,
          errorMessage: newStatus === TransactionStatus.FAILED ? `Webhook: ${eventData.status}` : null,
          updatedAt: new Date()
        }
      });

      this.logger.log(`✅ WEBHOOK: Transaction ${transaction.id} status updated: ${previousStatus} → ${newStatus}`);

      // Create audit log for webhook processing
      await this.auditLogRepository.createLog({
        action: 'WEBHOOK_DEPOSIT_EVENT',
        resource: 'transaction',
        resourceId: transaction.id,
        requestBody: eventData,
        responseBody: {
          transactionId: transaction.id,
          previousStatus,
          newStatus,
          success: true
        }
      });

      // Log additional details for completed transactions
      if (newStatus === TransactionStatus.COMPLETED) {
        this.logger.log(`💰 DEPOSIT COMPLETED: Transaction ${transaction.id}`);
        this.logger.log(`  💳 Amount: R$ ${(transaction.amount / 100).toFixed(2)}`);
        this.logger.log(`  👤 Payer: ${eventData.payerName} (${eventData.payerTaxNumber})`);
        this.logger.log(`  🔗 Blockchain TX: ${eventData.blockchainTxID}`);
        this.logger.log(`  🏦 Bank TX: ${eventData.bankTxId}`);
        
        if (eventData.customerMessage) {
          this.logger.log(`  💬 Message: "${eventData.customerMessage}"`);
        }
      }

      return {
        success: true,
        message: 'Webhook processed successfully',
        transactionId: transaction.id,
        previousStatus,
        newStatus
      };

    } catch (error) {
      this.logger.error(`❌ WEBHOOK ERROR: Failed to process deposit event`, error);
      
      // Still log the webhook attempt for debugging
      await this.auditLogRepository.createLog({
        action: 'WEBHOOK_DEPOSIT_EVENT_ERROR',
        resource: 'webhook',
        requestBody: eventData,
        responseBody: {
          error: error.message,
          stack: error.stack
        }
      });

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to process webhook event');
    }
  }

  /**
   * Maps Eulen status values to our TransactionStatus enum
   */
  private mapEulenStatusToTransactionStatus(eulenStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      'pending': TransactionStatus.PENDING,
      'paid': TransactionStatus.PROCESSING,
      'depix_sent': TransactionStatus.COMPLETED,
      'failed': TransactionStatus.FAILED,
      'expired': TransactionStatus.EXPIRED,
      'cancelled': TransactionStatus.FAILED, // Treat cancelled as failed
    };

    return statusMap[eulenStatus.toLowerCase()] || TransactionStatus.PENDING;
  }

  /**
   * Get webhook processing statistics
   */
  async getWebhookStats(startDate?: Date, endDate?: Date) {
    const whereClause: any = {
      action: {
        in: ['WEBHOOK_DEPOSIT_EVENT', 'WEBHOOK_DEPOSIT_EVENT_ERROR']
      }
    };

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate
      };
    }

    const logs = await this.prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    const successfulWebhooks = logs.filter(log => log.action === 'WEBHOOK_DEPOSIT_EVENT').length;
    const failedWebhooks = logs.filter(log => log.action === 'WEBHOOK_DEPOSIT_EVENT_ERROR').length;

    return {
      totalWebhooks: logs.length,
      successfulWebhooks,
      failedWebhooks,
      successRate: logs.length > 0 ? Math.round((successfulWebhooks / logs.length) * 100) : 0,
      recentLogs: logs.slice(0, 10) // Last 10 webhook events
    };
  }
}