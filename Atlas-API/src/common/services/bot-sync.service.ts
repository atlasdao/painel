import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BotDatabasePool, BotUser, BotLevelConfig } from '../config/bot-database.config';

@Injectable()
export class BotSyncService implements OnModuleInit {
  private readonly logger = new Logger(BotSyncService.name);
  private syncInterval: NodeJS.Timeout;
  private readonly syncEnabled: boolean;
  private readonly syncIntervalMs: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.syncEnabled = this.configService.get('BOT_SYNC_ENABLED') === 'true';
    this.syncIntervalMs = parseInt(this.configService.get('BOT_SYNC_INTERVAL') || '300000');
  }

  async onModuleInit() {
    if (!this.syncEnabled) {
      this.logger.log('Bot sync disabled by configuration');
      return;
    }

    // Test bot database connection
    const isConnected = await BotDatabasePool.testConnection();
    if (!isConnected) {
      this.logger.error('Bot database connection failed - sync disabled');
      return;
    }

    this.logger.log('Bot sync service initialized - starting periodic sync');
    this.startPeriodicSync();
  }

  private startPeriodicSync() {
    this.syncInterval = setInterval(async () => {
      try {
        await this.performBidirectionalSync();
      } catch (error) {
        this.logger.error('Periodic sync failed:', error);
      }
    }, this.syncIntervalMs);

    // Run initial sync
    setTimeout(() => this.performBidirectionalSync(), 5000);
  }

  async performBidirectionalSync(): Promise<void> {
    this.logger.log('Starting bidirectional sync');

    try {
      // Sync Atlas Painel → Bot Database
      await this.syncPainelToBot();

      // Sync Bot Database → Atlas Painel
      await this.syncBotToPainel();

      this.logger.log('Bidirectional sync completed successfully');
    } catch (error) {
      this.logger.error('Bidirectional sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync changes from Atlas Painel to Bot Database
   */
  private async syncPainelToBot(): Promise<void> {
    try {
      // Find Atlas Painel users with verified tax numbers (EUIDs) but no bot linkage
      const unlinkedUsers = await this.prisma.user.findMany({
        where: {
          externalUserId: { not: null },
          botExternalId: null,
        },
        include: {
          userLevel: true,
        },
      });

      if (unlinkedUsers.length === 0) {
        this.logger.debug('No unlinked users found for Painel → Bot sync');
        return;
      }

      this.logger.log(`Syncing ${unlinkedUsers.length} users from Painel to Bot`);

      const botPool = BotDatabasePool.getInstance();

      for (const user of unlinkedUsers) {
        try {
          // Check if bot user exists with this EUID (Eulen ID)
          const result = await botPool.query(
            'SELECT telegram_user_id FROM users WHERE external_id = $1',
            [user.externalUserId]
          );

          if (result.rows.length > 0) {
            const botUserId = result.rows[0].telegram_user_id;

            // Bot's external_id already contains the EUID, no need to update it

            // Update Atlas Painel user with bot linkage
            await this.prisma.user.update({
              where: { id: user.id },
              data: { botExternalId: botUserId.toString() },
            });

            // Sync user level to bot
            if (user.userLevel?.level) {
              await this.syncUserLevelToBot(user.id, user.userLevel.level);
            }

            this.logger.log(`Linked user ${user.username} (EUID: ${user.externalUserId})`);
          }
        } catch (error) {
          this.logger.error(`Failed to sync user ${user.username}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to sync Painel to Bot:', error);
    }
  }

  /**
   * Sync changes from Bot Database to Atlas Painel
   */
  private async syncBotToPainel(): Promise<void> {
    try {
      const botPool = BotDatabasePool.getInstance();

      // Find bot users with external_id but outdated levels in Atlas Painel
      const result = await botPool.query(`
        SELECT
          u.telegram_user_id,
          u.external_id,
          u.reputation_level,
          u.daily_limit_brl,
          u.total_volume_brl,
          u.completed_transactions
        FROM users u
        WHERE u.external_id IS NOT NULL
      `);

      if (result.rows.length === 0) {
        this.logger.debug('No linked bot users found for Bot → Painel sync');
        return;
      }

      this.logger.log(`Checking ${result.rows.length} linked users for Bot → Painel sync`);

      for (const botUser of result.rows) {
        try {
          // Find corresponding Atlas Painel user
          const painelUser = await this.prisma.user.findUnique({
            where: { id: botUser.external_id },
            include: {
              userLevel: true,
            },
          });

          if (!painelUser) {
            this.logger.warn(`Atlas Painel user not found for bot user ${botUser.telegram_user_id}`);
            continue;
          }

          // Check if bot level is different from painel level
          const painelLevel = painelUser.userLevel?.level || 0;
          if (botUser.reputation_level !== painelLevel) {
            this.logger.log(
              `Level mismatch for user ${painelUser.username}: Bot=${botUser.reputation_level}, Painel=${painelLevel}`
            );

            // Bot database is source of truth for levels - update Atlas Painel
            await this.syncUserLevelFromBot(painelUser.id, botUser.reputation_level);
          }
        } catch (error) {
          this.logger.error(`Failed to sync bot user ${botUser.telegram_user_id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to sync Bot to Painel:', error);
    }
  }

  /**
   * Update user level in bot database
   */
  async syncUserLevelToBot(userId: string, level: number): Promise<void> {
    try {
      // Get the user's bot external ID
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { botExternalId: true, username: true },
      });

      if (!user?.botExternalId) {
        this.logger.warn(`Cannot sync level to bot - user ${userId} not linked`);
        return;
      }

      const botPool = BotDatabasePool.getInstance();

      // Get level configuration from bot database
      const levelResult = await botPool.query(
        'SELECT daily_limit_brl FROM reputation_levels_config WHERE level = $1',
        [level]
      );

      if (levelResult.rows.length === 0) {
        this.logger.error(`Level ${level} not found in bot database`);
        return;
      }

      const dailyLimit = levelResult.rows[0].daily_limit_brl;

      // Update bot user level and limits
      await botPool.query(`
        UPDATE users
        SET
          reputation_level = $1,
          daily_limit_brl = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE telegram_user_id = $3
      `, [level, dailyLimit, parseInt(user.botExternalId)]);

      this.logger.log(`Synced user ${user.username} level ${level} to bot database`);
    } catch (error) {
      this.logger.error(`Failed to sync user level to bot:`, error);
      throw error;
    }
  }

  /**
   * Update user level in Atlas Painel from bot database
   */
  async syncUserLevelFromBot(userId: string, botLevel: number): Promise<void> {
    try {
      // Find the corresponding level configuration in Atlas Painel
      const levelConfig = await this.prisma.levelConfig.findUnique({
        where: { level: botLevel },
      });

      if (!levelConfig) {
        this.logger.error(`Level ${botLevel} not found in Atlas Painel`);
        return;
      }

      // Check if user has a level entry
      const existingUserLevel = await this.prisma.userLevel.findUnique({
        where: { userId },
      });

      if (existingUserLevel) {
        // Update existing level
        await this.prisma.userLevel.update({
          where: { userId },
          data: {
            level: botLevel,
            lastLevelUpgrade: new Date(),
          },
        });
      } else {
        // Create new level entry
        await this.prisma.userLevel.create({
          data: {
            userId,
            level: botLevel,
            totalVolumeBrl: 0,
            completedTransactions: 0,
            dailyLimitBrl: levelConfig.dailyLimitBrl,
            lastLevelUpgrade: new Date(),
          },
        });
      }

      this.logger.log(`Updated user ${userId} to level ${botLevel} from bot database`);
    } catch (error) {
      this.logger.error(`Failed to sync user level from bot:`, error);
      throw error;
    }
  }

  /**
   * Sync transaction data to bot database (called after transaction completion)
   */
  async syncTransactionToBot(userId: string, amount: number, type: 'DEPOSIT' | 'WITHDRAWAL'): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { botExternalId: true, username: true },
      });

      if (!user?.botExternalId) {
        this.logger.debug(`User ${userId} not linked to bot - skipping transaction sync`);
        return;
      }

      const botPool = BotDatabasePool.getInstance();

      // Update bot user transaction stats
      if (type === 'DEPOSIT') {
        await botPool.query(`
          UPDATE users
          SET
            total_volume_brl = total_volume_brl + $1,
            completed_transactions = completed_transactions + 1,
            last_transaction_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE telegram_user_id = $2
        `, [amount, parseInt(user.botExternalId)]);

        this.logger.log(`Synced deposit ${amount} BRL for user ${user.username} to bot`);
      }
    } catch (error) {
      this.logger.error(`Failed to sync transaction to bot:`, error);
    }
  }

  /**
   * Find bot user by EUID (for manual linking)
   */
  async findBotUserByEUID(euid: string): Promise<BotUser | null> {
    try {
      const botPool = BotDatabasePool.getInstance();
      const result = await botPool.query(
        'SELECT * FROM users WHERE payer_cpf_cnpj = $1',
        [euid]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      this.logger.error(`Failed to find bot user by EUID:`, error);
      return null;
    }
  }

  /**
   * Manual user linking (for admin interface)
   */
  async linkUserManually(painelUserId: string, botTelegramId: number): Promise<boolean> {
    try {
      const botPool = BotDatabasePool.getInstance();

      // Update bot user with external_id
      await botPool.query(
        'UPDATE users SET external_id = $1 WHERE telegram_user_id = $2',
        [painelUserId, botTelegramId]
      );

      // Update Atlas Painel user with bot linkage
      await this.prisma.user.update({
        where: { id: painelUserId },
        data: { botExternalId: botTelegramId.toString() },
      });

      this.logger.log(`Manually linked user ${painelUserId} with bot user ${botTelegramId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to manually link users:`, error);
      return false;
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus() {
    try {
      const botPool = BotDatabasePool.getInstance();

      // Count linked users
      const linkedUsersResult = await botPool.query(
        'SELECT COUNT(*) as linked_count FROM users WHERE external_id IS NOT NULL'
      );

      const painelUsersWithEUID = await this.prisma.user.count({
        where: { verifiedTaxNumber: { not: null } },
      });

      const linkedUsersCount = parseInt(linkedUsersResult.rows[0].linked_count);

      return {
        syncEnabled: this.syncEnabled,
        syncInterval: this.syncIntervalMs,
        linkedUsers: linkedUsersCount,
        painelUsersWithEUID,
        lastSync: new Date(),
        botDatabaseConnected: await BotDatabasePool.testConnection(),
      };
    } catch (error) {
      this.logger.error('Failed to get sync status:', error);
      return {
        syncEnabled: this.syncEnabled,
        error: error.message,
      };
    }
  }

  onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.logger.log('Bot sync service stopped');
    }
  }
}