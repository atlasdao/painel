import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { UserRepository } from '../repositories/user.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AdminService', () => {
	let service: AdminService;
	let userRepository: jest.Mocked<UserRepository>;
	let transactionRepository: jest.Mocked<TransactionRepository>;
	let auditLogRepository: jest.Mocked<AuditLogRepository>;

	const mockUser = {
		id: 'user-123',
		email: 'test@example.com',
		username: 'testuser',
		password: 'hashed_password',
		apiKey: 'sk_test_key',
		apiKeyName: 'Test Key',
		apiKeyExpiresAt: null,
		roles: ['user'],
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		lastLoginAt: new Date(),
		deletedAt: null,
	};

	const mockTransaction = {
		id: 'trans-123',
		userId: 'user-123',
		type: 'DEPOSIT',
		amount: 100.0,
		currency: 'BRL',
		status: 'COMPLETED',
		pixKey: 'user@example.com',
		description: 'Test transaction',
		externalId: 'ext-123',
		fee: 2.5,
		errorMessage: null,
		metadata: {},
		createdAt: new Date(),
		updatedAt: new Date(),
		completedAt: new Date(),
	};

	const mockAuditLog = {
		id: 'audit-123',
		userId: 'user-123',
		action: 'USER_LOGIN',
		resource: 'auth',
		resourceId: 'user-123',
		details: { ip: '127.0.0.1' },
		ipAddress: '127.0.0.1',
		userAgent: 'Mozilla/5.0',
		createdAt: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AdminService,
				{
					provide: UserRepository,
					useValue: {
						findAll: jest.fn(),
						findActiveUsers: jest.fn(),
						findById: jest.fn(),
						update: jest.fn(),
						delete: jest.fn(),
						count: jest.fn(),
					},
				},
				{
					provide: TransactionRepository,
					useValue: {
						findAll: jest.fn(),
						findByUserId: jest.fn(),
						findById: jest.fn(),
						update: jest.fn(),
						updateStatus: jest.fn(),
						count: jest.fn(),
						getStats: jest.fn(),
						getTransactionStats: jest.fn(),
					},
				},
				{
					provide: AuditLogRepository,
					useValue: {
						findAll: jest.fn(),
						create: jest.fn(),
						count: jest.fn(),
						getStats: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<AdminService>(AdminService);
		userRepository = module.get(UserRepository) as jest.Mocked<UserRepository>;
		transactionRepository = module.get(
			TransactionRepository,
		) as jest.Mocked<TransactionRepository>;
		auditLogRepository = module.get(
			AuditLogRepository,
		) as jest.Mocked<AuditLogRepository>;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getAllUsers', () => {
		it('should get all users with default pagination', async () => {
			const users = [mockUser];
			userRepository.findAll.mockResolvedValue(users);

			const result = await service.getAllUsers({});

			expect(result).toEqual(users);
			expect(userRepository.findAll).toHaveBeenCalledWith({});
		});

		it('should filter active users', async () => {
			const activeUsers = [{ ...mockUser, isActive: true }];
			userRepository.findActiveUsers.mockResolvedValue(activeUsers);

			const result = await service.getAllUsers({ isActive: true });

			expect(result).toEqual(activeUsers);
			expect(userRepository.findActiveUsers).toHaveBeenCalledWith({
				isActive: true,
			});
		});

		it('should filter inactive users', async () => {
			const inactiveUsers = [{ ...mockUser, isActive: false }];
			userRepository.findActiveUsers.mockResolvedValue(inactiveUsers);

			const result = await service.getAllUsers({ isActive: false });

			expect(result).toEqual(inactiveUsers);
			expect(userRepository.findActiveUsers).toHaveBeenCalledWith({
				isActive: false,
			});
		});

		it('should apply pagination parameters', async () => {
			userRepository.findAll.mockResolvedValue([]);

			await service.getAllUsers({ skip: 10, take: 20 });

			expect(userRepository.findAll).toHaveBeenCalledWith({
				skip: 10,
				take: 20,
			});
		});
	});

	describe('getUserById', () => {
		it('should get user by ID successfully', async () => {
			userRepository.findById.mockResolvedValue(mockUser);

			const result = await service.getUserById('user-123');

			expect(result).toEqual(mockUser);
			expect(userRepository.findById).toHaveBeenCalledWith('user-123');
		});

		it('should throw NotFoundException for non-existent user', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.getUserById('invalid-id')).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe('updateUserStatus', () => {
		it('should activate user successfully', async () => {
			const inactiveUser = { ...mockUser, isActive: false };
			const activatedUser = { ...mockUser, isActive: true };
			userRepository.findById.mockResolvedValue(inactiveUser);
			userRepository.update.mockResolvedValue(activatedUser);

			const result = await service.updateUserStatus('user-123', true);

			expect(result.isActive).toBe(true);
			expect(userRepository.update).toHaveBeenCalledWith('user-123', {
				isActive: true,
			});
		});

		it('should deactivate user successfully', async () => {
			const deactivatedUser = { ...mockUser, isActive: false };
			userRepository.findById.mockResolvedValue(mockUser);
			userRepository.update.mockResolvedValue(deactivatedUser);

			const result = await service.updateUserStatus('user-123', false);

			expect(result.isActive).toBe(false);
			expect(userRepository.update).toHaveBeenCalledWith('user-123', {
				isActive: false,
			});
		});

		it('should throw NotFoundException for non-existent user', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(
				service.updateUserStatus('invalid-id', true),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe('revokeUserApiKey', () => {
		it('should revoke API key successfully', async () => {
			userRepository.findById.mockResolvedValue(mockUser);
			userRepository.update.mockResolvedValue({ ...mockUser, apiKey: null });

			await service.revokeUserApiKey('user-123');

			expect(userRepository.update).toHaveBeenCalledWith('user-123', {
				apiKey: null,
			});
		});

		it('should throw NotFoundException for non-existent user', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.revokeUserApiKey('invalid-id')).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe('deleteUser', () => {
		it('should delete user without pending transactions', async () => {
			userRepository.findById.mockResolvedValue(mockUser);
			transactionRepository.findByUserId.mockResolvedValue([]);
			userRepository.delete.mockResolvedValue(undefined);

			await service.deleteUser('user-123');

			expect(transactionRepository.findByUserId).toHaveBeenCalledWith(
				'user-123',
				{ status: 'PENDING' },
			);
			expect(userRepository.delete).toHaveBeenCalledWith('user-123');
		});

		it('should throw ForbiddenException if user has pending transactions', async () => {
			const pendingTransaction = { ...mockTransaction, status: 'PENDING' };
			userRepository.findById.mockResolvedValue(mockUser);
			transactionRepository.findByUserId.mockResolvedValue([
				pendingTransaction,
			]);

			await expect(service.deleteUser('user-123')).rejects.toThrow(
				ForbiddenException,
			);
			expect(userRepository.delete).not.toHaveBeenCalled();
		});

		it('should throw NotFoundException for non-existent user', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.deleteUser('invalid-id')).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe('getUserStats', () => {
		it('should get user statistics', async () => {
			const mockStats = {
				totalUsers: 50,
				activeUsers: 45,
				inactiveUsers: 5,
				usersWithApiKeys: 30,
			};

			userRepository.count
				.mockResolvedValueOnce(50) // total
				.mockResolvedValueOnce(45) // active
				.mockResolvedValueOnce(5) // inactive
				.mockResolvedValueOnce(30); // with API keys

			const result = await service.getUserStats();

			expect(result).toHaveProperty('totalUsers', 50);
			expect(result).toHaveProperty('activeUsers', 45);
			expect(result).toHaveProperty('inactiveUsers', 5);
			expect(result).toHaveProperty('usersWithApiKeys', 30);
		});
	});

	describe('getTransactionStats', () => {
		it('should get transaction statistics', async () => {
			const mockStats = {
				totalTransactions: 100,
				totalVolume: 10000,
				averageAmount: 100,
				byStatus: {
					COMPLETED: 80,
					PENDING: 10,
					FAILED: 10,
				},
				byType: {
					DEPOSIT: 40,
					WITHDRAW: 30,
					TRANSFER: 30,
				},
			};

			transactionRepository.getStats.mockResolvedValue(mockStats);

			const result = await service.getTransactionStats();

			expect(result).toEqual(mockStats);
			expect(transactionRepository.getStats).toHaveBeenCalled();
		});
	});

	describe('getAuditLogs', () => {
		it('should get audit logs with filters', async () => {
			const filters = {
				userId: 'user-123',
				action: 'USER_LOGIN',
				startDate: new Date('2024-01-01'),
				endDate: new Date('2024-12-31'),
			};

			auditLogRepository.findAll.mockResolvedValue([mockAuditLog]);

			const result = await service.getAuditLogs(filters);

			expect(result).toEqual([mockAuditLog]);
			expect(auditLogRepository.findAll).toHaveBeenCalledWith(filters);
		});

		it('should get all audit logs without filters', async () => {
			auditLogRepository.findAll.mockResolvedValue([mockAuditLog]);

			const result = await service.getAuditLogs();

			expect(result).toEqual([mockAuditLog]);
			expect(auditLogRepository.findAll).toHaveBeenCalledWith({});
		});
	});

	describe('getAllTransactions', () => {
		it('should get all transactions with filters', async () => {
			const filters = {
				status: 'COMPLETED',
				type: 'DEPOSIT',
				userId: 'user-123',
			};

			transactionRepository.findAll.mockResolvedValue([mockTransaction]);

			const result = await service.getAllTransactions(filters);

			expect(result).toEqual([mockTransaction]);
			expect(transactionRepository.findAll).toHaveBeenCalledWith(filters);
		});

		it('should get all transactions without filters', async () => {
			transactionRepository.findAll.mockResolvedValue([mockTransaction]);

			const result = await service.getAllTransactions();

			expect(result).toEqual([mockTransaction]);
			expect(transactionRepository.findAll).toHaveBeenCalledWith({});
		});
	});

	describe('updateTransactionStatus', () => {
		it('should update transaction status to COMPLETED', async () => {
			const updatedTransaction = {
				...mockTransaction,
				status: 'COMPLETED',
				completedAt: new Date(),
			};
			transactionRepository.findById.mockResolvedValue(mockTransaction);
			transactionRepository.update.mockResolvedValue(updatedTransaction);

			const result = await service.updateTransactionStatus(
				'trans-123',
				'COMPLETED',
			);

			expect(result.status).toBe('COMPLETED');
			expect(transactionRepository.update).toHaveBeenCalledWith('trans-123', {
				status: 'COMPLETED',
				completedAt: expect.any(Date),
			});
		});

		it('should update transaction status to FAILED with error message', async () => {
			const failedTransaction = {
				...mockTransaction,
				status: 'FAILED',
				errorMessage: 'Payment declined',
			};
			transactionRepository.findById.mockResolvedValue(mockTransaction);
			transactionRepository.update.mockResolvedValue(failedTransaction);

			const result = await service.updateTransactionStatus(
				'trans-123',
				'FAILED',
				'Payment declined',
			);

			expect(result.status).toBe('FAILED');
			expect(result.errorMessage).toBe('Payment declined');
			expect(transactionRepository.update).toHaveBeenCalledWith('trans-123', {
				status: 'FAILED',
				errorMessage: 'Payment declined',
			});
		});

		it('should throw NotFoundException for non-existent transaction', async () => {
			transactionRepository.findById.mockResolvedValue(null);

			await expect(
				service.updateTransactionStatus('invalid-id', 'COMPLETED'),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe('getSystemStats', () => {
		it('should get comprehensive system statistics', async () => {
			const userStats = {
				totalUsers: 50,
				activeUsers: 45,
				inactiveUsers: 5,
				usersWithApiKeys: 30,
			};

			const transactionStats = {
				totalTransactions: 100,
				totalVolume: 10000,
				averageAmount: 100,
				byStatus: {
					COMPLETED: 80,
					PENDING: 10,
					FAILED: 10,
				},
				byType: {
					DEPOSIT: 40,
					WITHDRAW: 30,
					TRANSFER: 30,
				},
			};

			const auditStats = {
				totalLogs: 500,
				byAction: {
					USER_LOGIN: 200,
					USER_LOGOUT: 150,
					TRANSACTION_CREATED: 150,
				},
			};

			// Mock getUserStats method
			jest.spyOn(service, 'getUserStats').mockResolvedValue(userStats);

			// Mock getTransactionStats method
			jest
				.spyOn(service, 'getTransactionStats')
				.mockResolvedValue(transactionStats);

			// Mock audit log stats
			auditLogRepository.getStats.mockResolvedValue(auditStats);

			const result = await service.getSystemStats();

			expect(result).toHaveProperty('users', userStats);
			expect(result).toHaveProperty('transactions', transactionStats);
			expect(result).toHaveProperty('auditLogs', auditStats);
		});
	});
});
