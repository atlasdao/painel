const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function simulateWebhookPaymentCompleted() {
  try {
    console.log('🔍 Procurando transação com payment link para simular webhook...');

    // Find a transaction associated with the payment link that has webhooks
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: '95885f29-e187-49e5-ae66-d9e977e3e93d', // The one we just marked as COMPLETED
      },
      include: {
        user: true,
      },
    });

    if (!transaction) {
      console.log('❌ Transação não encontrada');
      return;
    }

    console.log('📋 Transação encontrada:', {
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      externalId: transaction.externalId,
      metadata: transaction.metadata
    });

    // Reset to PENDING first
    console.log('🔄 Resetando status para PENDING...');
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'PENDING',
        processedAt: null
      },
    });

    // Now simulate an incoming webhook by calling the webhook service directly
    // First, let's import the webhook service
    const { WebhookService } = require('./dist/webhooks/webhook.service');
    const { PrismaService } = require('./dist/prisma/prisma.service');
    const { TransactionRepository } = require('./dist/repositories/transaction.repository');
    const { AuditLogRepository } = require('./dist/repositories/audit-log.repository');
    const { BotSyncService } = require('./dist/common/services/bot-sync.service');
    const { WebhookService: PaymentLinkWebhookService } = require('./dist/payment-link/webhook.service');
    const { EncryptionUtil } = require('./dist/common/utils/encryption.util');
    const { HttpService } = require('@nestjs/axios');

    // Create service instances
    const prismaService = new PrismaService();
    const transactionRepo = new TransactionRepository(prismaService);
    const auditLogRepo = new AuditLogRepository(prismaService);
    const botSyncService = new BotSyncService(prismaService);
    const encryptionUtil = new EncryptionUtil();
    const httpService = new HttpService();
    const paymentLinkWebhookService = new PaymentLinkWebhookService(prismaService, encryptionUtil, httpService);

    const webhookService = new WebhookService(
      prismaService,
      transactionRepo,
      auditLogRepo,
      botSyncService,
      paymentLinkWebhookService
    );

    // Simulate webhook event data
    const webhookEventData = {
      qrId: transaction.externalId || 'test-external-id',
      status: 'depix_sent', // This maps to COMPLETED in our system
      bankTxId: 'test-bank-tx',
      blockchainTxID: 'test-blockchain-tx',
      customerMessage: 'Teste de webhook payment.completed',
      payerName: 'Test Payer',
      payerEUID: 'test-euid',
      payerTaxNumber: '12345678900',
      expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      pixKey: 'test-pix-key',
      valueInCents: transaction.amount,
    };

    console.log('🎯 Simulando webhook de payment completed...');
    const result = await webhookService.processDepositWebhook(webhookEventData);

    console.log('✅ Webhook processado:', result);
    console.log('🎉 Verifique os logs do servidor para ver se o webhook payment.completed foi disparado!');

  } catch (error) {
    console.error(`❌ Erro:`, error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the simulation
simulateWebhookPaymentCompleted();