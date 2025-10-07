import { Test, TestingModule } from '@nestjs/testing';
import { PixService } from './pix.service';
import { EulenClientService } from '../services/eulen-client.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import {
	NotFoundException,
	BadRequestException,
	ForbiddenException,
} from '@nestjs/common';
import { TransactionStatus, TransactionType } from '@prisma/client';
import * as QRCode from 'qrcode';

jest.mock('qrcode');

describe('PixService', () => {
	let service: PixService;
	let eulenClient: jest.Mocked<EulenClientService>;
	let transactionRepository: jest.Mocked<TransactionRepository>;
	let auditLogRepository: jest.Mocked<AuditLogRepository>;

	// Real DePix test data
	const REAL_DEPIX_ADDRESS =
		'VJLCguHZDUbpy94zodwcvvUJgTxoLgjiMH8TfTwuYMUEzfMKwE2Ssu6J3LtWwtZUthoMq8HqEYhRm6Ff';
	const TEST_AMOUNT_CENTS = 100; // 1 BRL in cents

	const mockUser = {
		id: 'atlas-user-123',
		email: 'test@atlasdao.info',
		username: 'atlasuser',
		password: 'hashed_password',
		apiKey: null,
		apiKeyName: null,
		apiKeyExpiresAt: null,
		roles: ['user'],
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		lastLoginAt: null,
		deletedAt: null,
	};

	const mockTransaction = {
		id: 'depix-trans-123',
		userId: 'atlas-user-123',
		type: TransactionType.DEPOSIT,
		amount: TEST_AMOUNT_CENTS,
		currency: 'BRL',
		status: TransactionStatus.PENDING,
		pixKey: REAL_DEPIX_ADDRESS,
		description: 'Atlas DAO DePix transaction',
		externalId: 'ext-depix-123',
		fee: 0,
		errorMessage: null,
		metadata: {},
		createdAt: new Date(),
		updatedAt: new Date(),
		completedAt: null,
		user: mockUser,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PixService,
				{
					provide: EulenClientService,
					useValue: {
						createDeposit: jest.fn(),
						createWithdraw: jest.fn(),
						validatePixKey: jest.fn(),
						getBalance: jest.fn(),
						getDepositStatus: jest.fn(),
						getWithdrawStatus: jest.fn(),
						generatePixQRCode: jest.fn(),
					},
				},
				{
					provide: TransactionRepository,
					useValue: {
						create: jest.fn(),
						findById: jest.fn(),
						findByUserId: jest.fn(),
						findAll: jest.fn(),
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
						create: jest.fn(),
						createLog: jest.fn(),
						findAll: jest.fn(),
						findByUserId: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<PixService>(PixService);
		eulenClient = module.get(
			EulenClientService,
		) as jest.Mocked<EulenClientService>;
		transactionRepository = module.get(
			TransactionRepository,
		) as jest.Mocked<TransactionRepository>;
		auditLogRepository = module.get(
			AuditLogRepository,
		) as jest.Mocked<AuditLogRepository>;

		// Setup QRCode mock
		(QRCode.toDataURL as jest.Mock).mockResolvedValue(
			'data:image/png;base64,mockQRCode',
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('createDeposit', () => {
		it('should create deposit with real DePix address', async () => {
			const depositDto = {
				amount: TEST_AMOUNT_CENTS,
				pixKey: REAL_DEPIX_ADDRESS,
				description: 'Atlas DAO DePix deposit',
			};

			const eulenResponse = {
				transactionId: 'eulen-depix-456',
				status: 'PENDING',
				qrCode: 'data:image/png;base64,realQRCode',
			};

			eulenClient.createDeposit.mockResolvedValue(eulenResponse);
			transactionRepository.create.mockResolvedValue(mockTransaction);

			const result = await service.createDeposit(mockUser.id, depositDto);

			expect(result).toEqual(mockTransaction);
			expect(eulenClient.createDeposit).toHaveBeenCalledWith({
				amount: TEST_AMOUNT_CENTS,
				pixKey: REAL_DEPIX_ADDRESS,
				description: 'Atlas DAO DePix deposit',
			});
			expect(transactionRepository.create).toHaveBeenCalled();
			expect(auditLogRepository.create).toHaveBeenCalled();
		});

		it('should throw BadRequestException for invalid amount', async () => {
			const depositDto = {
				amount: -100, // Invalid negative amount
				pixKey: REAL_DEPIX_ADDRESS,
			};

			await expect(
				service.createDeposit(mockUser.id, depositDto),
			).rejects.toThrow(BadRequestException);
		});
	});

	describe('createWithdraw', () => {
		it('should create withdrawal to real DePix address', async () => {
			const withdrawDto = {
				amount: TEST_AMOUNT_CENTS,
				pixKey: REAL_DEPIX_ADDRESS,
				description: 'Atlas DAO DePix withdrawal',
			};

			const eulenResponse = {
				transactionId: 'eulen-withdraw-789',
				status: 'PROCESSING',
				fee: 2, // 0.02 BRL fee
			};

			eulenClient.getBalance.mockResolvedValue({ balance: 500000 }); // 5000 BRL
			eulenClient.createWithdraw.mockResolvedValue(eulenResponse);
			transactionRepository.create.mockResolvedValue({
				...mockTransaction,
				type: TransactionType.WITHDRAW,
				fee: 2,
			});

			const result = await service.createWithdraw(mockUser.id, withdrawDto);

			expect(result.type).toBe(TransactionType.WITHDRAW);
			expect(result.fee).toBe(2);
			expect(eulenClient.createWithdraw).toHaveBeenCalledWith({
				amount: TEST_AMOUNT_CENTS,
				pixKey: REAL_DEPIX_ADDRESS,
				description: 'Atlas DAO DePix withdrawal',
			});
		});

		it('should throw ForbiddenException for insufficient balance', async () => {
			const withdrawDto = {
				amount: 1000000, // 10,000 BRL
				pixKey: REAL_DEPIX_ADDRESS,
			};

			eulenClient.getBalance.mockResolvedValue({ balance: 50000 }); // Only 500 BRL available

			await expect(
				service.createWithdraw(mockUser.id, withdrawDto),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe('createTransfer', () => {
		it('should create internal transfer between Atlas DAO users', async () => {
			const transferDto = {
				amount: TEST_AMOUNT_CENTS,
				recipientId: 'atlas-user-456',
				description: 'Internal Atlas DAO transfer',
			};

			const recipientUser = {
				...mockUser,
				id: 'atlas-user-456',
				email: 'recipient@atlasdao.info',
			};

			eulenClient.getBalance.mockResolvedValue({ balance: 500000 });
			transactionRepository.create
				.mockResolvedValueOnce({
					...mockTransaction,
					type: TransactionType.TRANSFER_OUT,
				})
				.mockResolvedValueOnce({
					...mockTransaction,
					id: 'depix-trans-456',
					userId: recipientUser.id,
					type: TransactionType.TRANSFER_IN,
				});

			const result = await service.createTransfer(mockUser.id, transferDto);

			expect(result.type).toBe(TransactionType.TRANSFER_OUT);
			expect(transactionRepository.create).toHaveBeenCalledTimes(2);
			expect(auditLogRepository.create).toHaveBeenCalledTimes(2);
		});
	});

	describe('getTransactions', () => {
		it('should get user transactions with DePix addresses', async () => {
			const transactions = [
				mockTransaction,
				{
					...mockTransaction,
					id: 'depix-trans-456',
					type: TransactionType.WITHDRAW,
					status: TransactionStatus.COMPLETED,
				},
			];

			transactionRepository.findByUserId.mockResolvedValue(transactions);

			const result = await service.getTransactions(mockUser.id, {});

			expect(result).toEqual(transactions);
			expect(transactionRepository.findByUserId).toHaveBeenCalledWith(
				mockUser.id,
				{},
			);
		});

		it('should filter transactions by status', async () => {
			const completedTransaction = {
				...mockTransaction,
				status: TransactionStatus.COMPLETED,
			};

			transactionRepository.findByUserId.mockResolvedValue([
				completedTransaction,
			]);

			const result = await service.getTransactions(mockUser.id, {
				status: TransactionStatus.COMPLETED,
			});

			expect(result).toEqual([completedTransaction]);
			expect(transactionRepository.findByUserId).toHaveBeenCalledWith(
				mockUser.id,
				{
					status: TransactionStatus.COMPLETED,
				},
			);
		});
	});

	describe('getTransactionById', () => {
		it('should get transaction by ID', async () => {
			transactionRepository.findById.mockResolvedValue(mockTransaction);

			const result = await service.getTransactionById(
				mockUser.id,
				mockTransaction.id,
			);

			expect(result).toEqual(mockTransaction);
			expect(transactionRepository.findById).toHaveBeenCalledWith(
				mockTransaction.id,
			);
		});

		it('should throw NotFoundException for non-existent transaction', async () => {
			transactionRepository.findById.mockResolvedValue(null);

			await expect(
				service.getTransactionById(mockUser.id, 'invalid-id'),
			).rejects.toThrow(NotFoundException);
		});

		it('should throw ForbiddenException for unauthorized access', async () => {
			const otherUserTransaction = {
				...mockTransaction,
				userId: 'other-user-id',
			};

			transactionRepository.findById.mockResolvedValue(otherUserTransaction);

			await expect(
				service.getTransactionById(mockUser.id, mockTransaction.id),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe('getTransactionStatus', () => {
		it('should get transaction status from Eulen for DePix', async () => {
			const eulenStatus = {
				status: 'COMPLETED',
				confirmedAt: new Date().toISOString(),
				blockHeight: 123456,
			};

			transactionRepository.findById.mockResolvedValue(mockTransaction);
			eulenClient.getDepositStatus.mockResolvedValue(eulenStatus);

			const result = await service.getTransactionStatus(
				mockUser.id,
				mockTransaction.id,
			);

			expect(result).toEqual({
				transactionId: mockTransaction.id,
				status: mockTransaction.status,
				eulenStatus,
			});
		});
	});

	describe('generateQRCode', () => {
		it('should generate QR code for DePix payment', async () => {
			const qrCodeDto = {
				amount: TEST_AMOUNT_CENTS,
				description: 'Atlas DAO QR Code Payment',
			};

			const eulenQRCode = {
				qrCode: 'data:image/png;base64,eulenQRCode',
				qrCodeText: `00020126580014BR.GOV.BCB.PIX0136${REAL_DEPIX_ADDRESS}`,
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
			};

			eulenClient.generatePixQRCode.mockResolvedValue(eulenQRCode);

			const result = await service.generateQRCode(qrCodeDto);

			expect(result).toEqual(eulenQRCode);
			expect(eulenClient.generatePixQRCode).toHaveBeenCalledWith(qrCodeDto);
		});
	});

	describe('validatePixKey', () => {
		it('should validate real DePix address', async () => {
			const validateDto = {
				pixKey: REAL_DEPIX_ADDRESS,
			};

			const validationResult = {
				valid: true,
				type: 'DEPIX',
				network: 'liquid',
				address: REAL_DEPIX_ADDRESS,
			};

			eulenClient.validatePixKey.mockResolvedValue(validationResult);

			const result = await service.validatePixKey(validateDto);

			expect(result).toEqual(validationResult);
			expect(eulenClient.validatePixKey).toHaveBeenCalledWith(
				REAL_DEPIX_ADDRESS,
			);
		});

		it('should return invalid for incorrect DePix address', async () => {
			const validateDto = {
				pixKey: 'invalid-address',
			};

			const validationResult = {
				valid: false,
				error: 'Invalid DePix address format',
			};

			eulenClient.validatePixKey.mockResolvedValue(validationResult);

			const result = await service.validatePixKey(validateDto);

			expect(result.valid).toBe(false);
		});
	});

	describe('getBalance', () => {
		it('should get user balance in cents', async () => {
			const balanceData = {
				balance: 500000, // 5,000 BRL in cents
				available: 480000,
				pending: 20000,
				currency: 'BRL',
			};

			eulenClient.getBalance.mockResolvedValue(balanceData);
			transactionRepository.findByUserId.mockResolvedValue([]);

			const result = await service.getBalance(mockUser.id);

			expect(result).toEqual({
				...balanceData,
				transactions: [],
			});
		});
	});

	describe('updateTransactionFromEulen', () => {
		it('should update transaction status from Eulen for completed DePix', async () => {
			const pendingTransaction = {
				...mockTransaction,
				status: TransactionStatus.PENDING,
			};

			const eulenStatus = {
				status: 'COMPLETED',
				confirmedAt: new Date().toISOString(),
			};

			transactionRepository.findById.mockResolvedValue(pendingTransaction);
			eulenClient.getDepositStatus.mockResolvedValue(eulenStatus);
			transactionRepository.update.mockResolvedValue({
				...pendingTransaction,
				status: TransactionStatus.COMPLETED,
				completedAt: new Date(),
			});

			await service.updateTransactionFromEulen(pendingTransaction.id);

			expect(transactionRepository.update).toHaveBeenCalledWith(
				pendingTransaction.id,
				expect.objectContaining({
					status: TransactionStatus.COMPLETED,
					completedAt: expect.any(Date),
				}),
			);
		});

		it('should handle Eulen API errors during update', async () => {
			transactionRepository.findById.mockResolvedValue(mockTransaction);
			eulenClient.getDepositStatus.mockRejectedValue(
				new Error('Eulen API error'),
			);

			// Should not throw, just log the error
			await expect(
				service.updateTransactionFromEulen(mockTransaction.id),
			).resolves.not.toThrow();
		});
	});
});
