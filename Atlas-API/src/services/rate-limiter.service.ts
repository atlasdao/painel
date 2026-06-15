import { Injectable, Logger } from '@nestjs/common';

interface RateLimitConfig {
	endpoint: string;
	rateLimit: number; // requests per minute
	burstLimit: number; // max burst requests
	dailyLimit: number; // requests per day
}

interface RequestQueue {
	endpoint: string;
	lastRequestTime: number;
	requestCount: number;
	dailyCount: number;
	dailyResetTime: number;
	queue: Array<() => Promise<any>>;
}

interface CircuitState {
	openUntil: number;
	strikes: number;
	lastReason: string;
	lastOpenedAt: number;
}

export class EulenRateLimitError extends Error {
	readonly isEulenRateLimitError = true;

	constructor(
		readonly endpoint: string,
		readonly retryAfterMs: number,
		message = 'Eulen API rate limit reached',
	) {
		super(message);
		this.name = 'EulenRateLimitError';
	}
}

@Injectable()
export class RateLimiterService {
	private readonly logger = new Logger(RateLimiterService.name);
	private readonly limits: RateLimitConfig[] = [
		{
			endpoint: 'ping',
			rateLimit: 1,
			burstLimit: 1,
			dailyLimit: 1440,
		},
		{
			endpoint: 'deposit',
			rateLimit: 60, // Allow 60 requests per minute (1 per second) for payment links
			burstLimit: 100, // Allow burst of 100 requests for high traffic
			dailyLimit: 10000, // Increased daily limit for payment links
		},
		{
			endpoint: 'deposit-status',
			rateLimit: 60,
			burstLimit: 20,
			dailyLimit: 86400,
		},
		{
			endpoint: 'withdraw',
			rateLimit: 10,
			burstLimit: 10,
			dailyLimit: 5000,
		},
		{
			endpoint: 'withdraw-status',
			rateLimit: 1,
			burstLimit: 1,
			dailyLimit: 1440,
		},
	];

	private requestQueues: Map<string, RequestQueue> = new Map();
	private circuitBreakers: Map<string, CircuitState> = new Map();
	private readonly defaultProviderRetryMs = this.getPositiveNumberFromEnv(
		'EULEN_RATE_LIMIT_DEFAULT_RETRY_MS',
		60_000,
	);
	private readonly maxProviderRetryMs = this.getPositiveNumberFromEnv(
		'EULEN_RATE_LIMIT_MAX_RETRY_MS',
		15 * 60_000,
	);

	constructor() {
		// Initialize queues for each endpoint
		this.limits.forEach((limit) => {
			this.requestQueues.set(limit.endpoint, {
				endpoint: limit.endpoint,
				lastRequestTime: 0,
				requestCount: 0,
				dailyCount: 0,
				dailyResetTime: this.getNextDayReset(),
				queue: [],
			});
		});
	}

	private getNextDayReset(): number {
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(0, 0, 0, 0);
		return tomorrow.getTime();
	}

	async executeWithRateLimit<T>(
		endpoint: string,
		fn: () => Promise<T>,
	): Promise<T> {
		const limit = this.limits.find((l) => l.endpoint === endpoint);
		if (!limit) {
			// No rate limit defined, execute immediately
			return fn();
		}

		const queue = this.requestQueues.get(endpoint);
		if (!queue) {
			return fn();
		}

		this.assertCircuitClosed(endpoint);

		// Check daily limit reset
		const now = Date.now();
		if (now >= queue.dailyResetTime) {
			queue.dailyCount = 0;
			queue.dailyResetTime = this.getNextDayReset();
		}

		// Check if daily limit exceeded
		if (queue.dailyCount >= limit.dailyLimit) {
			throw new Error(
				`Daily rate limit exceeded for ${endpoint}. Limit: ${limit.dailyLimit}`,
			);
		}

		// Calculate minimum time between requests (in milliseconds)
		const minTimeBetweenRequests = 60000 / limit.rateLimit;
		const timeSinceLastRequest = now - queue.lastRequestTime;

		// If we need to wait, calculate delay
		let delay = 0;
		if (timeSinceLastRequest < minTimeBetweenRequests) {
			delay = minTimeBetweenRequests - timeSinceLastRequest;
		}

		// For burst limit control
		if (queue.requestCount >= limit.burstLimit) {
			// Reset count after rate limit period
			if (timeSinceLastRequest >= 60000) {
				queue.requestCount = 0;
			} else {
				// Need to wait for rate limit reset
				delay = Math.max(delay, 60000 - timeSinceLastRequest);
			}
		}

		// Wait if necessary
		if (delay > 0) {
			await this.sleep(delay);
		}

		// Execute the request
		queue.lastRequestTime = Date.now();
		queue.requestCount++;
		queue.dailyCount++;

		try {
			const result = await fn();
			this.closeCircuit(endpoint);
			return result;
		} catch (error) {
			// If request fails, don't count it against limits
			queue.requestCount--;
			queue.dailyCount--;
			if (this.isRateLimitError(error)) {
				const retryAfterMs = this.openCircuit(endpoint, error);
				throw new EulenRateLimitError(
					endpoint,
					retryAfterMs,
					`Eulen rate limit for ${endpoint}. Next retry after ${Math.ceil(retryAfterMs / 1000)}s.`,
				);
			}
			throw error;
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	getEndpointStatus(endpoint: string): {
		remaining: number;
		resetTime: number;
		dailyRemaining: number;
		circuitOpenUntil?: number;
	} | null {
		const limit = this.limits.find((l) => l.endpoint === endpoint);
		const queue = this.requestQueues.get(endpoint);

		if (!limit || !queue) {
			return null;
		}

		const now = Date.now();
		const timeSinceLastRequest = now - queue.lastRequestTime;
		let remaining = limit.burstLimit - queue.requestCount;

		// Reset count if rate limit period passed
		if (timeSinceLastRequest >= 60000) {
			remaining = limit.burstLimit;
		}

		return {
			remaining,
			resetTime: queue.lastRequestTime + 60000,
			dailyRemaining: limit.dailyLimit - queue.dailyCount,
			circuitOpenUntil: this.circuitBreakers.get(endpoint)?.openUntil,
		};
	}

	isRateLimitError(error: any): error is EulenRateLimitError {
		return Boolean(error?.isEulenRateLimitError);
	}

	private assertCircuitClosed(endpoint: string): void {
		const circuit = this.circuitBreakers.get(endpoint);
		if (!circuit) return;

		const now = Date.now();
		if (circuit.openUntil <= now) {
			this.circuitBreakers.delete(endpoint);
			return;
		}

		const retryAfterMs = circuit.openUntil - now;
		throw new EulenRateLimitError(
			endpoint,
			retryAfterMs,
			`Eulen circuit is open for ${endpoint}. Next retry after ${Math.ceil(retryAfterMs / 1000)}s.`,
		);
	}

	private openCircuit(endpoint: string, error: EulenRateLimitError): number {
		const now = Date.now();
		const previous = this.circuitBreakers.get(endpoint);
		const strikes = (previous?.strikes || 0) + 1;
		const providerRetryMs = Math.max(error.retryAfterMs || 0, this.defaultProviderRetryMs);
		const exponentialMs = Math.min(
			this.defaultProviderRetryMs * Math.pow(2, Math.max(0, strikes - 1)),
			this.maxProviderRetryMs,
		);
		const jitterMs = Math.floor(Math.random() * 2500);
		const retryAfterMs = Math.min(
			Math.max(providerRetryMs, exponentialMs) + jitterMs,
			this.maxProviderRetryMs,
		);

		this.circuitBreakers.set(endpoint, {
			openUntil: now + retryAfterMs,
			strikes,
			lastReason: error.message,
			lastOpenedAt: now,
		});

		this.logger.warn(
			`Eulen circuit opened for ${endpoint}: retry in ${Math.ceil(retryAfterMs / 1000)}s (strike ${strikes})`,
		);

		return retryAfterMs;
	}

	private closeCircuit(endpoint: string): void {
		if (this.circuitBreakers.delete(endpoint)) {
			this.logger.log(`Eulen circuit closed for ${endpoint}`);
		}
	}

	private getPositiveNumberFromEnv(key: string, fallback: number): number {
		const raw = process.env[key];
		const parsed = raw ? Number(raw) : NaN;
		return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
	}
}
