const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function markTransactionAsPaid() {
  try {
    console.log('🔍 Finding transaction 25a4abb8-e825-4cbe-817a-1f208256c0cb...');

    // First, find the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: '25a4abb8-e825-4cbe-817a-1f208256c0cb' },
      include: {
        user: true
      }
    });

    if (!transaction) {
      console.log('❌ Transaction not found');
      return;
    }

    console.log('📋 Transaction details:', {
      id: transaction.id,
      userId: transaction.userId,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      metadata: transaction.metadata
    });

    // Update transaction to COMPLETED status
    console.log('💰 Marking transaction as COMPLETED...');

    const updatedTransaction = await prisma.transaction.update({
      where: { id: '25a4abb8-e825-4cbe-817a-1f208256c0cb' },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Transaction marked as COMPLETED:', {
      id: updatedTransaction.id,
      status: updatedTransaction.status,
      processedAt: updatedTransaction.processedAt
    });

    // Check if this transaction has a payment link metadata
    if (transaction.metadata && typeof transaction.metadata === 'object') {
      const metadata = transaction.metadata;
      console.log('🔗 Transaction metadata:', metadata);

      if (metadata.paymentLinkId) {
        console.log(`📡 Payment link ID found: ${metadata.paymentLinkId}`);
        console.log('🎯 This should trigger webhook events for the payment link!');

        // Check for existing webhooks for this payment link
        const webhooks = await prisma.paymentLinkWebhook.findMany({
          where: {
            paymentLinkId: metadata.paymentLinkId,
            active: true
          }
        });

        console.log(`📢 Found ${webhooks.length} active webhooks for this payment link`);
        webhooks.forEach((webhook, index) => {
          console.log(`  ${index + 1}. ${webhook.name} - ${webhook.url}`);
        });
      }
    }

    console.log('🎉 Transaction update completed! Check backend logs for webhook activity.');

  } catch (error) {
    console.error('❌ Error marking transaction as paid:', error);
  } finally {
    await prisma.$disconnect();
  }
}

markTransactionAsPaid();