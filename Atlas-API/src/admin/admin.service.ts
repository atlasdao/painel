import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { UserLimitRepository } from '../repositories/user-limit.repository';
import { LimitValidationService } from '../services/limit-validation.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { PrismaService } from '../prisma/prisma.service';
import { User, TransactionStatus } from '@prisma/client';
import { ApiKeyUtils } from '../common/utils/api-key.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userLimitRepository: UserLimitRepository,
    private readonly limitValidationService: LimitValidationService,
    private readonly transactionRepository: TransactionRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getAllUsers(params?: {
    skip?: number;
    take?: number;
    isActive?: boolean;
  }): Promise<User[]> {
    if (params?.isActive !== undefined) {
      return this.userRepository.findActiveUsers(params);
    }
    return this.userRepository.findAll(params);
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createUser(data: {
    username: string;
    email: string;
    password: string;
    role: any;
  }): Promise<User> {
    // Check if username already exists
    const existingUsername = await this.userRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await this.userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.userRepository.create({
      username: data.username,
      email: data.email,
      password: hashedPassword,
      role: data.role,
      isActive: true,
    });

    // Create audit log
    await this.auditLogRepository.createLog({
      action: 'CREATE_USER',
      resource: 'user',
      resourceId: user.id,
      requestBody: {
        username: data.username,
        email: data.email,
        role: data.role,
      },
    });

    return user;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const user = await this.getUserById(userId);
    return this.userRepository.update(userId, { isActive });
  }

  async updateUser(userId: string, data: any): Promise<User> {
    const user = await this.getUserById(userId);
    return this.userRepository.update(userId, data);
  }

  async generateUserApiKey(userId: string): Promise<{ apiKey: string }> {
    const user = await this.getUserById(userId);
    
    if (user.apiKey) {
      throw new ConflictException('User already has an API key');
    }
    
    // Generate a new API key
    const apiKey = ApiKeyUtils.generateApiKey();
    
    // Hash the API key before storing it in the database
    const hashedApiKey = await bcrypt.hash(apiKey, 10);
    
    // Update user with the hashed API key
    await this.userRepository.update(userId, { apiKey: hashedApiKey });
    
    // Create an API key request record for tracking (store the plain key for reference)
    await this.prisma.apiKeyRequest.create({
      data: {
        userId,
        usageReason: 'Generated directly by admin',
        serviceUrl: 'Internal',
        estimatedVolume: 'N/A',
        usageType: 'SINGLE_CPF',
        status: 'APPROVED',
        generatedApiKey: apiKey, // Store plain key for admin reference
        approvedAt: new Date(),
        approvedBy: 'Admin',
      },
    });
    
    return { apiKey };
  }

  async revokeUserApiKey(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    
    // First, update the API key request status to REVOKED
    const apiKeyRequest = await this.prisma.apiKeyRequest.findFirst({
      where: {
        userId,
        status: 'APPROVED',
        generatedApiKey: { not: null },
      },
    });

    if (apiKeyRequest) {
      await this.prisma.apiKeyRequest.update({
        where: { id: apiKeyRequest.id },
        data: {
          status: 'REVOKED',
          updatedAt: new Date(),
        },
      });
    }
    
    // Then remove the API key from the user
    await this.userRepository.update(userId, { apiKey: null });
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    
    // Check if user has pending transactions
    const pendingTransactions = await this.transactionRepository.findByUserId(userId, {
      status: TransactionStatus.PENDING,
    });

    if (pendingTransactions && pendingTransactions.length > 0) {
      throw new ForbiddenException('Cannot delete user with pending transactions');
    }

    await this.userRepository.delete(userId);
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersWithApiKeys: number;
  }> {
    const [total, active] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ isActive: true }),
    ]);

    const allUsers = await this.userRepository.findAll();
    const usersWithApiKeys = allUsers.filter(u => u.apiKey).length;

    return {
      totalUsers: total,
      activeUsers: active,
      inactiveUsers: total - active,
      usersWithApiKeys,
    };
  }

  async getUserStatsById(userId: string): Promise<{
    totalTransactions: number;
    totalVolume: number;
    pendingTransactions: number;
    completedTransactions: number;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const transactions = await this.transactionRepository.findByUserId(userId);
    
    // Count EXPIRED as FAILED
    const pendingTransactions = transactions.filter(t => 
      t.status === 'PENDING' || t.status === 'PROCESSING'
    ).length;
    
    const completedTransactions = transactions.filter(t => 
      t.status === 'COMPLETED'
    ).length;
    
    const totalVolume = transactions
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalTransactions: transactions.length,
      totalVolume,
      pendingTransactions,
      completedTransactions,
    };
  }

  async getSystemStats(): Promise<{
    users: any;
    transactions: any;
    revenue: any;
  }> {
    const userStats = await this.getUserStats();
    const transactionStats = await this.transactionRepository.getTransactionStats();
    
    return {
      users: userStats,
      transactions: transactionStats,
      revenue: {
        total: transactionStats.totalAmount,
        pending: 0, // Calculate based on pending transactions
        completed: transactionStats.totalAmount,
      },
    };
  }

  async getAuditLogs(params?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }) {
    if (params?.userId) {
      return this.auditLogRepository.findByUserId(params.userId, params);
    }
    
    if (params?.resource) {
      return this.auditLogRepository.findByResource(params.resource, undefined, params);
    }

    return this.auditLogRepository.findAll(params);
  }

  async getAuditStats(startDate?: Date, endDate?: Date) {
    return this.auditLogRepository.getActionStats(startDate, endDate);
  }

  async getAllTransactions(params?: {
    skip?: number;
    take?: number;
    status?: any;
    type?: any;
    userId?: string;
  }) {
    if (params?.userId) {
      return this.transactionRepository.findByUserId(params.userId, params);
    }
    
    return this.transactionRepository.findAll(params);
  }

  async updateTransactionStatus(
    transactionId: string, 
    status: any,
    errorMessage?: string
  ) {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return this.transactionRepository.updateStatus(transactionId, status, errorMessage);
  }

  async toggleCommerceMode(userId: string, enable: boolean) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Require account validation for commerce mode
    if (enable && !user.isAccountValidated) {
      throw new BadRequestException('Account must be validated before enabling commerce mode');
    }

    const updateData: any = {
      commerceMode: enable,
    };

    if (enable) {
      updateData.commerceModeActivatedAt = new Date();
      updateData.paymentLinksEnabled = true; // Enable payment links when commerce mode is activated
    } else {
      updateData.paymentLinksEnabled = false; // Disable payment links when commerce mode is deactivated
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        commerceMode: true,
        commerceModeActivatedAt: true,
        paymentLinksEnabled: true,
      },
    });
  }

  async togglePaymentLinks(userId: string, enable: boolean) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Payment links require commerce mode
    if (enable && !user.commerceMode) {
      throw new BadRequestException('Commerce mode must be enabled before activating payment links');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { paymentLinksEnabled: enable },
      select: {
        id: true,
        email: true,
        username: true,
        commerceMode: true,
        paymentLinksEnabled: true,
      },
    });
  }

  async getDashboardData(limit: number = 5) {
    const [stats, recentTransactions, recentUsers, auditStats] = await Promise.all([
      this.getSystemStats(),
      this.transactionRepository.findAll({ take: limit }),
      this.userRepository.findAll({ take: limit }),
      this.auditLogRepository.getActionStats(),
    ]);

    return {
      stats,
      recentTransactions,
      recentUsers,
      auditStats,
      timestamp: new Date(),
    };
  }

  async getDashboardStats(): Promise<any> {
    // Get user stats
    const [totalUsers, activeUsers, newUsersToday] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ isActive: true }),
      this.userRepository.countNewUsersToday(),
    ]);

    // Get transaction stats
    const [
      totalTransactions,
      todayTransactions,
      pendingTransactions,
      completedTransactions,
      failedTransactions,
      expiredTransactions,
      totalVolume,
      todayVolume,
    ] = await Promise.all([
      this.transactionRepository.count(),
      this.transactionRepository.countToday(),
      this.transactionRepository.count({ status: TransactionStatus.PENDING }),
      this.transactionRepository.count({ status: TransactionStatus.COMPLETED }),
      this.transactionRepository.count({ status: TransactionStatus.FAILED }),
      this.transactionRepository.count({ status: TransactionStatus.EXPIRED }),
      this.transactionRepository.sumAmount({ status: TransactionStatus.COMPLETED }),
      this.transactionRepository.sumAmountToday({ status: TransactionStatus.COMPLETED }),
    ]);

    // Calculate success rate
    const successRate = totalTransactions > 0 
      ? Math.round((completedTransactions / totalTransactions) * 100) 
      : 0;

    // Calculate retention rate (simplified - users who made more than one transaction)
    const usersWithMultipleTransactions = await this.transactionRepository.countUsersWithMultipleTransactions();
    const retentionRate = activeUsers > 0
      ? Math.round((usersWithMultipleTransactions / activeUsers) * 100)
      : 0;

    return {
      // User metrics
      totalUsers,
      activeUsers,
      newUsersToday: newUsersToday || 0,
      retentionRate,

      // Transaction metrics
      totalTransactions,
      todayTransactions: todayTransactions || 0,
      pendingTransactions,
      completedTransactions,
      failedTransactions: failedTransactions + expiredTransactions, // Count EXPIRED as FAILED

      // Volume metrics (convert from cents to reais if needed)
      totalVolume: totalVolume || 0,
      todayVolume: todayVolume || 0,

      // Performance metrics
      successRate,
    };
  }

  // ===== USER LIMITS MANAGEMENT (MED COMPLIANCE) =====

  async getAllUsersWithLimits(params?: {
    skip?: number;
    take?: number;
    isFirstDay?: boolean;
    isKycVerified?: boolean;
    isHighRiskUser?: boolean;
  }) {
    return this.userLimitRepository.getAllUsersWithLimits(params);
  }

  async getUserLimits(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.limitValidationService.getUserLimitsSummary(userId);
  }

  async updateUserLimits(
    userId: string,
    updates: {
      dailyDepositLimit?: number;
      dailyWithdrawLimit?: number;
      dailyTransferLimit?: number;
      maxDepositPerTx?: number;
      maxWithdrawPerTx?: number;
      maxTransferPerTx?: number;
      monthlyDepositLimit?: number;
      monthlyWithdrawLimit?: number;
      monthlyTransferLimit?: number;
      isKycVerified?: boolean;
      isHighRiskUser?: boolean;
      notes?: string;
    },
    adminId: string,
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Log the admin action
    await this.auditLogRepository.createLog({
      userId: adminId,
      action: 'UPDATE_USER_LIMITS',
      resource: 'user_limits',
      resourceId: userId,
      requestBody: updates,
    });

    return this.userLimitRepository.updateUserLimits(userId, updates, adminId);
  }

  async resetUserFirstDay(userId: string, adminId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Log the admin action
    await this.auditLogRepository.createLog({
      userId: adminId,
      action: 'RESET_USER_FIRST_DAY',
      resource: 'user_limits',
      resourceId: userId,
    });

    return this.userLimitRepository.updateUserLimits(
      userId,
      {
        isFirstDay: true,
        dailyDepositLimit: 500.00,
        dailyWithdrawLimit: 500.00,
        dailyTransferLimit: 500.00,
        notes: 'First day status reset by admin',
      },
      adminId,
    );
  }

  async applyKycLimits(userId: string, adminId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Log the admin action
    await this.auditLogRepository.createLog({
      userId: adminId,
      action: 'APPLY_KYC_LIMITS',
      resource: 'user_limits',
      resourceId: userId,
    });

    // Apply higher limits for KYC verified users
    return this.userLimitRepository.updateUserLimits(
      userId,
      {
        isKycVerified: true,
        dailyDepositLimit: 10000.00,    // R$ 10k daily for KYC users
        dailyWithdrawLimit: 10000.00,
        dailyTransferLimit: 10000.00,
        maxDepositPerTx: 10000.00,      // R$ 10k per transaction
        maxWithdrawPerTx: 10000.00,
        maxTransferPerTx: 10000.00,
        monthlyDepositLimit: 100000.00, // R$ 100k monthly
        monthlyWithdrawLimit: 100000.00,
        monthlyTransferLimit: 100000.00,
        notes: 'KYC verified limits applied by admin',
      },
      adminId,
    );
  }

  // ===== SYSTEM CONFIGURATION =====

  async updateEulenToken(token: string): Promise<{ message: string }> {
    if (!token || !token.trim()) {
      throw new Error('Token cannot be empty');
    }

    // Basic JWT format validation (eyJ...)
    if (!token.startsWith('eyJ')) {
      throw new Error('Invalid JWT token format');
    }

    // Store the token in SystemSettings table
    try {
      await this.prisma.systemSettings.upsert({
        where: { key: 'EULEN_API_TOKEN' },
        update: { 
          value: token.trim(),
          updatedAt: new Date(),
        },
        create: {
          key: 'EULEN_API_TOKEN',
          value: token.trim(),
        },
      });

      return { message: 'Token Eulen atualizado com sucesso!' };
    } catch (error) {
      console.error('Error updating Eulen token:', error);
      throw new Error('Erro ao salvar token no banco de dados');
    }
  }
}