// Test script for bot database connection
import { BotDatabasePool } from '../Atlas-API/src/common/config/bot-database.config';

async function testBotConnection() {
  console.log('Testing bot database connection...');

  try {
    const isConnected = await BotDatabasePool.testConnection();

    if (isConnected) {
      console.log('✅ Bot database connection successful');

      // Test querying bot level data
      const pool = BotDatabasePool.getInstance();
      const client = await pool.connect();

      try {
        const levelConfigQuery = `
          SELECT level, name, daily_limit_brl, min_transactions_for_upgrade, min_volume_for_upgrade
          FROM reputation_levels_config
          ORDER BY level
          LIMIT 5
        `;

        const result = await client.query(levelConfigQuery);
        console.log('✅ Sample bot level configurations:');
        console.table(result.rows);

      } catch (queryError: any) {
        console.warn('⚠️ Could not query bot level data:', queryError.message);
        console.log('This is expected if bot database is not accessible from this environment');
      } finally {
        client.release();
      }
    } else {
      console.log('❌ Bot database connection failed');
      console.log('This is expected if bot database is not accessible from this environment');
    }
  } catch (error: any) {
    console.log('❌ Bot database connection error:', error.message);
    console.log('This is expected if bot database is not accessible from this environment');
  } finally {
    await BotDatabasePool.close();
  }
}

testBotConnection();