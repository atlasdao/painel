import {
	Injectable,
	CanActivate,
	ExecutionContext,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityConfig } from '../config/security.config';

interface RateLimitStore {
	[key: string]: {
		count: number;
		resetTime: number;
	};
}

@Injectable()
export class RateLimitGuard implements CanActivate {
	private static store: RateLimitStore = {};
	private cleanupInterval: NodeJS.Timeout;

	// Static method to clear rate limit for a specific user
	static clearUserRateLimit(userId: string): number {
		const prefix = `user:${userId}:`;
		const keysToDelete: string[] = [];

		for (const key in RateLimitGuard.store) {
			if (key.startsWith(prefix)) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach((key) => delete RateLimitGuard.store[key]);
		return keysToDelete.length;
	}

	// Static method to clear all rate limits (use with caution)
	static clearAllRateLimits(): number {
		const count = Object.keys(RateLimitGuard.store).length;
		RateLimitGuard.store = {};
		return count;
	}

	constructor(private reflector: Reflector) {
		// Clean up expired entries every minute
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 60000);
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const response = context.switchToHttp().getResponse();

		// Get rate limit config from decorator or use default
		const limitConfig =
			this.reflector.get<any>('rateLimit', context.getHandler()) ||
			this.getRateLimitConfig(request.path);

		const identifier = this.getIdentifier(request);
		const key = `${identifier}:${request.path}:${request.method}`;

		const now = Date.now();
		const limit = limitConfig.max;
		const windowMs = limitConfig.windowMs;

		// Initialize or get existing rate limit data
		if (!RateLimitGuard.store[key] || now > RateLimitGuard.store[key].resetTime) {
			RateLimitGuard.store[key] = {
				count: 0,
				resetTime: now + windowMs,
			};
		}

		const rateLimit = RateLimitGuard.store[key];
		rateLimit.count++;

		// Set rate limit headers
		const remaining = Math.max(0, limit - rateLimit.count);
		const resetTime = new Date(rateLimit.resetTime).toISOString();

		response.setHeader('X-RateLimit-Limit', limit);
		response.setHeader('X-RateLimit-Remaining', remaining);
		response.setHeader('X-RateLimit-Reset', resetTime);

		if (rateLimit.count > limit) {
			const retryAfter = Math.ceil((rateLimit.resetTime - now) / 1000);
			response.setHeader('Retry-After', retryAfter);

			throw new HttpException(
				{
					statusCode: HttpStatus.TOO_MANY_REQUESTS,
					message: 'Too many requests',
					error: 'Rate limit exceeded',
					retryAfter,
				},
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}

		return true;
	}

	private getIdentifier(request: any): string {
		// Priority: API key > User ID > IP address
		if (request.headers['x-api-key']) {
			return `api:${request.headers['x-api-key']}`;
		}

		if (request.user?.id) {
			return `user:${request.user.id}`;
		}

		return `ip:${this.getClientIp(request)}`;
	}

	private getClientIp(request: any): string {
		return (
			request.headers['x-forwarded-for']?.split(',')[0] ||
			request.headers['x-real-ip'] ||
			request.connection?.remoteAddress ||
			request.socket?.remoteAddress ||
			request.ip
		);
	}

	private getRateLimitConfig(path: string): any {
		// Match specific paths to their rate limit configs
		if (path.includes('/auth/login') || path.includes('/auth/register')) {
			return SecurityConfig.rateLimit.auth;
		}

		// Admin withdrawal endpoints should have more lenient limits
		if (path.includes('/withdrawals/admin')) {
			return SecurityConfig.rateLimit.api; // Use API limits for admin operations
		}

		if (path.includes('/withdrawals')) {
			return SecurityConfig.rateLimit.withdrawal;
		}

		if (path.includes('/api')) {
			return SecurityConfig.rateLimit.api;
		}

		return SecurityConfig.rateLimit.global;
	}

	private cleanup(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const key in RateLimitGuard.store) {
			if (RateLimitGuard.store[key].resetTime < now) {
				expiredKeys.push(key);
			}
		}

		expiredKeys.forEach((key) => delete RateLimitGuard.store[key]);
	}

	onModuleDestroy() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}
}

// Decorator for custom rate limits
export function RateLimit(max: number, windowMs: number) {
	return function (
		target: any,
		propertyKey: string,
		descriptor: PropertyDescriptor,
	) {
		Reflect.defineMetadata('rateLimit', { max, windowMs }, descriptor.value);
		return descriptor;
	};
}
