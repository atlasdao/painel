import { EulenRateLimitError, RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService', () => {
	let service: RateLimiterService;
	let randomSpy: jest.SpyInstance;

	beforeEach(() => {
		service = new RateLimiterService();
		randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
	});

	afterEach(() => {
		randomSpy.mockRestore();
	});

	it('opens an endpoint circuit after an Eulen rate-limit response', async () => {
		await expect(
			service.executeWithRateLimit('withdraw-status', async () => {
				throw new EulenRateLimitError(
					'withdraw-status',
					60_000,
					'Too many requests. Please wait 60 more seconds before retrying',
				);
			}),
		).rejects.toMatchObject({
			isEulenRateLimitError: true,
			endpoint: 'withdraw-status',
			retryAfterMs: 60_000,
		});

		await expect(
			service.executeWithRateLimit('withdraw-status', async () => 'ok'),
		).rejects.toMatchObject({
			isEulenRateLimitError: true,
			endpoint: 'withdraw-status',
		});
	});
});
