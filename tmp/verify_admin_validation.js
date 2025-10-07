const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Set up Prisma client with correct schema path
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://atlas_user:atlas_pass123@localhost:5432/atlas_db'
    }
  }
});

async function verifyAdminValidation() {
  try {
    console.log('Checking admin account validation status...\n');

    // Find admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        telegram_username: 'admin'
      }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:');
    console.log(`- ID: ${adminUser.telegram_user_id}`);
    console.log(`- Username: ${adminUser.telegram_username}`);
    console.log(`- External ID (EUID): ${adminUser.external_id}`);
    console.log(`- Is Verified: ${adminUser.is_verified}`);
    console.log(`- Verification Status: ${adminUser.verification_status}`);
    console.log(`- Verified At: ${adminUser.verified_at}`);
    console.log(`- Payment ID: ${adminUser.verification_payment_id}`);
    console.log(`- DePix TXID: ${adminUser.verification_depix_txid}`);
    console.log(`- Payer Name: ${adminUser.payer_name}`);
    console.log(`- Payer CPF/CNPJ: ${adminUser.payer_cpf_cnpj}`);

    // Check if fully validated
    const isFullyValidated = adminUser.is_verified &&
                            adminUser.verification_status === 'verified' &&
                            adminUser.external_id === 'EU016854595427927' &&
                            adminUser.verified_at &&
                            adminUser.verification_payment_id &&
                            adminUser.verification_depix_txid;

    console.log(`\n${isFullyValidated ? '✅' : '❌'} Admin account validation status: ${isFullyValidated ? 'COMPLETE' : 'INCOMPLETE'}`);

    if (!isFullyValidated) {
      console.log('\n❌ Missing validation fields:');
      if (!adminUser.is_verified) console.log('- is_verified is false');
      if (adminUser.verification_status !== 'verified') console.log('- verification_status is not "verified"');
      if (adminUser.external_id !== 'EU016854595427927') console.log('- external_id does not match expected EUID');
      if (!adminUser.verified_at) console.log('- verified_at is null');
      if (!adminUser.verification_payment_id) console.log('- verification_payment_id is null');
      if (!adminUser.verification_depix_txid) console.log('- verification_depix_txid is null');
    }

    // Also check verification transactions
    const verificationTx = await prisma.verificationTransaction.findFirst({
      where: {
        user_id: adminUser.telegram_user_id
      }
    });

    if (verificationTx) {
      console.log('\n✅ Verification transaction found:');
      console.log(`- Transaction ID: ${verificationTx.id}`);
      console.log(`- Status: ${verificationTx.status}`);
      console.log(`- Payment ID: ${verificationTx.payment_id}`);
      console.log(`- DePix TXID: ${verificationTx.depix_txid}`);
    } else {
      console.log('\n❌ No verification transaction found');
    }

  } catch (error) {
    console.error('Error verifying admin validation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdminValidation();