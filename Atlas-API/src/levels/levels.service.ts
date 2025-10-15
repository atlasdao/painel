import { Injectable, NotFoundException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BotSyncService } from '../common/services/bot-sync.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class LevelsService {
  private readonly logger = new Logger(LevelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botSyncService: BotSyncService,
  ) {}

  async getLevelConfigurations() {
    try {
      const configurations = await this.prisma.levelConfig.findMany({
        orderBy: { level: 'asc' }
      });

      if (configurations.length === 0) {
        this.logger.warn('No level configurations found in database - using defaults');
        // Return default configurations if none exist
        return this.getDefaultConfigurations().map(config => this.mapConfigurationToFrontend(config));
      }

      this.logger.log(`Retrieved ${configurations.length} level configurations from database`);
      return configurations.map(config => this.mapConfigurationToFrontend(config));
    } catch (error) {
      this.logger.error('Error fetching level configurations:', error);
      // Return defaults as fallback
      return this.getDefaultConfigurations().map(config => this.mapConfigurationToFrontend(config));
    }
  }

  async getUserLevel(userId: string) {
    try {
      let userLevel = await this.prisma.userLevel.findUnique({
        where: { userId },
        include: {
          user: true
        }
      });

      if (!userLevel) {
        // Create default level 0 for new users
        const defaultConfig = await this.getOrCreateLevelConfiguration(0);
        userLevel = await this.prisma.userLevel.create({
          data: {
            userId,
            level: 0,
            totalVolumeBrl: 0,
            completedTransactions: 0
          },
          include: {
            user: true
          }
        });
      }

      // Get level configuration for this user's level
      let configuration: any = null;
      try {
        const levelConfig = await this.prisma.levelConfig.findUnique({
          where: { level: userLevel.level }
        });
        if (levelConfig) {
          configuration = this.mapConfigurationToFrontend(levelConfig);
        }
      } catch (error) {
        console.log('Error fetching level configuration:', error);
      }

      return this.mapUserLevelToFrontend(userLevel, configuration);
    } catch (error) {
      console.log('Error fetching user level:', error);
      throw new NotFoundException('Usuário não encontrado');
    }
  }

  async getLevelHistory(userId: string) {
    try {
      return await this.prisma.levelHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
    } catch (error) {
      console.log('Error fetching level history:', error);
      return [];
    }
  }

  async getLevelStats(userId: string) {
    try {
      // Get raw data without transformation first
      const rawUserLevel = await this.prisma.userLevel.findUnique({
        where: { userId },
        include: { user: true }
      });

      if (!rawUserLevel) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Get raw configurations
      const rawConfigurations = await this.prisma.levelConfig.findMany({
        orderBy: { level: 'asc' }
      });

      if (rawConfigurations.length === 0) {
        // Use default configurations
        const defaultConfigs = this.getDefaultConfigurations();
        const currentConfig = defaultConfigs.find(c => c.level === rawUserLevel.level);
        const nextConfig = defaultConfigs.find(c => c.level === rawUserLevel.level + 1);

        let progressToNext = 0;
        let nextLevelRequirements: { volumeNeeded: number; transactionsNeeded: number } | null = null;

        if (nextConfig) {
          const volumeProgress = Number(rawUserLevel.totalVolumeBrl) / Number(nextConfig.minVolumeForUpgrade);
          const countProgress = rawUserLevel.completedTransactions / nextConfig.minTransactionsForUpgrade;
          progressToNext = Math.min(volumeProgress, countProgress) * 100;

          nextLevelRequirements = {
            volumeNeeded: Math.max(0, Number(nextConfig.minVolumeForUpgrade) - Number(rawUserLevel.totalVolumeBrl)),
            transactionsNeeded: Math.max(0, nextConfig.minTransactionsForUpgrade - rawUserLevel.completedTransactions)
          };
        }

        const canUpgrade = nextConfig &&
          Number(rawUserLevel.totalVolumeBrl) >= Number(nextConfig.minVolumeForUpgrade) &&
          rawUserLevel.completedTransactions >= nextConfig.minTransactionsForUpgrade;

        return {
          currentLevel: rawUserLevel.level,
          nextLevel: nextConfig ? nextConfig.level : null,
          progressToNext,
          totalTransactionVolume: Number(rawUserLevel.totalVolumeBrl),
          totalTransactionCount: rawUserLevel.completedTransactions,
          canUpgrade,
          nextLevelRequirements
        };
      }

      // Use database configurations
      const currentConfig = rawConfigurations.find(c => c.level === rawUserLevel.level);
      const nextConfig = rawConfigurations.find(c => c.level === rawUserLevel.level + 1);

      let progressToNext = 0;
      let nextLevelRequirements: { volumeNeeded: number; transactionsNeeded: number } | null = null;

      if (nextConfig) {
        const volumeProgress = Number(rawUserLevel.totalVolumeBrl) / Number(nextConfig.minVolumeForUpgrade);
        const countProgress = rawUserLevel.completedTransactions / nextConfig.minTransactionsForUpgrade;
        progressToNext = Math.min(volumeProgress, countProgress) * 100;

        nextLevelRequirements = {
          volumeNeeded: Math.max(0, Number(nextConfig.minVolumeForUpgrade) - Number(rawUserLevel.totalVolumeBrl)),
          transactionsNeeded: Math.max(0, nextConfig.minTransactionsForUpgrade - rawUserLevel.completedTransactions)
        };
      }

      const canUpgrade = nextConfig &&
        Number(rawUserLevel.totalVolumeBrl) >= Number(nextConfig.minVolumeForUpgrade) &&
        rawUserLevel.completedTransactions >= nextConfig.minTransactionsForUpgrade;

      return {
        currentLevel: rawUserLevel.level,
        nextLevel: nextConfig ? nextConfig.level : null,
        progressToNext,
        totalTransactionVolume: Number(rawUserLevel.totalVolumeBrl),
        totalTransactionCount: rawUserLevel.completedTransactions,
        canUpgrade,
        nextLevelRequirements
      };
    } catch (error) {
      console.log('Error calculating level stats:', error);
      throw new NotFoundException('Erro ao calcular estatísticas de nível');
    }
  }

  async upgradeLevel(userId: string) {
    try {
      const stats = await this.getLevelStats(userId);

      if (!stats.canUpgrade) {
        return { upgraded: false, message: 'Requisitos para o próximo nível não foram atendidos' };
      }

      const userLevel = await this.prisma.userLevel.findUnique({
        where: { userId }
      });

      const newLevel = userLevel!.level + 1;

      // Update user level
      await this.prisma.userLevel.update({
        where: { userId },
        data: {
          level: newLevel,
          lastLevelUpgrade: new Date()
        }
      });

      // Create history record
      await this.prisma.levelHistory.create({
        data: {
          userId,
          previousLevel: userLevel!.level,
          newLevel,
          volumeAtChange: Number(userLevel!.totalVolumeBrl || 0),
          reason: 'Upgrade automático baseado em volume e quantidade de transações'
        }
      });

      // Sync level change to bot database
      try {
        await this.botSyncService.syncUserLevelToBot(userId, newLevel);
        this.logger.log(`Synced level ${newLevel} to bot for user ${userId}`);
      } catch (error) {
        this.logger.error(`Failed to sync level to bot for user ${userId}:`, error);
        // Don't fail the level upgrade if bot sync fails
      }

      return { upgraded: true, newLevel, message: `Parabéns! Você foi promovido para o nível ${newLevel}!` };
    } catch (error) {
      console.log('Error upgrading level:', error);
      throw new NotFoundException('Erro ao atualizar nível');
    }
  }

  private async getOrCreateLevelConfiguration(level: number) {
    try {
      const existing = await this.prisma.levelConfig.findUnique({
        where: { level }
      });

      if (existing) {
        return existing;
      }

      const defaultConfigs = this.getDefaultConfigurations();
      const defaultConfig = defaultConfigs.find(c => c.level === level);

      if (defaultConfig) {
        return await this.prisma.levelConfig.create({
          data: defaultConfig
        });
      }

      throw new Error(`No default configuration found for level ${level}`);
    } catch (error) {
      console.log('Error getting/creating level configuration:', error);
      throw error;
    }
  }

  private getDefaultConfigurations() {
    return [
      {
        level: 0,
        name: 'Iniciante',
        dailyLimitBrl: 100,
        maxPerTransactionBrl: 100,
        minTransactionsForUpgrade: 0,
        minVolumeForUpgrade: 0,
        description: 'Nível inicial para novos usuários'
      },
      {
        level: 1,
        name: 'Bronze',
        dailyLimitBrl: 300,
        maxPerTransactionBrl: 300,
        minTransactionsForUpgrade: 5,
        minVolumeForUpgrade: 500,
        description: 'Primeiro nível com funcionalidades expandidas'
      },
      {
        level: 2,
        name: 'Prata',
        dailyLimitBrl: 600,
        maxPerTransactionBrl: 600,
        minTransactionsForUpgrade: 15,
        minVolumeForUpgrade: 2000,
        description: 'Nível intermediário com links de pagamento'
      },
      {
        level: 3,
        name: 'Ouro',
        dailyLimitBrl: 1000,
        maxPerTransactionBrl: 1000,
        minTransactionsForUpgrade: 30,
        minVolumeForUpgrade: 5000,
        description: 'Nível avançado com recursos completos'
      },
      {
        level: 4,
        name: 'Platina',
        dailyLimitBrl: 2000,
        maxPerTransactionBrl: 2000,
        minTransactionsForUpgrade: 50,
        minVolumeForUpgrade: 10000,
        description: 'Nível premium para usuários ativos'
      },
      {
        level: 5,
        name: 'Diamante',
        dailyLimitBrl: 3000,
        maxPerTransactionBrl: 3000,
        minTransactionsForUpgrade: 100,
        minVolumeForUpgrade: 25000,
        description: 'Nível máximo com acesso completo'
      },
      {
        level: 6,
        name: 'Mestre',
        dailyLimitBrl: 4000,
        maxPerTransactionBrl: 4000,
        minTransactionsForUpgrade: 200,
        minVolumeForUpgrade: 50000,
        description: 'Nível VIP para grandes volumes'
      },
      {
        level: 7,
        name: 'Lendário',
        dailyLimitBrl: 5000,
        maxPerTransactionBrl: 5000,
        minTransactionsForUpgrade: 400,
        minVolumeForUpgrade: 100000,
        description: 'Nível lendário para usuários elite'
      },
      {
        level: 8,
        name: 'Mítico',
        dailyLimitBrl: 7500,
        maxPerTransactionBrl: 7500,
        minTransactionsForUpgrade: 600,
        minVolumeForUpgrade: 200000,
        description: 'Nível mítico para operações de alto volume'
      },
      {
        level: 9,
        name: 'Celestial',
        dailyLimitBrl: 10000,
        maxPerTransactionBrl: 10000,
        minTransactionsForUpgrade: 1000,
        minVolumeForUpgrade: 500000,
        description: 'Nível celestial para empresas e grandes operadores'
      },
      {
        level: 10,
        name: 'Divino',
        dailyLimitBrl: 15000,
        maxPerTransactionBrl: 15000,
        minTransactionsForUpgrade: 2000,
        minVolumeForUpgrade: 1000000,
        description: 'Nível máximo divino com acesso absoluto'
      }
    ];
  }

  private mapConfigurationToFrontend(config: any) {
    return {
      level: config.level,
      name: config.name,
      requiredTransactionVolume: Number(config.minVolumeForUpgrade || 0),
      requiredTransactionCount: config.minTransactionsForUpgrade || 0,
      dailyLimit: Number(config.dailyLimitBrl || 0),
      monthlyLimit: Number(config.dailyLimitBrl || 0) * 30, // Estimate monthly as daily * 30
      features: this.getLevelFeatures(config.level),
      description: config.description || ''
    };
  }

  private mapUserLevelToFrontend(userLevel: any, configuration: any = null) {
    return {
      id: userLevel.id,
      userId: userLevel.userId,
      level: userLevel.level,
      transactionVolume: Number(userLevel.totalVolumeBrl || 0),
      transactionCount: userLevel.completedTransactions || 0,
      earnedAt: userLevel.lastLevelUpgrade || userLevel.createdAt,
      updatedAt: userLevel.updatedAt,
      configuration
    };
  }

  /**
   * Validates if a user can perform a transaction based on their level limits
   * @param userId User ID
   * @param amount Transaction amount in BRL
   * @param transactionType Type of transaction (DEPOSIT, WITHDRAW, etc.)
   * @throws HttpException if validation fails
   */
  async validateTransactionLimit(
    userId: string,
    amount: number,
    transactionType: TransactionType = TransactionType.DEPOSIT
  ): Promise<void> {
    try {
      // Get user level information
      const userLevel = await this.prisma.userLevel.findUnique({
        where: { userId },
        include: {
          user: true
        }
      });

      if (!userLevel) {
        throw new HttpException(
          'Usuário não possui nível configurado. Entre em contato com o suporte.',
          HttpStatus.FORBIDDEN
        );
      }

      // Get level configuration
      let levelConfig: any = null;
      try {
        levelConfig = await this.prisma.levelConfig.findUnique({
          where: { level: userLevel.level }
        });
      } catch (error) {
        this.logger.error(`Error fetching level config for level ${userLevel.level}:`, error);
      }

      // Use default configuration if not found in database
      if (!levelConfig) {
        const defaultConfigs = this.getDefaultConfigurations();
        levelConfig = defaultConfigs.find(c => c.level === userLevel.level);

        if (!levelConfig) {
          throw new HttpException(
            'Configuração de nível não encontrada. Entre em contato com o suporte.',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }

      const dailyLimit = Number(levelConfig.dailyLimitBrl);
      const maxPerTransaction = Number(levelConfig.maxPerTransactionBrl || levelConfig.dailyLimitBrl);

      // Check if amount exceeds per-transaction limit
      if (amount > maxPerTransaction) {
        throw new HttpException(
          `Valor por transação excede o limite máximo do seu nível (${userLevel.level}). Limite máximo: R$ ${maxPerTransaction.toFixed(2)}`,
          HttpStatus.FORBIDDEN
        );
      }

      // Check if amount exceeds daily limit
      if (amount > dailyLimit) {
        throw new HttpException(
          `Valor solicitado excede o limite diário do seu nível (${userLevel.level}). Limite diário: R$ ${dailyLimit.toFixed(2)}`,
          HttpStatus.FORBIDDEN
        );
      }

      // Calculate today's usage for this transaction type
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayUsage = await this.prisma.transaction.aggregate({
        where: {
          userId,
          type: transactionType,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: {
            in: ['COMPLETED', 'PROCESSING', 'PENDING'] // Include pending/processing transactions
          }
        },
        _sum: {
          amount: true
        }
      });

      const currentDailyUsage = Number(todayUsage._sum.amount || 0);
      const remainingLimit = dailyLimit - currentDailyUsage;

      // Check if user has already reached daily limit
      if (currentDailyUsage >= dailyLimit) {
        throw new HttpException(
          `Limite diário já foi atingido para o seu nível (${userLevel.level}). Limite diário: R$ ${dailyLimit.toFixed(2)}`,
          HttpStatus.FORBIDDEN
        );
      }

      // Check if this transaction would exceed daily limit
      if (amount > remainingLimit) {
        throw new HttpException(
          `Esta transação excederia seu limite diário. Valor disponível hoje: R$ ${remainingLimit.toFixed(2)} (Nível ${userLevel.level})`,
          HttpStatus.FORBIDDEN
        );
      }

      this.logger.log(
        `✅ Level validation passed for user ${userId} (Level ${userLevel.level}): ` +
        `Amount: R$ ${amount.toFixed(2)}, Daily usage: R$ ${currentDailyUsage.toFixed(2)}/${dailyLimit.toFixed(2)}`
      );

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error validating transaction limit for user ${userId}:`, error);
      throw new HttpException(
        'Erro interno ao validar limites. Entre em contato com o suporte.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user's current daily usage and limits summary
   * @param userId User ID
   * @returns Object with daily usage, limits, and level info
   */
  async getUserDailyUsageSummary(userId: string) {
    try {
      const userLevel = await this.prisma.userLevel.findUnique({
        where: { userId }
      });

      if (!userLevel) {
        return {
          level: 0,
          dailyLimit: 100,
          currentUsage: 0,
          remainingLimit: 100,
          maxPerTransaction: 100
        };
      }

      // Get level configuration
      let levelConfig: any = null;
      try {
        levelConfig = await this.prisma.levelConfig.findUnique({
          where: { level: userLevel.level }
        });
      } catch (error) {
        this.logger.error(`Error fetching level config for level ${userLevel.level}:`, error);
      }

      if (!levelConfig) {
        const defaultConfigs = this.getDefaultConfigurations();
        levelConfig = defaultConfigs.find(c => c.level === userLevel.level);
      }

      const dailyLimit = Number(levelConfig?.dailyLimitBrl || 100);
      const maxPerTransaction = Number(levelConfig?.maxPerTransactionBrl || levelConfig?.dailyLimitBrl || 100);

      // Calculate today's usage
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayUsage = await this.prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.DEPOSIT,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: {
            in: ['COMPLETED', 'PROCESSING', 'PENDING']
          }
        },
        _sum: {
          amount: true
        }
      });

      const currentUsage = Number(todayUsage._sum.amount || 0);
      const remainingLimit = Math.max(0, dailyLimit - currentUsage);

      return {
        level: userLevel.level,
        levelName: levelConfig?.name || `Nível ${userLevel.level}`,
        dailyLimit,
        currentUsage,
        remainingLimit,
        maxPerTransaction,
        usagePercentage: (currentUsage / dailyLimit) * 100
      };
    } catch (error) {
      this.logger.error(`Error getting daily usage summary for user ${userId}:`, error);
      return {
        level: 0,
        dailyLimit: 100,
        currentUsage: 0,
        remainingLimit: 100,
        maxPerTransaction: 100,
        error: 'Erro ao obter informações de limite'
      };
    }
  }

  private getLevelFeatures(level: number): string[] {
    const features = [
      [],
      ['Transações básicas'],
      ['Transações básicas', 'Links de pagamento'],
      ['Transações básicas', 'Links de pagamento', 'QR codes personalizados'],
      ['Transações básicas', 'Links de pagamento', 'QR codes personalizados', 'Relatórios avançados'],
      ['Transações básicas', 'Links de pagamento', 'QR codes personalizados', 'Relatórios avançados', 'API completa'],
      ['Transações básicas', 'Links de pagamento', 'QR codes personalizados', 'Relatórios avançados', 'API completa', 'Suporte prioritário'],
      ['Transações básicas', 'Links de pagamento', 'QR codes personalizados', 'Relatórios avançados', 'API completa', 'Suporte prioritário', 'Webhooks'],
      ['Transações básicas', 'Links de pagamento', 'QR codes personalizados', 'Relatórios avançados', 'API completa', 'Suporte prioritário', 'Webhooks', 'Limites elevados'],
      ['Transações básicas', 'Links de pagamento', 'QR codes personalizados', 'Relatórios avançados', 'API completa', 'Suporte prioritário', 'Webhooks', 'Limites elevados', 'Recursos empresariais'],
      ['Transações básicas', 'Links de pagamento', 'QR codes personalizados', 'Relatórios avançados', 'API completa', 'Suporte prioritário', 'Webhooks', 'Limites elevados', 'Recursos empresariais', 'Gerente dedicado']
    ];
    return features[level] || [];
  }
}