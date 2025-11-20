const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function markTransactionCompleted(transactionId) {
  try {
    console.log(`🔍 Procurando transação: ${transactionId}`);

    // First check if transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      console.log(`❌ Transação não encontrada: ${transactionId}`);
      return;
    }

    console.log(`📋 Transação encontrada:`, {
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      type: transaction.type,
    });

    // Update to COMPLETED status
    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'COMPLETED' },
    });

    console.log(`✅ Transação marcada como COMPLETED:`, {
      id: updated.id,
      status: updated.status,
      amount: updated.amount,
    });

  } catch (error) {
    console.error(`❌ Erro:`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run with the provided transaction ID
markTransactionCompleted('b1129189-357c-4110-97cb-9d3da858f5bb');