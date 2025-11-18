import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const txId = '33e5f017-4bbb-40f3-bc41-760ebe2ef351'; // The PENDING one
  
  const tx = await prisma.transaction.findUnique({
    where: { id: txId },
    select: {
      id: true,
      externalId: true,
      status: true,
      amount: true,
      metadata: true
    }
  });
  
  console.log('\n📋 Transaction Details:');
  console.log(JSON.stringify(tx, null, 2));
  
  if (tx && tx.externalId) {
    console.log(`\n✅ External ID found: ${tx.externalId}`);
    console.log(`   This will be used to query Eulen API: /deposit-status?id=${tx.externalId}`);
    console.log(`   Current status in DB: ${tx.status}`);
  }
}

main()
  .catch((e) => console.error('Error:', e))
  .finally(async () => await prisma.$disconnect());
