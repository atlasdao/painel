import { Pool } from 'pg';
import { Logger } from '@nestjs/common';

const logger = new Logger('BotDatabaseConfig');

export const BOT_DATABASE_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'atlas_bridge',
  user: 'master',
  // No password for bot database according to specifications
  max: 10, // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: false, // Local connection, no SSL needed
};

export class BotDatabasePool {
  private static instance: Pool;

  static getInstance(): Pool {
    if (!this.instance) {
      this.instance = new Pool(BOT_DATABASE_CONFIG);

      this.instance.on('connect', () => {
        logger.log('Connected to Atlas Bridge bot database');
      });

      this.instance.on('error', (err) => {
        logger.error('Bot database pool error:', err);
      });

      this.instance.on('remove', () => {
        logger.log('Client removed from bot database pool');
      });
    }

    return this.instance;
  }

  static async testConnection(): Promise<boolean> {
    try {
      const pool = this.getInstance();
      const client = await pool.connect();

      // Test query to verify connection and access to bot tables
      const result = await client.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'reputation_levels_config', 'reputation_level_history')
      `);

      client.release();

      if (result.rows.length >= 2) {
        logger.log('Bot database connection test successful');
        return true;
      } else {
        logger.warn('Bot database missing required tables');
        return false;
      }
    } catch (error) {
      logger.error('Bot database connection test failed:', error);
      return false;
    }
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.end();
      logger.log('Bot database pool closed');
    }
  }
}

// Bot database table interfaces for type safety
export interface BotUser {
  id: string;
  external_id?: string; // EUID linking field
  reputation_level: number;
  daily_limit_brl: number;
  created_at: Date;
  updated_at: Date;
}

export interface BotLevelConfig {
  level: number;
  name: string;
  daily_limit_brl: number;
  max_per_transaction_brl?: number;
  min_transactions_for_upgrade: number;
  min_volume_for_upgrade: number;
  description: string;
}

export interface BotLevelHistory {
  id: string;
  user_id: string;
  old_level: number;
  new_level: number;
  old_limit: number;
  new_limit: number;
  reason: string;
  created_at: Date;
}