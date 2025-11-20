import {
	Injectable,
	NotFoundException,
	ForbiddenException,
	ConflictException,
	BadRequestException,
	forwardRef,
	Inject,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { UserLimitRepository } from '../repositories/user-limit.repository';
import { LimitValidationService } from '../services/limit-validation.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { PrismaService } from '../prisma/prisma.service';
import { User, TransactionStatus, TransactionType, UserRole, IncidentStatus, IncidentSeverity } from '@prisma/client';
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
		role: UserRole;
	}): Promise<User> {
		// Check if username already exists
		const existingUsername = await this.userRepository.findByUsername(
			data.username,
		);
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

	async updateUser(userId: string, data: Partial<User>): Promise<User> {
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
		const pendingTransactions = await this.transactionRepository.findByUserId(
			userId,
			{
				status: TransactionStatus.PENDING,
			},
		);

		if (pendingTransactions && pendingTransactions.length > 0) {
			throw new ForbiddenException(
				'Cannot delete user with pending transactions',
			);
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
		const usersWithApiKeys = allUsers.filter((u) => u.apiKey).length;

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
		const pendingTransactions = transactions.filter(
			(t) => t.status === 'PENDING' || t.status === 'PROCESSING',
		).length;

		const completedTransactions = transactions.filter(
			(t) => t.status === 'COMPLETED',
		).length;

		const totalVolume = transactions
			.filter((t) => t.status === 'COMPLETED')
			.reduce((sum, t) => sum + Number(t.amount), 0);

		return {
			totalTransactions: transactions.length,
			totalVolume,
			pendingTransactions,
			completedTransactions,
		};
	}

	async getSystemStats(): Promise<{
		users: {
			totalUsers: number;
			activeUsers: number;
			inactiveUsers: number;
			usersWithApiKeys: number;
		};
		transactions: {
			total: number;
			pending: number;
			completed: number;
			failed: number;
			totalAmount: number;
		};
		revenue: {
			total: number;
			pending: number;
			completed: number;
		};
	}> {
		const userStats = await this.getUserStats();
		const transactionStats =
			await this.transactionRepository.getTransactionStats();

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
			return this.auditLogRepository.findByResource(
				params.resource,
				undefined,
				params,
			);
		}

		return this.auditLogRepository.findAll(params);
	}

	async getAuditStats(startDate?: Date, endDate?: Date) {
		return this.auditLogRepository.getActionStats(startDate, endDate);
	}

	async getAllTransactions(params?: {
		skip?: number;
		take?: number;
		status?: TransactionStatus;
		type?: TransactionType;
		userId?: string;
		startDate?: Date;
		endDate?: Date;
	}) {
		// Validate date range (max 1 year)
		if (params?.startDate && params?.endDate) {
			const maxDateRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
			const dateRange = params.endDate.getTime() - params.startDate.getTime();

			if (dateRange > maxDateRange) {
				throw new BadRequestException('Date range cannot exceed 1 year');
			}

			if (params.startDate > params.endDate) {
				throw new BadRequestException('Start date must be before end date');
			}
		}

		if (params?.userId) {
			return this.transactionRepository.findByUserId(params.userId, params);
		}

		return this.transactionRepository.findAll(params);
	}

	async updateTransactionStatus(
		transactionId: string,
		status: TransactionStatus,
		errorMessage?: string,
	) {
		const transaction =
			await this.transactionRepository.findById(transactionId);
		if (!transaction) {
			throw new NotFoundException('Transaction not found');
		}

		return this.transactionRepository.updateStatus(
			transactionId,
			status,
			errorMessage,
		);
	}

	async toggleCommerceMode(userId: string, enable: boolean) {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}

		// Require account validation for commerce mode
		if (enable && !user.isAccountValidated) {
			throw new BadRequestException(
				'Account must be validated before enabling commerce mode',
			);
		}

		const updateData: Partial<User> = {
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
			throw new BadRequestException(
				'Commerce mode must be enabled before activating payment links',
			);
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
		const [stats, recentTransactions, recentUsers, auditStats] =
			await Promise.all([
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

	async getDashboardStats(): Promise<{
		totalUsers: number;
		activeUsers: number;
		newUsersToday: number;
		retentionRate: number;
		totalTransactions: number;
		todayTransactions: number;
		pendingTransactions: number;
		completedTransactions: number;
		failedTransactions: number;
		totalVolume: number;
		todayVolume: number;
		successRate: number;
	}> {
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
			this.transactionRepository.sumAmount({
				status: TransactionStatus.COMPLETED,
			}),
			this.transactionRepository.sumAmountToday({
				status: TransactionStatus.COMPLETED,
			}),
		]);

		// Calculate success rate
		const successRate =
			totalTransactions > 0
				? Math.round((completedTransactions / totalTransactions) * 100)
				: 0;

		// Calculate retention rate (simplified - users who made more than one transaction)
		const usersWithMultipleTransactions =
			await this.transactionRepository.countUsersWithMultipleTransactions();
		const retentionRate =
			activeUsers > 0
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
				dailyDepositLimit: 500.0,
				dailyWithdrawLimit: 500.0,
				dailyTransferLimit: 500.0,
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
				dailyDepositLimit: 10000.0, // R$ 10k daily for KYC users
				dailyWithdrawLimit: 10000.0,
				dailyTransferLimit: 10000.0,
				maxDepositPerTx: 10000.0, // R$ 10k per transaction
				maxWithdrawPerTx: 10000.0,
				maxTransferPerTx: 10000.0,
				monthlyDepositLimit: 100000.0, // R$ 100k monthly
				monthlyWithdrawLimit: 100000.0,
				monthlyTransferLimit: 100000.0,
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

	// ===== COMMERCE APPLICATION REQUESTS =====

	async submitCommerceRequest(userId: string, dto: any) {
		try {
			// Validate required fields with new field names
			if (!dto.businessName || !dto.productOrService || !dto.monthlyPixSales ||
				!dto.averagePrices || !dto.marketTime || !dto.references ||
				!dto.refundRate || !dto.refundProcess || !dto.businessProof || !dto.contactInfo) {
				throw new BadRequestException('Todos os campos são obrigatórios');
			}

			// Check if user already has an application
			const existingApplication = await this.prisma.commerceApplication.findUnique({
				where: { userId },
			});

			if (existingApplication) {
				throw new BadRequestException('Você já possui uma aplicação de comércio. Apenas uma aplicação por usuário é permitida.');
			}

			// Create commerce application through Prisma directly with new field mapping
			const application = await this.prisma.commerceApplication.create({
				data: {
					userId,
					businessName: dto.businessName,
					productOrService: dto.productOrService,
					averagePrices: dto.averagePrices,
					monthlyPixSales: dto.monthlyPixSales,
					marketTime: dto.marketTime,
					references: dto.references,
					refundRate: dto.refundRate,
					refundProcess: dto.refundProcess,
					businessProof: dto.businessProof,
					contactInfo: dto.contactInfo,
					status: 'PENDING',
				},
			});

			// Log the action
			await this.auditLogRepository.createLog({
				userId,
				action: 'COMMERCE_APPLICATION_SUBMITTED',
				resource: 'CommerceApplication',
				resourceId: application.id,
				requestBody: {
					businessName: dto.businessName,
					status: 'PENDING',
				},
			});

			return {
				success: true,
				message: 'Aplicação enviada com sucesso!',
				applicationId: application.id,
			};
		} catch (error) {
			console.error('Error submitting commerce request:', error);

			// Handle specific Prisma errors
			if (error.code === 'P2002') {
				throw new BadRequestException('Você já possui uma aplicação de comércio. Apenas uma aplicação por usuário é permitida.');
			}

			// Re-throw BadRequestException with the same message
			if (error instanceof BadRequestException) {
				throw error;
			}

			throw new BadRequestException('Erro ao enviar aplicação');
		}
	}

	async getAllCommerceRequests() {
		try {
			const applications = await this.prisma.commerceApplication.findMany({
				include: {
					user: {
						select: {
							id: true,
							username: true,
							email: true,
						},
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
			});

			return {
				success: true,
				data: applications,
			};
		} catch (error) {
			console.error('Error fetching commerce requests:', error);
			throw new BadRequestException('Erro ao buscar aplicações');
		}
	}

	async approveCommerceRequest(applicationId: string, adminId: string, reviewNotes?: string) {
		try {
			// Find the application
			const application = await this.prisma.commerceApplication.findUnique({
				where: { id: applicationId },
				include: {
					user: {
						select: {
							id: true,
							username: true,
							email: true,
						},
					},
				},
			});

			if (!application) {
				throw new NotFoundException('Aplicação não encontrada');
			}

			if (application.status !== 'PENDING') {
				throw new BadRequestException('Esta aplicação não pode ser aprovada');
			}

			// Update application status to APPROVED and set deposit requirement
			const updatedApplication = await this.prisma.commerceApplication.update({
				where: { id: applicationId },
				data: {
					status: 'DEPOSIT_PENDING', // Change to DEPOSIT_PENDING first
					reviewedBy: adminId,
					reviewedAt: new Date(),
					reviewNotes: reviewNotes || 'Aplicação aprovada',
					depositAmount: 100000, // 100,000 satoshis deposit
				},
				include: {
					user: {
						select: {
							id: true,
							username: true,
							email: true,
						},
					},
				},
			});

			// Create audit log
			await this.auditLogRepository.createLog({
				userId: adminId,
				action: 'APPROVE_COMMERCE_APPLICATION',
				resource: 'CommerceApplication',
				resourceId: applicationId,
				requestBody: { reviewNotes },
			});

			return {
				success: true,
				message: 'Aplicação aprovada com sucesso',
				data: updatedApplication,
			};
		} catch (error) {
			console.error('Error approving commerce request:', error);

			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}

			throw new BadRequestException('Erro ao aprovar aplicação');
		}
	}

	async rejectCommerceRequest(applicationId: string, adminId: string, rejectionReason: string, reviewNotes?: string) {
		try {
			// Find the application
			const application = await this.prisma.commerceApplication.findUnique({
				where: { id: applicationId },
				include: {
					user: {
						select: {
							id: true,
							username: true,
							email: true,
						},
					},
				},
			});

			if (!application) {
				throw new NotFoundException('Aplicação não encontrada');
			}

			if (application.status !== 'PENDING') {
				throw new BadRequestException('Esta aplicação não pode ser rejeitada');
			}

			// Update application status to REJECTED
			const updatedApplication = await this.prisma.commerceApplication.update({
				where: { id: applicationId },
				data: {
					status: 'REJECTED',
					reviewedBy: adminId,
					reviewedAt: new Date(),
					reviewNotes: reviewNotes || 'Aplicação rejeitada',
					rejectionReason,
				},
				include: {
					user: {
						select: {
							id: true,
							username: true,
							email: true,
						},
					},
				},
			});

			// Create audit log
			await this.auditLogRepository.createLog({
				userId: adminId,
				action: 'REJECT_COMMERCE_APPLICATION',
				resource: 'CommerceApplication',
				resourceId: applicationId,
				requestBody: { rejectionReason, reviewNotes },
			});

			return {
				success: true,
				message: 'Aplicação rejeitada',
				data: updatedApplication,
			};
		} catch (error) {
			console.error('Error rejecting commerce request:', error);

			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}

			throw new BadRequestException('Erro ao rejeitar aplicação');
		}
	}

	async markDepositPaid(applicationId: string, adminId: string, notes?: string) {
		try {
			// Find the application
			const application = await this.prisma.commerceApplication.findUnique({
				where: { id: applicationId },
				include: { user: true },
			});

			if (!application) {
				throw new NotFoundException('Aplicação não encontrada');
			}

			// Check if application is in DEPOSIT_PENDING status
			if (application.status !== 'DEPOSIT_PENDING') {
				throw new BadRequestException(
					'Aplicação deve estar no status DEPOSIT_PENDING para marcar depósito como pago',
				);
			}

			// Check if deposit is already paid
			if (application.depositPaid) {
				throw new BadRequestException('Depósito já foi marcado como pago');
			}

			// Update application to mark deposit as paid and activate commerce mode
			const updatedApplication = await this.prisma.commerceApplication.update({
				where: { id: applicationId },
				data: {
					depositPaid: true,
					depositPaidAt: new Date(),
					status: 'ACTIVE',
					commerceActivatedAt: new Date(),
					reviewNotes: notes || 'Depósito confirmado - Modo Comércio ativado',
				},
				include: { user: true },
			});

			// Activate commerce mode for the user
			await this.prisma.user.update({
				where: { id: application.userId },
				data: {
					commerceMode: true,
					commerceModeActivatedAt: new Date(),
				},
			});

			// Log audit entry
			await this.auditLogRepository.createLog({
				userId: adminId,
				action: 'COMMERCE_DEPOSIT_PAID',
				resource: 'CommerceApplication',
				resourceId: applicationId,
				requestBody: { notes },
			});

			return {
				success: true,
				message: 'Depósito marcado como pago e Modo Comércio ativado',
				data: updatedApplication,
			};
		} catch (error) {
			console.error('Error marking deposit as paid:', error);

			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}

			throw new BadRequestException('Erro ao marcar depósito como pago');
		}
	}

	// Incident Management Methods
	async createIncident(createdBy: string, createIncidentDto: {
		title: string;
		description?: string;
		severity: IncidentSeverity;
		affectedServices?: string[];
		affectedFrom?: string;
		affectedTo?: string;
	}) {
		try {
			const incident = await this.prisma.incident.create({
				data: {
					title: createIncidentDto.title,
					description: createIncidentDto.description,
					severity: createIncidentDto.severity,
					affectedServices: createIncidentDto.affectedServices || [],
					affectedFrom: createIncidentDto.affectedFrom ? new Date(createIncidentDto.affectedFrom) : null,
					affectedTo: createIncidentDto.affectedTo ? new Date(createIncidentDto.affectedTo) : null,
					createdBy,
				},
				include: {
					creator: {
						select: { username: true }
					},
					updates: true
				}
			});

			// Log audit entry
			await this.auditLogRepository.createLog({
				userId: createdBy,
				action: 'CREATE_INCIDENT',
				resource: 'Incident',
				resourceId: incident.id,
				requestBody: createIncidentDto,
			});

			return {
				success: true,
				message: 'Incidente criado com sucesso',
				data: incident
			};
		} catch (error) {
			console.error('Error creating incident:', error);
			throw new BadRequestException('Erro ao criar incidente');
		}
	}

	async updateIncident(incidentId: string, updateIncidentDto: {
		title?: string;
		description?: string;
		status?: IncidentStatus;
		severity?: IncidentSeverity;
		affectedServices?: string[];
	}) {
		try {
			const existingIncident = await this.prisma.incident.findUnique({
				where: { id: incidentId }
			});

			if (!existingIncident) {
				throw new NotFoundException('Incidente não encontrado');
			}

			const updateData: any = {};
			if (updateIncidentDto.title) updateData.title = updateIncidentDto.title;
			if (updateIncidentDto.description !== undefined) updateData.description = updateIncidentDto.description;
			if (updateIncidentDto.status) updateData.status = updateIncidentDto.status;
			if (updateIncidentDto.severity) updateData.severity = updateIncidentDto.severity;
			if (updateIncidentDto.affectedServices) updateData.affectedServices = updateIncidentDto.affectedServices;

			if (updateIncidentDto.status === 'RESOLVED' && existingIncident.status !== 'RESOLVED') {
				updateData.resolvedAt = new Date();
			}

			const incident = await this.prisma.incident.update({
				where: { id: incidentId },
				data: updateData,
				include: {
					creator: {
						select: { username: true }
					},
					updates: {
						orderBy: { createdAt: 'desc' },
						include: {
							creator: {
								select: { username: true }
							}
						}
					}
				}
			});

			return {
				success: true,
				message: 'Incidente atualizado com sucesso',
				data: incident
			};
		} catch (error) {
			console.error('Error updating incident:', error);
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new BadRequestException('Erro ao atualizar incidente');
		}
	}

	async addIncidentUpdate(incidentId: string, createdBy: string, message: string) {
		try {
			const incident = await this.prisma.incident.findUnique({
				where: { id: incidentId }
			});

			if (!incident) {
				throw new NotFoundException('Incidente não encontrado');
			}

			const update = await this.prisma.incidentUpdate.create({
				data: {
					incidentId,
					message,
					createdBy
				},
				include: {
					creator: {
						select: { username: true }
					}
				}
			});

			// Log audit entry
			await this.auditLogRepository.createLog({
				userId: createdBy,
				action: 'ADD_INCIDENT_UPDATE',
				resource: 'IncidentUpdate',
				resourceId: update.id,
				requestBody: { incidentId, message },
			});

			return {
				success: true,
				message: 'Atualização adicionada com sucesso',
				data: update
			};
		} catch (error) {
			console.error('Error adding incident update:', error);
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new BadRequestException('Erro ao adicionar atualização do incidente');
		}
	}

	async resolveIncident(incidentId: string, resolvedBy: string, message?: string) {
		try {
			const incident = await this.prisma.incident.findUnique({
				where: { id: incidentId }
			});

			if (!incident) {
				throw new NotFoundException('Incidente não encontrado');
			}

			if (incident.status === 'RESOLVED') {
				throw new BadRequestException('Incidente já foi resolvido');
			}

			// Update incident status
			const updatedIncident = await this.prisma.incident.update({
				where: { id: incidentId },
				data: {
					status: 'RESOLVED',
					resolvedAt: new Date()
				},
				include: {
					creator: {
						select: { username: true }
					},
					updates: {
						orderBy: { createdAt: 'desc' },
						include: {
							creator: {
								select: { username: true }
							}
						}
					}
				}
			});

			// Add resolution update if message provided
			if (message) {
				await this.prisma.incidentUpdate.create({
					data: {
						incidentId,
						message: `RESOLVIDO: ${message}`,
						createdBy: resolvedBy
					}
				});
			}

			// Log audit entry
			await this.auditLogRepository.createLog({
				userId: resolvedBy,
				action: 'RESOLVE_INCIDENT',
				resource: 'Incident',
				resourceId: incidentId,
				requestBody: { message },
			});

			return {
				success: true,
				message: 'Incidente resolvido com sucesso',
				data: updatedIncident
			};
		} catch (error) {
			console.error('Error resolving incident:', error);
			if (error instanceof NotFoundException || error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException('Erro ao resolver incidente');
		}
	}
}
