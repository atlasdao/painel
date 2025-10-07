const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function investigateTransactions() {
  try {
    console.log('🔍 INVESTIGATING DATABASE REALITY...\n');

    // Check all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      }
    });
    console.log('📊 USERS IN DATABASE:');
    users.forEach(user => {
      console.log(`- ${user.email} (${user.username}) - Role: ${user.role}`);
    });
    console.log('');

    // Check all transactions
    const allTransactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            email: true,
            username: true,
            role: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('💰 ALL TRANSACTIONS IN DATABASE:');
    console.log(`Total transactions: ${allTransactions.length}`);
    allTransactions.forEach(tx => {
      console.log(`- ID: ${tx.id}`);
      console.log(`  User: ${tx.user.email} (${tx.user.role})`);
      console.log(`  Type: ${tx.type}`);
      console.log(`  Status: ${tx.status}`);
      console.log(`  Amount: R$ ${tx.amount.toFixed(2)}`);
      console.log(`  Created: ${tx.createdAt.toISOString()}`);
      console.log(`  Description: ${tx.description || 'None'}`);
      console.log('---');
    });

    // Check completed transactions only
    const completedTransactions = allTransactions.filter(tx => tx.status === 'COMPLETED');
    console.log(`\n✅ COMPLETED TRANSACTIONS: ${completedTransactions.length}`);

    let totalRevenue = 0;
    completedTransactions.forEach(tx => {
      console.log(`- ${tx.type}: R$ ${tx.amount.toFixed(2)} (${tx.createdAt.toISOString().split('T')[0]})`);
      if (tx.type === 'DEPOSIT') {
        totalRevenue += tx.amount;
      }
    });

    console.log(`\n💵 TOTAL COMPLETED DEPOSIT REVENUE: R$ ${totalRevenue.toFixed(2)}`);

    // Check transactions for today (Brazil timezone)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const todayTransactions = completedTransactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      return txDate >= startOfDay && txDate < endOfDay;
    });

    console.log(`\n📅 TODAY'S COMPLETED TRANSACTIONS (${today.toISOString().split('T')[0]}): ${todayTransactions.length}`);
    let todayRevenue = 0;
    todayTransactions.forEach(tx => {
      console.log(`- ${tx.type}: R$ ${tx.amount.toFixed(2)}`);
      if (tx.type === 'DEPOSIT') {
        todayRevenue += tx.amount;
      }
    });
    console.log(`💵 TODAY'S REVENUE: R$ ${todayRevenue.toFixed(2)}`);

    // Check payment links
    const paymentLinks = await prisma.paymentLink.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true,
          }
        }
      }
    });

    console.log(`\n🔗 PAYMENT LINKS: ${paymentLinks.length}`);
    paymentLinks.forEach(link => {
      console.log(`- Code: ${link.shortCode}`);
      console.log(`  User: ${link.user.email} (${link.user.role})`);
      console.log(`  Amount: ${link.amount ? `R$ ${link.amount.toFixed(2)}` : 'Custom'}`);
      console.log(`  Total Payments: ${link.totalPayments}`);
      console.log(`  Total Amount: R$ ${link.totalAmount.toFixed(2)}`);
      console.log(`  Active: ${link.isActive}`);
      console.log('---');
    });

    // Summary
    console.log('\n🎯 INVESTIGATION SUMMARY:');
    console.log(`- Total users: ${users.length}`);
    console.log(`- Total transactions: ${allTransactions.length}`);
    console.log(`- Completed transactions: ${completedTransactions.length}`);
    console.log(`- Today's transactions: ${todayTransactions.length}`);
    console.log(`- Total revenue (all time): R$ ${totalRevenue.toFixed(2)}`);
    console.log(`- Today's revenue: R$ ${todayRevenue.toFixed(2)}`);
    console.log(`- Payment links: ${paymentLinks.length}`);

  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateTransactions();