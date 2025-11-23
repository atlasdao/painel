import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PixService } from '../pix/pix.service';
import { PaymentLinkService } from '../payment-link/payment-link.service';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { CreatePixDto } from './dto/create-pix.dto';
import { ExternalWebhookService } from './external-webhook.service';

@Injectable()
export class ExternalApiService {
  constructor(
    private prisma: PrismaService,
    private pixService: PixService,
    private paymentLinkService: PaymentLinkService,
    private webhookService: ExternalWebhookService,
  ) {}

  async createPixTransaction(userId: string, apiKeyId: string, data: CreatePixDto) {
    // Validate user has commerce mode for external API usage
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        commerceApplication: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has commerce mode enabled for API usage
    const apiKeyRequest = await this.prisma.apiKeyRequest.findFirst({
      where: {
        userId: userId,
        status: 'APPROVED',
      },
    });

    if (!apiKeyRequest) {
      throw new ForbiddenException('API Key not found or not approved');
    }

    // Check usage type restrictions
    if (apiKeyRequest.usageType === 'SINGLE_CPF') {
      // For single CPF, we could enforce using the user's own tax number
      // but since the User model doesn't have taxNumber field, we'll just log a warning
      console.warn('[EXTERNAL_API] Single CPF restriction - unable to validate (no user taxNumber field)');
    }

    if (apiKeyRequest.usageType === 'MULTIPLE_CPF' && !user.commerceMode) {
      throw new ForbiddenException(
        'Commerce mode required to use multiple CPFs',
      );
    }

    // Get depixAddress from data
    const depixAddress = data.depixAddress;

    // If depixAddress is provided, generate QR code through PixService
    if (depixAddress) {
      try {
        const merchantOrderId = data.merchantOrderId || uuidv4();

        // Generate PIX QR code with metadata
        const qrCodeData = await this.pixService.generatePixQRCode(userId, {
          amount: data.amount,
          depixAddress: depixAddress,
          description: data.description || 'Pagamento via API',
          isApiRequest: true, // Bypass tier limits for External API requests
          metadata: {
            source: 'EXTERNAL_API',
            apiKeyRequestId: apiKeyRequest.id,
            merchantOrderId: merchantOrderId,
            taxNumber: data.taxNumber,
            webhookUrl: data.webhookUrl || data.webhook?.url, // Support both formats
            ...data.metadata,
          },
        });

        // Register webhook if provided
        let webhookInfo: any = null;
        if (data.webhook) {
          try {
            // Validate webhook URL if provided
            if (data.webhook.url) {
              const isValid = await this.webhookService.validateWebhookUrl(data.webhook.url);
              if (!isValid) {
                console.warn(`[EXTERNAL_API] Webhook URL validation failed for ${data.webhook.url}`);
                // Continue without failing the transaction
              }
            }

            webhookInfo = await this.webhookService.registerTransactionWebhook(
              qrCodeData.transactionId,
              apiKeyId,
              data.webhook,
            );

            // Trigger transaction.created event
            await this.webhookService.triggerTransactionCreated(
              qrCodeData.transactionId,
              {
                amount: data.amount,
                merchantOrderId: merchantOrderId,
                qrCode: qrCodeData.qrCode,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
              },
            );
          } catch (webhookError) {
            console.error('[EXTERNAL_API] Failed to register webhook:', webhookError);
            // Continue without webhook - don't fail the transaction
          }
        }

        // Return the QR code data along with transaction info
        const response: any = {
          id: qrCodeData.transactionId,
          status: 'PENDING',
          amount: data.amount,
          description: data.description || 'Pagamento via API',
          merchantOrderId: merchantOrderId,
          qrCode: qrCodeData.qrCode,
          qrCodeImage: qrCodeData.qrCodeImage,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        };

        // Add webhook info if registered
        if (webhookInfo) {
          response.webhook = webhookInfo;
        }

        return response;
      } catch (error) {
        console.error('[EXTERNAL_API] Failed to generate QR code:', error);
        throw new BadRequestException('Failed to generate PIX QR code');
      }
    }

    // Fallback: Create transaction without QR code if no wallet address provided
    const merchantOrderId = data.merchantOrderId || uuidv4();

    const transaction = await this.prisma.transaction.create({
      data: {
        userId: userId,
        type: 'DEPOSIT',
        status: 'PENDING',
        amount: data.amount,
        description: data.description || 'Pagamento via API',
        pixKey: data.taxNumber, // Store taxNumber in pixKey field temporarily
        pixKeyType: 'CPF',
        metadata: JSON.stringify({
          source: 'EXTERNAL_API',
          apiKeyRequestId: apiKeyRequest.id,
          merchantOrderId: merchantOrderId,
          taxNumber: data.taxNumber,
          webhookUrl: data.webhookUrl || data.webhook?.url,
          ...data.metadata,
        }),
      },
    });

    // Register webhook if provided (even without QR code)
    let webhookInfo: any = null;
    if (data.webhook) {
      try {
        // Validate webhook URL if provided
        if (data.webhook.url) {
          const isValid = await this.webhookService.validateWebhookUrl(data.webhook.url);
          if (!isValid) {
            console.warn(`[EXTERNAL_API] Webhook URL validation failed for ${data.webhook.url}`);
          }
        }

        webhookInfo = await this.webhookService.registerTransactionWebhook(
          transaction.id,
          apiKeyId,
          data.webhook,
        );

        // Trigger transaction.created event
        await this.webhookService.triggerTransactionCreated(
          transaction.id,
          {
            amount: data.amount,
            merchantOrderId: merchantOrderId,
            qrCode: null, // No QR code in fallback
            createdAt: transaction.createdAt,
            expiresAt: new Date(transaction.createdAt.getTime() + 30 * 60 * 1000),
          },
        );
      } catch (webhookError) {
        console.error('[EXTERNAL_API] Failed to register webhook (fallback):', webhookError);
        // Continue without webhook - don't fail the transaction
      }
    }

    const response: any = {
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      description: transaction.description,
      merchantOrderId: merchantOrderId,
      createdAt: transaction.createdAt,
      expiresAt: new Date(transaction.createdAt.getTime() + 30 * 60 * 1000), // 30 minutes expiry
    };

    // Add webhook info if registered
    if (webhookInfo) {
      response.webhook = webhookInfo;
    }

    return response;
  }

  async getTransactionStatus(userId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: userId,
      },
      select: {
        id: true,
        status: true,
        type: true,
        amount: true,
        description: true,
        pixKey: true,
        pixKeyType: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Parse metadata if it exists
    let parsedMetadata: any = {};
    if (transaction.metadata) {
      try {
        parsedMetadata = JSON.parse(transaction.metadata);
      } catch (e) {
        console.error('Failed to parse transaction metadata:', e);
      }
    }

    return {
      id: transaction.id,
      status: transaction.status,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      processedAt: transaction.processedAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      merchantOrderId: parsedMetadata.merchantOrderId || transaction.id,
      expiresAt: new Date(transaction.createdAt.getTime() + 30 * 60 * 1000), // 30 minutes from creation
      metadata: parsedMetadata,
    };
  }

  async listTransactions(userId: string, filters: any) {
    const where: any = {
      userId: userId,
    };

    // Apply filters
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    if (filters.merchantOrderId) {
      // merchantOrderId is stored in metadata
      where.metadata = {
        contains: filters.merchantOrderId,
      };
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          type: true,
          amount: true,
          description: true,
          pixKey: true,
          processedAt: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    // Parse metadata for each transaction
    const transactionsWithParsedMetadata = transactions.map(transaction => {
      let parsedMetadata: any = {};
      if (transaction.metadata) {
        try {
          parsedMetadata = JSON.parse(transaction.metadata);
        } catch (e) {
          console.error('Failed to parse transaction metadata:', e);
        }
      }
      return {
        ...transaction,
        merchantOrderId: parsedMetadata.merchantOrderId || transaction.id,
        expiresAt: new Date(transaction.createdAt.getTime() + 30 * 60 * 1000),
        metadata: parsedMetadata,
      };
    });

    return {
      data: transactionsWithParsedMetadata,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createPaymentLink(userId: string, data: any) {
    // Check if user has payment links enabled or commerce mode active
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        paymentLinksEnabled: true,
        commerceMode: true,
      },
    });

    if (!user?.paymentLinksEnabled && !user?.commerceMode) {
      throw new ForbiddenException('Payment links not enabled for this user');
    }

    // Create payment link directly through Prisma since we need to handle it differently
    const shortCode = this.generateShortCode();

    // Support both depixAddress and walletAddress field names
    const walletAddr = data.depixAddress || data.walletAddress;

    if (!walletAddr) {
      throw new BadRequestException('Wallet address (depixAddress or walletAddress) is required');
    }

    const paymentLink = await this.prisma.paymentLink.create({
      data: {
        userId: userId,
        shortCode: shortCode,
        amount: data.amount,
        isCustomAmount: data.isCustomAmount || false,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        description: data.description,
        walletAddress: walletAddr,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    return {
      id: paymentLink.id,
      shortCode: paymentLink.shortCode,
      amount: paymentLink.amount,
      isCustomAmount: paymentLink.isCustomAmount,
      minAmount: paymentLink.minAmount,
      maxAmount: paymentLink.maxAmount,
      description: paymentLink.description,
      isActive: paymentLink.isActive,
      expiresAt: paymentLink.expiresAt,
      createdAt: paymentLink.createdAt,
      paymentUrl: `https://painel.atlasdao.info/pay/${paymentLink.shortCode}`,
    };
  }

  private generateShortCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getPaymentLink(userId: string, linkId: string) {
    const link = await this.prisma.paymentLink.findFirst({
      where: {
        id: linkId,
        userId: userId,
      },
    });

    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    return {
      id: link.id,
      shortCode: link.shortCode,
      description: link.description,
      amount: link.amount,
      isCustomAmount: link.isCustomAmount,
      minAmount: link.minAmount,
      maxAmount: link.maxAmount,
      currentUses: link.totalPayments,
      totalAmount: link.totalAmount,
      isActive: link.isActive,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      paymentUrl: `https://painel.atlasdao.info/pay/${link.shortCode}`,
    };
  }

  async listPaymentLinks(userId: string, filters: any) {
    const where: any = {
      userId: userId,
    };

    // Apply filters
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true';
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const [links, total] = await Promise.all([
      this.prisma.paymentLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          shortCode: true,
          description: true,
          amount: true,
          isCustomAmount: true,
          minAmount: true,
          maxAmount: true,
          totalPayments: true,
          totalAmount: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.paymentLink.count({ where }),
    ]);

    return {
      data: links.map(link => ({
        ...link,
        currentUses: link.totalPayments,
        paymentUrl: `https://painel.atlasdao.info/pay/${link.shortCode}`,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelTransaction(userId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: userId,
        status: 'PENDING',
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found or already processed');
    }

    // Update transaction status
    const existingMetadata = transaction.metadata
      ? JSON.parse(transaction.metadata as string)
      : {};

    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
        metadata: JSON.stringify({
          ...existingMetadata,
          cancelledAt: new Date().toISOString(),
          cancelledBy: 'API',
        }),
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      message: 'Transaction cancelled successfully',
    };
  }

  async getApiUsageStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get API key request for this user
    const apiKeyRequest = await this.prisma.apiKeyRequest.findFirst({
      where: {
        userId: userId,
        status: 'APPROVED',
      },
    });

    if (!apiKeyRequest) {
      throw new NotFoundException('API Key not found');
    }

    // Get usage stats
    const [totalRequests, successfulRequests, transactions, paymentLinks] = await Promise.all([
      this.prisma.apiKeyUsageLog.count({
        where: {
          apiKeyRequestId: apiKeyRequest.id,
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.apiKeyUsageLog.count({
        where: {
          apiKeyRequestId: apiKeyRequest.id,
          statusCode: { gte: 200, lt: 300 },
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.transaction.count({
        where: {
          userId: userId,
          createdAt: { gte: startDate },
          metadata: {
            contains: 'EXTERNAL_API',
          },
        },
      }),
      this.prisma.paymentLink.count({
        where: {
          userId: userId,
          createdAt: { gte: startDate },
        },
      }),
    ]);

    // Get daily usage for chart
    const dailyUsage = await this.prisma.apiKeyUsageLog.groupBy({
      by: ['createdAt'],
      where: {
        apiKeyRequestId: apiKeyRequest.id,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Format daily usage data
    const formattedDailyUsage = {};
    dailyUsage.forEach(day => {
      const date = new Date(day.createdAt).toISOString().split('T')[0];
      formattedDailyUsage[date] = (formattedDailyUsage[date] || 0) + day._count;
    });

    return {
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        days: days,
      },
      summary: {
        totalRequests,
        successfulRequests,
        errorRate: totalRequests > 0
          ? ((totalRequests - successfulRequests) / totalRequests * 100).toFixed(2) + '%'
          : '0%',
        transactionsCreated: transactions,
        paymentLinksCreated: paymentLinks,
      },
      dailyUsage: formattedDailyUsage,
      limits: {
        requestsPerMinute: 100,
        requestsPerDay: 10000,
        usageType: apiKeyRequest.usageType,
      },
    };
  }
}