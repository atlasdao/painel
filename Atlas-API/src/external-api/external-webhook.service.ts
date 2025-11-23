import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookConfigDto, ExternalWebhookEvent } from './dto/create-pix.dto';
import { EncryptionUtil } from '../common/utils/encryption.util';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class ExternalWebhookService {
  private readonly logger = new Logger(ExternalWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private encryptionUtil: EncryptionUtil,
  ) {}

  /**
   * Register a webhook for an external API transaction
   */
  async registerTransactionWebhook(
    transactionId: string,
    apiKeyId: string,
    webhookConfig: WebhookConfigDto,
  ) {
    try {
      // Generate secret if not provided
      const secret = webhookConfig.secret || this.generateWebhookSecret();

      // Encrypt the secret
      const encryptedSecret = this.encryptionUtil.encrypt(secret);

      // Create the webhook record
      const webhook = await this.prisma.paymentLinkWebhook.create({
        data: {
          name: `External API Webhook - ${transactionId}`,
          url: webhookConfig.url,
          events: webhookConfig.events,
          secret: encryptedSecret,
          active: true,
          apiKeyId: apiKeyId,
          transactionId: transactionId,
          headers: webhookConfig.headers || {},
        },
      });

      this.logger.log(
        `Webhook registered for transaction ${transactionId}: ${webhook.id}`,
      );

      return {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secretHint: secret.substring(0, 4), // First 4 chars for identification
      };
    } catch (error) {
      this.logger.error(
        `Failed to register webhook for transaction ${transactionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Trigger webhooks for a specific transaction event
   */
  async triggerTransactionWebhook(
    transactionId: string,
    event: ExternalWebhookEvent,
    payload: any,
  ) {
    try {
      // Find active webhooks for this transaction and event
      const webhooks = await this.prisma.paymentLinkWebhook.findMany({
        where: {
          transactionId: transactionId,
          active: true,
          events: {
            has: event,
          },
        },
      });

      if (webhooks.length === 0) {
        this.logger.debug(
          `No active webhooks found for transaction ${transactionId} and event ${event}`,
        );
        return;
      }

      // Trigger each webhook
      const results = await Promise.allSettled(
        webhooks.map((webhook) => this.sendWebhook(webhook, event, payload)),
      );

      // Log results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.logger.log(
            `Webhook ${webhooks[index].id} triggered successfully for event ${event}`,
          );
        } else {
          this.logger.error(
            `Failed to trigger webhook ${webhooks[index].id}:`,
            result.reason,
          );
        }
      });

      return results;
    } catch (error) {
      this.logger.error(
        `Error triggering webhooks for transaction ${transactionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send a webhook request
   */
  private async sendWebhook(
    webhook: any,
    event: string,
    data: any,
  ): Promise<void> {
    try {
      // Prepare webhook payload
      const webhookPayload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        webhookId: webhook.id,
      };

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Atlas-Event': event,
        'X-Atlas-Webhook-Id': webhook.id,
      };

      // Add custom headers if present
      if (webhook.headers && typeof webhook.headers === 'object') {
        Object.assign(headers, webhook.headers);
      }

      // Generate HMAC signature if secret exists
      if (webhook.secret) {
        try {
          const decryptedSecret = this.encryptionUtil.decrypt(webhook.secret);
          if (decryptedSecret) {
            const signature = crypto
              .createHmac('sha256', decryptedSecret)
              .update(JSON.stringify(webhookPayload))
              .digest('hex');

            headers['X-Atlas-Signature'] = `sha256=${signature}`;
          }
        } catch (decryptError) {
          this.logger.error(
            `Failed to decrypt webhook secret for ${webhook.id}:`,
            decryptError,
          );
          // Continue without signature if decryption fails
        }
      }

      // Send the webhook request
      const response = await axios.post(webhook.url, webhookPayload, {
        headers,
        timeout: 15000, // 15 seconds timeout
        validateStatus: () => true, // Accept any status code
      });

      // Create webhook event record
      await this.prisma.paymentLinkWebhookEvent.create({
        data: {
          webhookId: webhook.id,
          paymentLinkId: webhook.paymentLinkId, // Will be null for external API
          eventType: event,
          payload: webhookPayload,
          status: response.status >= 200 && response.status < 300 ? 'SUCCESS' : 'FAILED',
          attempts: 1,
          responseCode: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 1000), // Limit response size
          lastAttemptAt: new Date(),
        },
      });

      // Update last triggered timestamp
      await this.prisma.paymentLinkWebhook.update({
        where: { id: webhook.id },
        data: { lastTriggeredAt: new Date() },
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          `Webhook returned non-success status: ${response.status}`,
        );
      }
    } catch (error) {
      // Log the error and create a failed event record
      this.logger.error(`Failed to send webhook ${webhook.id}:`, error);

      await this.prisma.paymentLinkWebhookEvent.create({
        data: {
          webhookId: webhook.id,
          paymentLinkId: webhook.paymentLinkId, // Will be null for external API
          eventType: event,
          payload: { event, data, timestamp: new Date().toISOString() },
          status: 'FAILED',
          attempts: 1,
          responseCode: error.response?.status || null,
          responseBody: error.message?.substring(0, 1000),
          lastAttemptAt: new Date(),
          nextRetryAt: new Date(Date.now() + 60000), // Retry in 1 minute
        },
      });

      throw error;
    }
  }

  /**
   * Validate a webhook URL is accessible
   */
  async validateWebhookUrl(url: string): Promise<boolean> {
    try {
      // Check if URL is HTTPS in production
      if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
        throw new BadRequestException('Webhook URL must use HTTPS in production');
      }

      // Check if URL is not localhost or private IP
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      const isPrivate =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.');

      if (process.env.NODE_ENV === 'production' && isPrivate) {
        throw new BadRequestException('Webhook URL cannot be a private address');
      }

      // Test the URL with a POST request
      const response = await axios.post(
        url,
        {
          test: true,
          message: 'Atlas webhook validation',
        },
        {
          timeout: 5000,
          validateStatus: () => true, // Accept any status
        },
      );

      // Consider 2xx, 4xx as valid (4xx means the server is responding)
      return response.status < 500;
    } catch (error) {
      this.logger.error(`Webhook URL validation failed for ${url}:`, error);
      return false;
    }
  }

  /**
   * Generate a secure webhook secret
   */
  generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Find webhooks by API key
   */
  async findWebhooksByApiKey(apiKeyId: string) {
    return this.prisma.paymentLinkWebhook.findMany({
      where: {
        apiKeyId: apiKeyId,
        active: true,
      },
      select: {
        id: true,
        transactionId: true,
        url: true,
        events: true,
        lastTriggeredAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Trigger webhook for transaction creation
   */
  async triggerTransactionCreated(
    transactionId: string,
    transactionData: any,
  ) {
    return this.triggerTransactionWebhook(
      transactionId,
      ExternalWebhookEvent.TRANSACTION_CREATED,
      {
        transactionId,
        status: 'PENDING',
        amount: transactionData.amount,
        merchantOrderId: transactionData.merchantOrderId,
        qrCode: transactionData.qrCode,
        createdAt: transactionData.createdAt,
        expiresAt: transactionData.expiresAt,
      },
    );
  }

  /**
   * Trigger webhook for transaction payment
   */
  async triggerTransactionPaid(
    transactionId: string,
    paymentData: any,
  ) {
    return this.triggerTransactionWebhook(
      transactionId,
      ExternalWebhookEvent.TRANSACTION_PAID,
      {
        transactionId,
        status: 'COMPLETED',
        amount: paymentData.amount,
        merchantOrderId: paymentData.merchantOrderId,
        paidAt: paymentData.processedAt || new Date().toISOString(),
        payerInfo: {
          name: paymentData.payerName,
          taxNumber: paymentData.payerTaxNumber,
        },
        metadata: paymentData.metadata,
      },
    );
  }

  /**
   * Trigger webhook for transaction failure
   */
  async triggerTransactionFailed(
    transactionId: string,
    failureData: any,
  ) {
    return this.triggerTransactionWebhook(
      transactionId,
      ExternalWebhookEvent.TRANSACTION_FAILED,
      {
        transactionId,
        status: 'FAILED',
        failedAt: new Date().toISOString(),
        reason: failureData.reason || 'Transaction processing failed',
        metadata: failureData.metadata,
      },
    );
  }

  /**
   * Trigger webhook for transaction expiration
   */
  async triggerTransactionExpired(
    transactionId: string,
    expirationData: any,
  ) {
    return this.triggerTransactionWebhook(
      transactionId,
      ExternalWebhookEvent.TRANSACTION_EXPIRED,
      {
        transactionId,
        status: 'EXPIRED',
        expiredAt: new Date().toISOString(),
        amount: expirationData.amount,
        merchantOrderId: expirationData.merchantOrderId,
      },
    );
  }
}