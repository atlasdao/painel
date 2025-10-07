import { Test, TestingModule } from '@nestjs/testing'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ForbiddenException } from '@nestjs/common'
import { TransactionStatus, TransactionType } from '@prisma/client'

describe('AdminController', () => {
	let controller: AdminController
	let adminService: jest.Mocked<AdminService>

	const mockAdminUser = {
		sub: 'admin-123',
		email: 'admin@example.com',
		username: 'adminuser',
		roles: ['user', 'admin'],
	}

	const mockRegularUser = {
		sub: 'user-123',
		email: 'user@example.com',
		username: 'regularuser',
		roles: ['user'],
	}

	const mockUserData = {
		id: 'user-456',
		email: 'test@example.com',
		username: 'testuser',
		isActive: true,
		roles: ['user'],
		createdAt: new Date(),
	}

	const mockTransaction = {
		id: 'trans-123',
		userId: 'user-456',
		type: TransactionType.DEPOSIT,
		amount: 100.0,
		status: TransactionStatus.COMPLETED,
		createdAt: new Date(),
	}

	const mockAuditLog = {
		id: 'audit-123',
		userId: 'user-456',
		action: 'USER_LOGIN',
		resource: 'auth',
		createdAt: new Date(),
	}

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AdminController],
			providers: [
				{
					provide: AdminService,
					useValue: {
						getAllUsers: jest.fn(),
						getUserById: jest.fn(),
						updateUserStatus: jest.fn(),
						revokeUserApiKey: jest.fn(),
						deleteUser: jest.fn(),
						getAllTransactions: jest.fn(),
						updateTransactionStatus: jest.fn(),
						getAuditLogs: jest.fn(),
						getSystemStats: jest.fn(),
						getUserStats: jest.fn(),
						getAuditStats: jest.fn(),
					},
				},
			],
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({ canActivate: jest.fn(() => true) })
			.compile()

		controller = module.get<AdminController>(AdminController)
		adminService = module.get(AdminService) as jest.Mocked<AdminService>
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('Authorization checks', () => {
		it('should allow admin access', async () => {
			const mockRequest = { user: mockAdminUser }
			adminService.getAllUsers.mockResolvedValue({ users: [mockUserData], total: 1 })

			await expect(controller.getAllUsers(mockRequest)).resolves.toBeDefined()
		})

		it('should deny non-admin access', async () => {
			const mockRequest = { user: mockRegularUser }

			await expect(controller.getAllUsers(mockRequest)).rejects.toThrow(ForbiddenException)
			expect(adminService.getAllUsers).not.toHaveBeenCalled()
		})
	})

	describe('getAllUsers', () => {
		it('should get all users', async () => {
			const mockRequest = { user: mockAdminUser }
			const mockResponse = { users: [mockUserData], total: 1 }
			adminService.getAllUsers.mockResolvedValue(mockResponse)

			const result = await controller.getAllUsers(mockRequest)

			expect(result).toEqual(mockResponse)
			expect(adminService.getAllUsers).toHaveBeenCalledWith({
				skip: undefined,
				take: undefined,
				isActive: undefined,
			})
		})

		it('should filter active users', async () => {
			const mockRequest = { user: mockAdminUser }
			const mockResponse = { users: [mockUserData], total: 1 }
			adminService.getAllUsers.mockResolvedValue(mockResponse)

			const result = await controller.getAllUsers(mockRequest, 0, 10, true)

			expect(result).toEqual(mockResponse)
			expect(adminService.getAllUsers).toHaveBeenCalledWith({
				skip: 0,
				take: 10,
				isActive: true,
			})
		})

		it('should apply pagination', async () => {
			const mockRequest = { user: mockAdminUser }
			const mockResponse = { users: [], total: 0 }
			adminService.getAllUsers.mockResolvedValue(mockResponse)

			const result = await controller.getAllUsers(mockRequest, 20, 10)

			expect(result).toEqual(mockResponse)
			expect(adminService.getAllUsers).toHaveBeenCalledWith({
				skip: 20,
				take: 10,
				isActive: undefined,
			})
		})
	})

	describe('getUserById', () => {
		it('should get user by ID', async () => {
			const mockRequest = { user: mockAdminUser }
			adminService.getUserById.mockResolvedValue(mockUserData)

			const result = await controller.getUserById(mockRequest, 'user-456')

			expect(result).toEqual(mockUserData)
			expect(adminService.getUserById).toHaveBeenCalledWith('user-456')
		})

		it('should deny non-admin access', async () => {
			const mockRequest = { user: mockRegularUser }

			await expect(controller.getUserById(mockRequest, 'user-456')).rejects.toThrow(ForbiddenException)
		})
	})

	describe('updateUserStatus', () => {
		it('should update user status', async () => {
			const mockRequest = { user: mockAdminUser }
			const updatedUser = { ...mockUserData, isActive: false }
			adminService.updateUserStatus.mockResolvedValue(updatedUser)

			const result = await controller.updateUserStatus(mockRequest, 'user-456', false)

			expect(result).toEqual(updatedUser)
			expect(adminService.updateUserStatus).toHaveBeenCalledWith('user-456', false)
		})
	})

	describe('revokeUserApiKey', () => {
		it('should revoke user API key', async () => {
			const mockRequest = { user: mockAdminUser }
			adminService.revokeUserApiKey.mockResolvedValue(undefined)

			await controller.revokeUserApiKey(mockRequest, 'user-456')

			expect(adminService.revokeUserApiKey).toHaveBeenCalledWith('user-456')
		})
	})

	describe('deleteUser', () => {
		it('should delete user', async () => {
			const mockRequest = { user: mockAdminUser }
			adminService.deleteUser.mockResolvedValue(undefined)

			await controller.deleteUser(mockRequest, 'user-456')

			expect(adminService.deleteUser).toHaveBeenCalledWith('user-456')
		})
	})

	describe('getAllTransactions', () => {
		it('should get all transactions', async () => {
			const mockRequest = { user: mockAdminUser }
			const mockResponse = { transactions: [mockTransaction], total: 1 }
			adminService.getAllTransactions.mockResolvedValue(mockResponse)

			const result = await controller.getAllTransactions(mockRequest)

			expect(result).toEqual(mockResponse)
			expect(adminService.getAllTransactions).toHaveBeenCalledWith({
				skip: undefined,
				take: undefined,
				status: undefined,
				type: undefined,
				userId: undefined,
			})
		})

		it('should filter transactions', async () => {
			const mockRequest = { user: mockAdminUser }
			const mockResponse = { transactions: [mockTransaction], total: 1 }
			adminService.getAllTransactions.mockResolvedValue(mockResponse)

			const result = await controller.getAllTransactions(
				mockRequest,
				0,
				10,
				TransactionStatus.COMPLETED,
				TransactionType.DEPOSIT,
				'user-456',
			)

			expect(result).toEqual(mockResponse)
			expect(adminService.getAllTransactions).toHaveBeenCalledWith({
				skip: 0,
				take: 10,
				status: TransactionStatus.COMPLETED,
				type: TransactionType.DEPOSIT,
				userId: 'user-456',
			})
		})
	})

	describe('updateTransactionStatus', () => {
		it('should update transaction status', async () => {
			const mockRequest = { user: mockAdminUser }
			const updatedTransaction = { ...mockTransaction, status: TransactionStatus.FAILED }
			adminService.updateTransactionStatus.mockResolvedValue(updatedTransaction)

			const result = await controller.updateTransactionStatus(mockRequest, 'trans-123', {
				status: TransactionStatus.FAILED,
				errorMessage: 'Payment declined',
			})

			expect(result).toEqual(updatedTransaction)
			expect(adminService.updateTransactionStatus).toHaveBeenCalledWith('trans-123', TransactionStatus.FAILED, 'Payment declined')
		})
	})

	describe('getAuditLogs', () => {
		it('should get audit logs', async () => {
			const mockRequest = { user: mockAdminUser }
			const mockResponse = { logs: [mockAuditLog], total: 1 }
			adminService.getAuditLogs.mockResolvedValue(mockResponse)

			const result = await controller.getAuditLogs(mockRequest)

			expect(result).toEqual(mockResponse)
			expect(adminService.getAuditLogs).toHaveBeenCalledWith({
				skip: undefined,
				take: undefined,
				userId: undefined,
				action: undefined,
				resource: undefined,
				startDate: undefined,
				endDate: undefined,
			})
		})

		it('should filter audit logs', async () => {
			const mockRequest = { user: mockAdminUser }
			const mockResponse = { logs: [mockAuditLog], total: 1 }
			const startDate = new Date('2024-01-01')
			const endDate = new Date('2024-12-31')

			adminService.getAuditLogs.mockResolvedValue(mockResponse)

			const result = await controller.getAuditLogs(mockRequest, 0, 10, 'user-456', 'USER_LOGIN', 'auth', startDate, endDate)

			expect(result).toEqual(mockResponse)
			expect(adminService.getAuditLogs).toHaveBeenCalledWith({
				skip: 0,
				take: 10,
				userId: 'user-456',
				action: 'USER_LOGIN',
				resource: 'auth',
				startDate,
				endDate,
			})
		})
	})

	describe('getSystemStats', () => {
		it('should get system statistics', async () => {
			const mockRequest = { user: mockAdminUser }
			const mockStats = {
				totalUsers: 100,
				totalTransactions: 500,
				totalVolume: 50000,
				averageTransactionAmount: 100,
			}

			adminService.getSystemStats.mockResolvedValue(mockStats)

			const result = await controller.getSystemStats(mockRequest)

			expect(result).toEqual(mockStats)
			expect(adminService.getSystemStats).toHaveBeenCalled()
		})
	})

	describe('getUserStats', () => {
		it('should get user statistics', async () => {
			const mockRequest = { user: mockAdminUser }
			const mockStats = {
				total: 100,
				active: 90,
				inactive: 10,
				deleted: 5,
				withApiKeys: 30,
				activeLastMonth: 75,
			}

			adminService.getUserStats.mockResolvedValue(mockStats)

			const result = await controller.getUserStats(mockRequest)

			expect(result).toEqual(mockStats)
			expect(adminService.getUserStats).toHaveBeenCalled()
		})
	})

	describe('getAuditStats', () => {
		it('should get audit statistics', async () => {
			const mockRequest = { user: mockAdminUser }
			const mockStats = {
				totalLogs: 1000,
				byAction: {
					USER_LOGIN: 400,
					USER_LOGOUT: 300,
					TRANSACTION_CREATED: 300,
				},
				byResource: {
					auth: 700,
					transaction: 300,
				},
				topUsers: [
					{ userId: 'user-1', count: 100 },
					{ userId: 'user-2', count: 80 },
				],
			}

			adminService.getAuditStats.mockResolvedValue(mockStats)

			const result = await controller.getAuditStats(mockRequest)

			expect(result).toEqual(mockStats)
			expect(adminService.getAuditStats).toHaveBeenCalledWith(undefined, undefined)
		})

		it('should filter audit stats by date range', async () => {
			const mockRequest = { user: mockAdminUser }
			const startDate = new Date('2024-01-01')
			const endDate = new Date('2024-12-31')
			const mockStats = {
				totalLogs: 500,
				byAction: {},
				byResource: {},
				topUsers: [],
			}

			adminService.getAuditStats.mockResolvedValue(mockStats)

			const result = await controller.getAuditStats(mockRequest, startDate, endDate)

			expect(result).toEqual(mockStats)
			expect(adminService.getAuditStats).toHaveBeenCalledWith(startDate, endDate)
		})
	})
})