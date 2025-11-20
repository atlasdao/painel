import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'info', 'warn'],
});

async function main() {
  console.log('Testing Prisma connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  try {
    const result = await prisma.$queryRaw`SELECT current_database(), current_user`;
    console.log('Connected to database:', result);
    
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    console.log('Tables in database:', tables);
    
    const userCount = await prisma.$queryRaw`SELECT COUNT(*) FROM "User"`;
    console.log('User count:', userCount);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
