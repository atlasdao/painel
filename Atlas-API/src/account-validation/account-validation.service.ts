import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PixService } from '../pix/pix.service';
import { LiquidValidationService } from '../services/liquid-validation.service';
import { TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class AccountValidationService {
  private readonly logger = new Logger(AccountValidationService.name);
  private readonly VALIDATION_AMOUNT = 2.00; // R$ 2,00
  private readonly INITIAL_DAILY_LIMIT = 6000; // R$ 6,000
  private readonly LIMIT_TIERS = [6000, 10000, 20000, 40000, 80000, 160000];
  private readonly THRESHOLD_TIERS = [50000, 150000, 400000, 1000000, 2500000, 5000000];

  constructor(
    private readonly prisma: PrismaService,
    private readonly pixService: PixService,
    private readonly liquidValidation: LiquidValidationService,
  ) {}

  /**
   * Get the validation amount from database settings or fallback to default
   */
  private async getValidationAmount(): Promise<number> {
    try {
      const validationAmountSetting = await this.prisma.systemSettings.findUnique({
        where: { key: 'validation_amount' }
      });
      
      if (validationAmountSetting) {
        return JSON.parse(validationAmountSetting.value);
      }
    } catch (error) {
      this.logger.warn('Failed to fetch validation amount from settings, using default', error);
    }
    
    return this.VALIDATION_AMOUNT;
  }

  async checkValidationStatus(userId: string): Promise<{
    isValidated: boolean;
    validationPaymentId?: string;
    validatedAt?: Date;
    validationQrCode?: string;
    requiresValidation?: boolean;
  }> {
    console.log('AccountValidationService.checkValidationStatus called with userId:', userId, 'type:', typeof userId);
    
    if (!userId) {
      throw new Error('User ID is required for validation status check');
    }
    
    // Check if validation is enabled in system settings
    const validationEnabled = await this.isValidationEnabled();
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isAccountValidated: true,
        validationPaymentId: true,
        validatedAt: true,
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // If validation is disabled, treat user as validated
    if (!validationEnabled) {
      return {
        isValidated: true,
        requiresValidation: false,
        validationPaymentId: user.validationPaymentId || undefined,
        validatedAt: user.validatedAt || undefined,
      };
    }

    // If already validated, return status
    if (user.isAccountValidated) {
      return {
        isValidated: true,
        requiresValidation: false,
        validationPaymentId: user.validationPaymentId || undefined,
        validatedAt: user.validatedAt || undefined,
      };
    }

    // Check for pending validation transaction
    const pendingValidation = await this.prisma.transaction.findFirst({
      where: {
        userId,
        type: TransactionType.DEPOSIT,
        amount: this.VALIDATION_AMOUNT,
        status: TransactionStatus.PENDING,
        description: { contains: 'Validação de conta' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      isValidated: false,
      requiresValidation: true,
      validationQrCode: pendingValidation?.metadata 
        ? JSON.parse(pendingValidation.metadata).qrCode 
        : undefined,
    };
  }

  async createValidationPayment(userId: string, depixAddress: string): Promise<{
    transactionId: string;
    qrCode: string;
    amount: number;
  }> {
    const validationAmount = await this.getValidationAmount();
    // Validate Liquid address first
    if (!this.liquidValidation.validateLiquidAddress(depixAddress)) {
      throw new HttpException(
        'Endereço Liquid inválido. Por favor, verifique e tente novamente.',
        HttpStatus.BAD_REQUEST
      );
    }

    // Check if it's a mainnet address
    if (!this.liquidValidation.isMainnetAddress(depixAddress)) {
      throw new HttpException(
        'Por favor, use um endereço da mainnet Liquid (deve começar com lq1, VJL, Q, G ou H)',
        HttpStatus.BAD_REQUEST
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.isAccountValidated) {
      throw new HttpException('Account already validated', HttpStatus.BAD_REQUEST);
    }

    // Check for existing pending validation
    const existingValidation = await this.prisma.transaction.findFirst({
      where: {
        userId,
        type: TransactionType.DEPOSIT,
        amount: validationAmount,
        status: TransactionStatus.PENDING,
        description: { contains: 'Validação de conta' },
      },
    });

    if (existingValidation) {
      const metadata = existingValidation.metadata 
        ? JSON.parse(existingValidation.metadata) 
        : {};
      
      // Check if the existing QR code is valid (should be a string and not empty/true/false)
      const storedQrCode = metadata.qrCode;
      const isValidQrCode = typeof storedQrCode === 'string' && storedQrCode.length > 10;
      
      if (isValidQrCode) {
        this.logger.log(`Returning existing validation transaction ${existingValidation.id} with valid QR code`);
        return {
          transactionId: existingValidation.id,
          qrCode: storedQrCode,
          amount: validationAmount,
        };
      } else {
        this.logger.warn(`Existing validation transaction ${existingValidation.id} has invalid QR code data: ${typeof storedQrCode} - ${storedQrCode}. Creating new payment.`);
        // Delete the invalid transaction and create a new one
        await this.prisma.transaction.delete({ where: { id: existingValidation.id } });
      }
    }

    try {
      this.logger.log(`Creating validation payment for user ${userId} with depixAddress: ${depixAddress}`);
      
      // Generate QR code for validation payment
      const qrCodeData = await this.pixService.generatePixQRCode(userId, {
        amount: validationAmount,
        depixAddress,
        description: 'Validação de conta Atlas DAO',
      });

      this.logger.log(`QR Code data received: ${JSON.stringify(qrCodeData)}`);
      this.logger.log(`QR Code value: ${qrCodeData.qrCode}`);
      this.logger.log(`🔑 Eulen Transaction ID: ${qrCodeData.transactionId}`);

      // Update the existing transaction with validation metadata (Eulen ID already saved by generatePixQRCode)
      if (qrCodeData.transactionId) {
        // Get the transaction to preserve the externalId set by generatePixQRCode
        const existingTransaction = await this.prisma.transaction.findUnique({
          where: { id: qrCodeData.transactionId },
        });
        
        this.logger.log(`📋 Transaction before validation update:`);
        this.logger.log(`  - Our UUID: ${existingTransaction?.id}`);
        this.logger.log(`  - Eulen ID (externalId): ${existingTransaction?.externalId}`);
        
        await this.prisma.transaction.update({
          where: { id: qrCodeData.transactionId },
          data: {
            // DON'T overwrite externalId - it's already set correctly by generatePixQRCode
            metadata: JSON.stringify({
              qrCode: qrCodeData.qrCode,
              isValidation: true,
              depixAddress,
              eulenTransactionId: existingTransaction?.externalId, // Use the real Eulen ID
            }),
          },
        });
        
        const transaction = await this.prisma.transaction.findUnique({
          where: { id: qrCodeData.transactionId },
        });

        this.logger.log(`Validation payment created for user ${userId}`);

        return {
          transactionId: qrCodeData.transactionId,
          qrCode: qrCodeData.qrCode,
          amount: validationAmount,
        };
      } else {
        throw new HttpException('Failed to create transaction', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } catch (error) {
      this.logger.error('Failed to create validation payment:', error);
      throw new HttpException(
        'Failed to create validation payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processValidationPayment(transactionId: string): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    });

    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }

    const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
    
    if (!metadata.isValidation) {
      return; // Not a validation transaction
    }

    if (transaction.status !== TransactionStatus.COMPLETED) {
      return; // Payment not completed yet
    }

    // Update user account as validated
    await this.prisma.user.update({
      where: { id: transaction.userId },
      data: {
        isAccountValidated: true,
        validationPaymentId: transactionId,
        validatedAt: new Date(),
      },
    });

    // Initialize user reputation
    await this.initializeUserReputation(transaction.userId);

    this.logger.log(`Account validated for user ${transaction.userId}`);
  }

  // Process all completed validation transactions that haven't been processed yet
  async processCompletedValidations(): Promise<{ processed: number }> {
    try {
      // Find completed validation transactions where user is not yet validated
      const completedValidations = await this.prisma.transaction.findMany({
        where: {
          status: TransactionStatus.COMPLETED,
          metadata: {
            contains: '"isValidation":true'
          },
          user: {
            isAccountValidated: false
          }
        },
        include: { user: true }
      });

      let processedCount = 0;

      for (const transaction of completedValidations) {
        try {
          await this.processValidationPayment(transaction.id);
          processedCount++;
          this.logger.log(`Processed validation for transaction ${transaction.id}`);
        } catch (error) {
          this.logger.error(`Failed to process validation for transaction ${transaction.id}:`, error);
        }
      }

      if (processedCount > 0) {
        this.logger.log(`Processed ${processedCount} validation transactions`);
      }

      return { processed: processedCount };
    } catch (error) {
      this.logger.error('Error processing completed validations:', error);
      return { processed: 0 };
    }
  }

  // Cron job to automatically process completed validation transactions
  @Cron(CronExpression.EVERY_MINUTE)
  async cronProcessValidations() {
    try {
      const result = await this.processCompletedValidations();
      
      if (result.processed > 0) {
        this.logger.log(`Cron: Processed ${result.processed} validation transactions`);
      }
    } catch (error) {
      this.logger.error('Error in validation processing cron job:', error);
    }
  }

  async initializeUserReputation(userId: string): Promise<void> {
    const existingReputation = await this.prisma.userReputation.findUnique({
      where: { userId },
    });

    if (!existingReputation) {
      await this.prisma.userReputation.create({
        data: {
          userId,
          reputationScore: 50, // Start with neutral reputation
          currentDailyLimit: this.INITIAL_DAILY_LIMIT,
          nextLimitThreshold: this.THRESHOLD_TIERS[0],
          limitTier: 1,
        },
      });
      this.logger.log(`User reputation initialized for user ${userId}`);
    }
  }

  async updateUserReputation(
    userId: string, 
    transactionAmount: number, 
    success: boolean,
  ): Promise<void> {
    let reputation = await this.prisma.userReputation.findUnique({
      where: { userId },
    });

    if (!reputation) {
      await this.initializeUserReputation(userId);
      reputation = await this.prisma.userReputation.findUnique({
        where: { userId },
      });
    }

    if (!reputation) return;

    const updates: any = {};
    
    if (success) {
      updates.totalApprovedVolume = reputation.totalApprovedVolume + transactionAmount;
      updates.totalApprovedCount = reputation.totalApprovedCount + 1;
      
      // Calculate new reputation score
      const successRate = (reputation.totalApprovedCount + 1) / 
        ((reputation.totalApprovedCount + 1) + reputation.totalRejectedCount);
      updates.reputationScore = Math.min(100, successRate * 100);
      
      // Check if user qualifies for limit increase
      if (updates.totalApprovedVolume >= reputation.nextLimitThreshold) {
        const newTier = Math.min(reputation.limitTier + 1, this.LIMIT_TIERS.length);
        updates.limitTier = newTier;
        updates.currentDailyLimit = this.LIMIT_TIERS[newTier - 1];
        updates.nextLimitThreshold = this.THRESHOLD_TIERS[newTier - 1] || this.THRESHOLD_TIERS[this.THRESHOLD_TIERS.length - 1];
        
        this.logger.log(`User ${userId} upgraded to tier ${newTier} with limit R$ ${updates.currentDailyLimit}`);
      }
    } else {
      updates.totalRejectedCount = reputation.totalRejectedCount + 1;
      
      // Recalculate reputation score
      const successRate = reputation.totalApprovedCount / 
        (reputation.totalApprovedCount + (reputation.totalRejectedCount + 1));
      updates.reputationScore = Math.max(0, successRate * 100);
    }

    await this.prisma.userReputation.update({
      where: { userId },
      data: updates,
    });
  }

  async getUserLimitsAndReputation(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        reputation: true,
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.isAccountValidated) {
      const validationAmount = await this.getValidationAmount();
      return {
        isValidated: false,
        requiresValidation: true,
        validationAmount,
      };
    }

    const reputation = user.reputation || {
      reputationScore: 0,
      currentDailyLimit: 0,
      limitTier: 0,
      totalApprovedVolume: 0,
      totalApprovedCount: 0,
      totalRejectedCount: 0,
      nextLimitThreshold: this.THRESHOLD_TIERS[0],
    };

    return {
      isValidated: true,
      validatedAt: user.validatedAt,
      limits: {
        daily: reputation.currentDailyLimit,
        tier: reputation.limitTier,
        nextThreshold: reputation.nextLimitThreshold,
        progressToNextTier: (reputation.totalApprovedVolume / reputation.nextLimitThreshold) * 100,
      },
      reputation: {
        score: reputation.reputationScore,
        approvedVolume: reputation.totalApprovedVolume,
        approvedCount: reputation.totalApprovedCount,
        rejectedCount: reputation.totalRejectedCount,
      },
    };
  }

  async adjustUserLimits(
    userId: string,
    dailyLimit?: number,
    tier?: number,
    adminNotes?: string,
  ): Promise<void> {
    const reputation = await this.prisma.userReputation.findUnique({
      where: { userId },
    });

    if (!reputation) {
      await this.initializeUserReputation(userId);
    }

    const updates: any = {};
    
    if (dailyLimit !== undefined) {
      updates.currentDailyLimit = dailyLimit;
    }
    
    if (tier !== undefined) {
      updates.limitTier = tier;
      if (!dailyLimit) {
        updates.currentDailyLimit = this.LIMIT_TIERS[Math.min(tier - 1, this.LIMIT_TIERS.length - 1)];
      }
      updates.nextLimitThreshold = this.THRESHOLD_TIERS[Math.min(tier - 1, this.THRESHOLD_TIERS.length - 1)];
    }

    await this.prisma.userReputation.update({
      where: { userId },
      data: updates,
    });

    this.logger.log(`User ${userId} limits adjusted by admin: ${JSON.stringify(updates)}`);
  }

  async getValidationRequirements(): Promise<{
    amount: number;
    description: string;
    benefits: string[];
  }> {
    const validationAmount = await this.getValidationAmount();
    return {
      amount: validationAmount,
      description: `Pagamento único de R$ ${validationAmount.toFixed(2).replace('.', ',')} para validar sua conta`,
      benefits: [
        'Gerar depósitos ilimitados',
        'Acesso completo às funcionalidades',
        'Suporte prioritário',
        'Limites aumentados progressivamente',
      ],
    };
  }

  async getValidationSettings(): Promise<{
    validationEnabled: boolean;
    validationAmount: number;
    initialDailyLimit: number;
    limitTiers: number[];
    thresholdTiers: number[];
  }> {
    // Get settings from database or use defaults
    const validationEnabledSetting = await this.prisma.systemSettings.findUnique({
      where: { key: 'validation_enabled' }
    });
    
    const validationAmountSetting = await this.prisma.systemSettings.findUnique({
      where: { key: 'validation_amount' }
    });
    
    const initialDailyLimitSetting = await this.prisma.systemSettings.findUnique({
      where: { key: 'initial_daily_limit' }
    });
    
    const limitTiersSetting = await this.prisma.systemSettings.findUnique({
      where: { key: 'limit_tiers' }
    });
    
    const thresholdTiersSetting = await this.prisma.systemSettings.findUnique({
      where: { key: 'threshold_tiers' }
    });

    return {
      validationEnabled: validationEnabledSetting ? JSON.parse(validationEnabledSetting.value) : true,
      validationAmount: validationAmountSetting ? JSON.parse(validationAmountSetting.value) : this.VALIDATION_AMOUNT,
      initialDailyLimit: initialDailyLimitSetting ? JSON.parse(initialDailyLimitSetting.value) : this.INITIAL_DAILY_LIMIT,
      limitTiers: limitTiersSetting ? JSON.parse(limitTiersSetting.value) : this.LIMIT_TIERS,
      thresholdTiers: thresholdTiersSetting ? JSON.parse(thresholdTiersSetting.value) : this.THRESHOLD_TIERS,
    };
  }

  async updateValidationSettings(settings: {
    validationEnabled?: boolean;
    validationAmount?: number;
    initialDailyLimit?: number;
    limitTiers?: number[];
    thresholdTiers?: number[];
  }): Promise<void> {
    this.logger.log(`Validation settings update requested: ${JSON.stringify(settings)}`);
    
    // Validate the input data
    if (settings.limitTiers && settings.thresholdTiers) {
      if (settings.limitTiers.length !== settings.thresholdTiers.length) {
        throw new HttpException(
          'Limit tiers and threshold tiers must have the same length',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // Validate that all values are positive numbers
      for (const tier of settings.limitTiers) {
        if (!tier || tier <= 0) {
          throw new HttpException(
            'All limit tiers must be positive numbers',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      
      for (const threshold of settings.thresholdTiers) {
        if (!threshold || threshold <= 0) {
          throw new HttpException(
            'All threshold tiers must be positive numbers',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }
    
    // Validate other fields
    if (settings.validationAmount !== undefined && settings.validationAmount <= 0) {
      throw new HttpException(
        'Validation amount must be positive',
        HttpStatus.BAD_REQUEST,
      );
    }
    
    if (settings.initialDailyLimit !== undefined && settings.initialDailyLimit <= 0) {
      throw new HttpException(
        'Initial daily limit must be positive',
        HttpStatus.BAD_REQUEST,
      );
    }
    
    // Save settings to database
    const updatePromises: Promise<any>[] = [];
    
    if (settings.validationEnabled !== undefined) {
      updatePromises.push(
        this.prisma.systemSettings.upsert({
          where: { key: 'validation_enabled' },
          update: { 
            value: JSON.stringify(settings.validationEnabled),
            description: 'Whether account validation is required for new users'
          },
          create: {
            key: 'validation_enabled',
            value: JSON.stringify(settings.validationEnabled),
            description: 'Whether account validation is required for new users'
          }
        })
      );
    }
    
    if (settings.validationAmount !== undefined) {
      updatePromises.push(
        this.prisma.systemSettings.upsert({
          where: { key: 'validation_amount' },
          update: { 
            value: JSON.stringify(settings.validationAmount),
            description: 'Amount required for account validation (in BRL)'
          },
          create: {
            key: 'validation_amount',
            value: JSON.stringify(settings.validationAmount),
            description: 'Amount required for account validation (in BRL)'
          }
        })
      );
    }
    
    if (settings.initialDailyLimit !== undefined) {
      updatePromises.push(
        this.prisma.systemSettings.upsert({
          where: { key: 'initial_daily_limit' },
          update: { 
            value: JSON.stringify(settings.initialDailyLimit),
            description: 'Initial daily limit for new validated users (in BRL)'
          },
          create: {
            key: 'initial_daily_limit',
            value: JSON.stringify(settings.initialDailyLimit),
            description: 'Initial daily limit for new validated users (in BRL)'
          }
        })
      );
    }
    
    if (settings.limitTiers) {
      updatePromises.push(
        this.prisma.systemSettings.upsert({
          where: { key: 'limit_tiers' },
          update: { 
            value: JSON.stringify(settings.limitTiers),
            description: 'Progressive daily limit tiers (in BRL)'
          },
          create: {
            key: 'limit_tiers',
            value: JSON.stringify(settings.limitTiers),
            description: 'Progressive daily limit tiers (in BRL)'
          }
        })
      );
    }
    
    if (settings.thresholdTiers) {
      updatePromises.push(
        this.prisma.systemSettings.upsert({
          where: { key: 'threshold_tiers' },
          update: { 
            value: JSON.stringify(settings.thresholdTiers),
            description: 'Volume thresholds to unlock limit tiers (in BRL)'
          },
          create: {
            key: 'threshold_tiers',
            value: JSON.stringify(settings.thresholdTiers),
            description: 'Volume thresholds to unlock limit tiers (in BRL)'
          }
        })
      );
    }
    
    // Execute all updates
    await Promise.all(updatePromises);
    
    this.logger.log('Validation settings updated successfully in database');
  }

  async isValidationEnabled(): Promise<boolean> {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key: 'validation_enabled' }
    });
    return setting ? JSON.parse(setting.value) : true; // Default to enabled
  }

  async getDetailedValidationStatus(userId: string): Promise<any> {
    const validationAmount = await this.getValidationAmount();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        reputation: true,
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Get all validation transactions
    const validationTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.DEPOSIT,
        amount: validationAmount,
        description: { contains: 'Validação de conta' },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get completed validation transactions
    const completedValidations = validationTransactions.filter(t => t.status === TransactionStatus.COMPLETED);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAccountValidated: user.isAccountValidated,
        validationPaymentId: user.validationPaymentId,
        validatedAt: user.validatedAt,
      },
      validationAmount,
      transactions: validationTransactions.map(t => ({
        id: t.id,
        status: t.status,
        amount: t.amount,
        createdAt: t.createdAt,
        processedAt: t.processedAt,
        metadata: t.metadata ? JSON.parse(t.metadata) : null,
        externalId: t.externalId,
      })),
      completedValidations: completedValidations.length,
      shouldBeValidated: completedValidations.length > 0 && !user.isAccountValidated,
      reputation: user.reputation,
      debug: {
        hasCompletedPayments: completedValidations.length > 0,
        accountValidated: user.isAccountValidated,
        mismatch: completedValidations.length > 0 && !user.isAccountValidated,
      },
    };
  }

  async manualValidationCheck(userId: string): Promise<any> {
    this.logger.log(`Manual validation check triggered for user ${userId}`);
    
    const result = await this.processCompletedValidations();
    
    // Get updated status
    const detailedStatus = await this.getDetailedValidationStatus(userId);
    
    return {
      ...detailedStatus,
      manualCheckResult: result,
      timestamp: new Date().toISOString(),
    };
  }
}