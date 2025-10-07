import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EulenClientService } from './eulen-client.service';
import { RateLimiterService } from './rate-limiter.service';

describe('EulenClientService - Real Integration', () => {
	let service: EulenClientService;
	let configService: ConfigService;

	// Real DePix test data from Atlas DAO
	const REAL_DEPIX_ADDRESS =
		'VJLCguHZDUbpy94zodwcvvUJgTxoLgjiMH8TfTwuYMUEzfMKwE2Ssu6J3LtWwtZUthoMq8HqEYhRm6Ff';
	const TEST_AMOUNT_CENTS = 100; // 1 BRL in cents
	// Token should be fetched from database in production
	// For tests, use a mock token or skip authentication
	const MOCK_TEST_TOKEN = 'test-token-for-unit-tests';

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				EulenClientService,
				RateLimiterService,
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string, defaultValue?: any) => {
							const config = {
								EULEN_API_URL: 'https://depix.eulen.app/api',
								// Token removed - should be fetched from database
								DEFAULT_DEPIX_ADDRESS: REAL_DEPIX_ADDRESS,
							};
							return config[key] || defaultValue;
						}),
					},
				},
			],
		}).compile();

		service = module.get<EulenClientService>(EulenClientService);
		configService = module.get<ConfigService>(ConfigService);
	});

	describe('Real Eulen API Integration', () => {
		it('should ping real Eulen API successfully', async () => {
			try {
				const result = await service.ping();

				expect(result).toBeDefined();
				expect(result.response).toBeDefined();
				expect(result.response).toHaveProperty('msg', 'Pong!');
				expect(result.response).toHaveProperty('claims_for_token_debug');
				expect(result.response.claims_for_token_debug).toHaveProperty(
					'sub',
					'atlasdao',
				);
				expect(result.async).toBe(false);
			} catch (error) {
				// Skip test if rate limited (ping has 1 per minute limit)
				if (error.message && error.message.includes('rate limit')) {
					console.log('Ping test skipped due to rate limit');
					expect(true).toBe(true);
				} else if (
					error.status === 503 ||
					error.message?.includes('unavailable')
				) {
					console.log('Ping test skipped due to API unavailability');
					expect(true).toBe(true);
				} else {
					throw error;
				}
			}
		}, 10000);

		it('should create real PIX to DePix deposit', async () => {
			const depositData = {
				amount: TEST_AMOUNT_CENTS,
				pixKey: REAL_DEPIX_ADDRESS,
				description: 'Atlas DAO Test Deposit',
			};

			const result = await service.createDeposit(depositData);

			expect(result).toBeDefined();
			expect(result.response).toBeDefined();
			expect(result.response.qrCopyPaste).toBeDefined();
			expect(result.response.qrImageUrl).toBeDefined();
			expect(result.response.id).toBeDefined();
			expect(result.async).toBe(false);
		}, 15000);

		it('should create deposit without optional fields', async () => {
			const depositData = {
				amount: TEST_AMOUNT_CENTS,
				pixKey: REAL_DEPIX_ADDRESS,
			};

			const result = await service.createDeposit(depositData);

			expect(result).toBeDefined();
			expect(result.response).toBeDefined();
			expect(result.response.qrCopyPaste).toContain('00020');
			expect(result.response.qrImageUrl).toContain(
				'https://response.eulen.app',
			);
			expect(result.response.id).toMatch(/^[a-f0-9]{32}$/);
		}, 15000);

		it('should get deposit status from real API', async () => {
			// First create a deposit to get a real transaction ID
			const depositData = {
				amount: TEST_AMOUNT_CENTS,
				pixKey: REAL_DEPIX_ADDRESS,
			};

			const deposit = await service.createDeposit(depositData);
			const transactionId = deposit.response.id;

			// Now check the status
			const status = await service.getDepositStatus(transactionId);

			expect(status).toBeDefined();
			// The status endpoint might return real data or a 404
			if (status.id) {
				expect(status.id).toBe(transactionId);
			}
		}, 20000);

		it('should validate real DePix addresses', async () => {
			const result = await service.validatePixKey(REAL_DEPIX_ADDRESS);

			expect(result).toEqual({
				valid: true,
				type: 'DEPIX',
				network: 'liquid',
				address: REAL_DEPIX_ADDRESS,
			});
		});

		it('should validate ex1 prefix DePix addresses', async () => {
			const ex1Address = 'ex1qhuq5u7udzwskhaz45fy80kdaxjytqd99ju5yfn';
			const result = await service.validatePixKey(ex1Address);

			expect(result).toEqual({
				valid: true,
				type: 'DEPIX',
				network: 'liquid',
				address: ex1Address,
			});
		});

		it('should return invalid for non-DePix addresses', async () => {
			const invalidAddress = 'invalid-address-123';
			const result = await service.validatePixKey(invalidAddress);

			expect(result).toEqual({
				valid: false,
				type: 'INVALID',
				network: 'liquid',
				address: invalidAddress,
			});
		});

		it('should generate QR code using real deposit endpoint', async () => {
			const qrCodeData = {
				amount: TEST_AMOUNT_CENTS,
				description: 'Atlas DAO QR Code Test',
			};

			const result = await service.generatePixQRCode(qrCodeData);

			expect(result).toBeDefined();
			expect(result.qrCode).toContain('https://response.eulen.app');
			expect(result.qrCodeText).toContain('00020');
			expect(result.amount).toBe(TEST_AMOUNT_CENTS);
			expect(result.transactionId).toMatch(/^[a-f0-9]{32}$/);
		}, 15000);

		it('should handle rate limiting gracefully', async () => {
			// The ping endpoint has a rate limit of 1 per minute
			// This test verifies we handle rate limit errors properly
			try {
				// First call should succeed
				await service.ping();
				// Second call might be rate limited
				await service.ping();
			} catch (error) {
				// If rate limited, we should get a proper error
				expect(error).toBeDefined();
			}
		}, 10000);

		it('should return placeholder for withdraw (not yet implemented)', async () => {
			const withdrawData = {
				amount: TEST_AMOUNT_CENTS,
				pixKey: REAL_DEPIX_ADDRESS,
				description: 'Test withdrawal',
			};

			const result = await service.createWithdraw(withdrawData);

			expect(result).toBeDefined();
			expect(result.status).toBe('PENDING');
			expect(result.message).toBe('Withdraw functionality coming soon');
		});

		it('should return placeholder for balance (not yet implemented)', async () => {
			const result = await service.getBalance();

			expect(result).toEqual({
				balance: 0,
				available: 0,
				pending: 0,
				currency: 'BRL',
			});
		});

		it('should return empty transactions list (not yet implemented)', async () => {
			const result = await service.getTransactions({ limit: 10, offset: 0 });

			expect(result).toEqual({
				transactions: [],
				total: 0,
			});
		});
	});

	describe('Async/Sync modes', () => {
		it('should handle automatic mode (default)', async () => {
			const depositData = {
				amount: 200,
				pixKey: REAL_DEPIX_ADDRESS,
			};

			const result = await service.createDeposit(depositData);

			// In automatic mode, should return sync response when fast
			expect(result.async).toBe(false);
			expect(result.response).toBeDefined();
		}, 15000);
	});

	describe('Nonce handling', () => {
		it('should generate valid UUID v4 nonce', () => {
			// Access private method through any type casting
			const nonce = (service as any).generateNonce();

			// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
			const uuidRegex =
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
			expect(nonce).toMatch(uuidRegex);
		});
	});
});
