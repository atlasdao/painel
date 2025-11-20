const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTransactionDetails() {
  try {
    console.log('🔍 Checking transaction details...');

    const transaction = await prisma.transaction.findUnique({
      where: { id: '864bee30-9809-4b53-944a-9c1c1ea10253' },
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

    // Check if this has payment link metadata
    const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
    console.log('🔗 Parsed metadata:', metadata);

    if (metadata.paymentLinkId) {
      console.log('📡 Found payment link ID: ' + metadata.paymentLinkId);

      // Now check webhook events for this payment link in the last hour
      const webhookEvents = await prisma.paymentLinkWebhookEvent.findMany({
        where: {
          paymentLinkId: metadata.paymentLinkId,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          webhook: true
        }
      });

      console.log('📢 Found ' + webhookEvents.length + ' webhook events for this payment link:');

      webhookEvents.forEach((event, index) => {
        console.log('  ' + (index + 1) + '. ' + event.eventType + ' - ' + event.status + ' (' + event.createdAt + ')');
        console.log('     Webhook: ' + event.webhook.name + ' → ' + event.webhook.url);
        console.log('     Response: ' + (event.responseCode || 'N/A') + ' - ' + event.attempts + '/' + event.maxAttempts + ' attempts');

        // Check payload for transaction details
        if (event.payload && typeof event.payload === 'object') {
          const payload = event.payload;
          if (payload.transaction) {
            console.log('     Transaction in payload: ' + payload.transaction.id + ' (status: ' + payload.transaction.status + ')');
          }
        }
        console.log('');
      });

      // Summary
      const eventTypes = webhookEvents.map(e => e.eventType);
      const uniqueEventTypes = [...new Set(eventTypes)];
      console.log('🎯 Summary of webhook event types triggered:');
      uniqueEventTypes.forEach(type => {
        const count = eventTypes.filter(t => t === type).length;
        console.log('  - ' + type + ' (' + count + ' events)');
      });

    } else {
      console.log('⚠️  No payment link ID found in transaction metadata');
    }

  } catch (error) {
    console.error('❌ Error checking transaction details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransactionDetails();