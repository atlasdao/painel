import { Test, TestingModule } from '@nestjs/testing';
import { PixController } from './pix.controller';
import { PixService } from './pix.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionStatus, TransactionType } from '@prisma/client';

describe('PixController', () => {
	let controller: PixController;
	let pixService: jest.Mocked<PixService>;

	const mockUser = {
		sub: 'user-123',
		email: 'test@example.com',
		username: 'testuser',
	};

	const mockTransaction = {
		transactionId: 'trans-123',
		userId: 'user-123',
		type: TransactionType.DEPOSIT,
		amount: 100.0,
		currency: 'BRL',
		status: TransactionStatus.PENDING,
		pixKey: 'user@example.com',
		description: 'Test transaction',
		createdAt: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [PixController],
			providers: [
				{
					provide: PixService,
					useValue: {
						createDeposit: jest.fn(),
						createWithdraw: jest.fn(),
						createTransfer: jest.fn(),
						getUserTransactions: jest.fn(),
						getTransactionStatus: jest.fn(),
						generatePixQRCode: jest.fn(),
						validatePixKey: jest.fn(),
						getBalance: jest.fn(),
					},
				},
			],
		})
			.overrideGuard(JwtAuthGuard)
			.useValue({ canActivate: jest.fn(() => true) })
			.compile();

		controller = module.get<PixController>(PixController);
		pixService = module.get(PixService) as jest.Mocked<PixService>;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('createDeposit', () => {
		it('should create deposit successfully', async () => {
			const depositDto = {
				amount: 100.0,
				pixKey: 'user@example.com',
				description: 'Test deposit',
			};

			const mockRequest = { user: mockUser };
			pixService.createDeposit.mockResolvedValue(mockTransaction);

			const result = await controller.createDeposit(mockRequest, depositDto);

			expect(result).toEqual(mockTransaction);
			expect(pixService.createDeposit).toHaveBeenCalledWith(
				'user-123',
				depositDto,
			);
		});

		it('should handle user ID from different JWT format', async () => {
			const depositDto = {
				amount: 50.0,
				pixKey: 'test@example.com',
			};

			const mockRequest = { user: { id: 'user-456' } };
			pixService.createDeposit.mockResolvedValue(mockTransaction);

			await controller.createDeposit(mockRequest, depositDto);

			expect(pixService.createDeposit).toHaveBeenCalledWith(
				'user-456',
				depositDto,
			);
		});
	});

	describe('createWithdraw', () => {
		it('should create withdrawal successfully', async () => {
			const withdrawDto = {
				amount: 50.0,
				pixKey: 'user@example.com',
				description: 'Test withdrawal',
			};

			const mockRequest = { user: mockUser };
			const withdrawTransaction = {
				...mockTransaction,
				type: TransactionType.WITHDRAW,
				amount: 50.0,
			};
			pixService.createWithdraw.mockResolvedValue(withdrawTransaction);

			const result = await controller.createWithdraw(mockRequest, withdrawDto);

			expect(result).toEqual(withdrawTransaction);
			expect(pixService.createWithdraw).toHaveBeenCalledWith(
				'user-123',
				withdrawDto,
			);
		});
	});

	describe('createTransfer', () => {
		it('should create transfer successfully', async () => {
			const transferDto = {
				amount: 25.0,
				fromPixKey: 'sender@example.com',
				toPixKey: 'receiver@example.com',
				description: 'Test transfer',
			};

			const mockRequest = { user: mockUser };
			const transferTransaction = {
				...mockTransaction,
				type: TransactionType.TRANSFER,
				amount: 25.0,
			};
			pixService.createTransfer.mockResolvedValue(transferTransaction);

			const result = await controller.createTransfer(mockRequest, transferDto);

			expect(result).toEqual(transferTransaction);
			expect(pixService.createTransfer).toHaveBeenCalledWith(
				'user-123',
				transferDto,
			);
		});
	});

	describe('getTransactions', () => {
		it('should get user transactions', async () => {
			const filters = {
				status: TransactionStatus.COMPLETED,
				type: TransactionType.DEPOSIT,
				skip: 0,
				take: 10,
			};

			const mockRequest = { user: mockUser };
			const mockResponse = {
				transactions: [mockTransaction],
				total: 1,
				skip: 0,
				take: 10,
			};

			pixService.getUserTransactions.mockResolvedValue(mockResponse);

			const result = await controller.getTransactions(mockRequest, filters);

			expect(result).toEqual(mockResponse);
			expect(pixService.getUserTransactions).toHaveBeenCalledWith(
				'user-123',
				filters,
			);
		});

		it('should get transactions without filters', async () => {
			const mockRequest = { user: mockUser };
			const mockResponse = {
				transactions: [],
				total: 0,
				skip: 0,
				take: 50,
			};

			pixService.getUserTransactions.mockResolvedValue(mockResponse);

			const result = await controller.getTransactions(mockRequest, {});

			expect(result).toEqual(mockResponse);
			expect(pixService.getUserTransactions).toHaveBeenCalledWith(
				'user-123',
				{},
			);
		});
	});

	describe('getTransaction', () => {
		it('should get transaction by ID', async () => {
			const mockRequest = { user: mockUser };
			pixService.getTransactionStatus.mockResolvedValue(mockTransaction);

			const result = await controller.getTransaction(mockRequest, 'trans-123');

			expect(result).toEqual(mockTransaction);
			expect(pixService.getTransactionStatus).toHaveBeenCalledWith(
				'user-123',
				'trans-123',
			);
		});
	});

	describe('getTransactionStatus', () => {
		it('should get transaction status', async () => {
			const mockRequest = { user: mockUser };
			const completedTransaction = {
				...mockTransaction,
				status: TransactionStatus.COMPLETED,
			};
			pixService.getTransactionStatus.mockResolvedValue(completedTransaction);

			const result = await controller.getTransactionStatus(
				mockRequest,
				'trans-123',
			);

			expect(result).toEqual(completedTransaction);
			expect(pixService.getTransactionStatus).toHaveBeenCalledWith(
				'user-123',
				'trans-123',
			);
		});
	});

	describe('generateQRCode', () => {
		it('should generate QR code', async () => {
			const qrData = {
				amount: 50.0,
				description: 'Payment QR',
				expirationMinutes: 30,
			};

			const mockRequest = { user: mockUser };
			const mockQRResponse = {
				qrCode: 'data:image/png;base64,mockQRCode',
				pixKey: 'generated-pix-key',
				amount: 50.0,
				expiresAt: new Date(Date.now() + 30 * 60 * 1000),
			};

			pixService.generatePixQRCode.mockResolvedValue(mockQRResponse);

			const result = await controller.generateQRCode(mockRequest, qrData);

			expect(result).toEqual(mockQRResponse);
			expect(pixService.generatePixQRCode).toHaveBeenCalledWith(
				'user-123',
				qrData,
			);
		});

		it('should generate QR code without expiration', async () => {
			const qrData = {
				amount: 100.0,
				description: 'No expiration QR',
			};

			const mockRequest = { user: mockUser };
			const mockQRResponse = {
				qrCode: 'data:image/png;base64,mockQRCode',
				pixKey: 'generated-pix-key',
				amount: 100.0,
				expiresAt: null,
			};

			pixService.generatePixQRCode.mockResolvedValue(mockQRResponse);

			const result = await controller.generateQRCode(mockRequest, qrData);

			expect(result).toEqual(mockQRResponse);
			expect(pixService.generatePixQRCode).toHaveBeenCalledWith(
				'user-123',
				qrData,
			);
		});
	});

	describe('validatePixKey', () => {
		it('should validate PIX key', async () => {
			const pixKey = 'user@example.com';
			const mockValidation = {
				valid: true,
				type: 'EMAIL',
			};

			pixService.validatePixKey.mockResolvedValue(mockValidation);

			const result = await controller.validatePixKey(pixKey);

			expect(result).toEqual(mockValidation);
			expect(pixService.validatePixKey).toHaveBeenCalledWith(pixKey);
		});

		it('should return invalid for bad PIX key', async () => {
			const pixKey = 'invalid-key';
			const mockValidation = {
				valid: false,
				error: 'Invalid PIX key format',
			};

			pixService.validatePixKey.mockResolvedValue(mockValidation);

			const result = await controller.validatePixKey(pixKey);

			expect(result).toEqual(mockValidation);
			expect(pixService.validatePixKey).toHaveBeenCalledWith(pixKey);
		});
	});

	describe('getBalance', () => {
		it('should get user balance', async () => {
			const mockRequest = { user: mockUser };
			const mockBalance = {
				balance: 1000.0,
				currency: 'BRL',
			};

			pixService.getBalance.mockResolvedValue(mockBalance);

			const result = await controller.getBalance(mockRequest);

			expect(result).toEqual(mockBalance);
			expect(pixService.getBalance).toHaveBeenCalledWith('user-123');
		});
	});
});
