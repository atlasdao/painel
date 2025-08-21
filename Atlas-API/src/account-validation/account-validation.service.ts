import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PixService } from '../pix/pix.service';
import { TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class AccountValidationService {
  private readonly logger = new Logger(AccountValidationService.name);
  private readonly VALIDATION_AMOUNT = 1.00; // R$ 1,00
  private readonly INITIAL_DAILY_LIMIT = 6000; // R$ 6,000
  private readonly LIMIT_TIERS = [6000, 10000, 20000, 40000, 80000, 160000];
  private readonly THRESHOLD_TIERS = [50000, 150000, 400000, 1000000, 2500000, 5000000];

  constructor(
    private readonly prisma: PrismaService,
    private readonly pixService: PixService,
  ) {}

  async checkValidationStatus(userId: string): Promise<{
    isValidated: boolean;
    validationPaymentId?: string;
    validatedAt?: Date;
    validationQrCode?: string;
  }> {
    console.log('AccountValidationService.checkValidationStatus called with userId:', userId, 'type:', typeof userId);
    
    if (!userId) {
      throw new Error('User ID is required for validation status check');
    }
    
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

    // If already validated, return status
    if (user.isAccountValidated) {
      return {
        isValidated: true,
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
        amount: this.VALIDATION_AMOUNT,
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
          amount: this.VALIDATION_AMOUNT,
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
        amount: this.VALIDATION_AMOUNT,
        depixAddress,
        description: 'Validação de conta Atlas DAO',
      });

      this.logger.log(`QR Code data received: ${JSON.stringify(qrCodeData)}`);
      this.logger.log(`QR Code value: ${qrCodeData.qrCode}`);
      this.logger.log(`🔑 Eulen Transaction ID: ${qrCodeData.transactionId}`);

      // Update the existing transaction with Eulen ID (it was created by generatePixQRCode)
      if (qrCodeData.transactionId) {
        await this.prisma.transaction.update({
          where: { id: qrCodeData.transactionId },
          data: {
            externalId: qrCodeData.transactionId, // CRITICAL: Save Eulen ID for status checks
            metadata: JSON.stringify({
              qrCode: qrCodeData.qrCode,
              isValidation: true,
              depixAddress,
              eulenTransactionId: qrCodeData.transactionId,
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
          amount: this.VALIDATION_AMOUNT,
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
      return {
        isValidated: false,
        requiresValidation: true,
        validationAmount: this.VALIDATION_AMOUNT,
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
    return {
      amount: this.VALIDATION_AMOUNT,
      description: 'Pagamento único de R$ 1,00 para validar sua conta',
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
    return {
      validationEnabled: true,
      validationAmount: this.VALIDATION_AMOUNT,
      initialDailyLimit: this.INITIAL_DAILY_LIMIT,
      limitTiers: this.LIMIT_TIERS,
      thresholdTiers: this.THRESHOLD_TIERS,
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
    
    // Update the class constants (this is a simplified approach)
    // In a production system, you would save these to a database table
    if (settings.limitTiers) {
      (this as any).LIMIT_TIERS = [...settings.limitTiers];
    }
    
    if (settings.thresholdTiers) {
      (this as any).THRESHOLD_TIERS = [...settings.thresholdTiers];
    }
    
    if (settings.validationAmount !== undefined) {
      (this as any).VALIDATION_AMOUNT = settings.validationAmount;
    }
    
    if (settings.initialDailyLimit !== undefined) {
      (this as any).INITIAL_DAILY_LIMIT = settings.initialDailyLimit;
    }
    
    this.logger.log('Validation settings updated successfully');
  }

  async getDetailedValidationStatus(userId: string): Promise<any> {
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
        amount: this.VALIDATION_AMOUNT,
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
      validationAmount: this.VALIDATION_AMOUNT,
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