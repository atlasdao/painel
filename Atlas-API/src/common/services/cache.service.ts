import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
	value: T;
	expiresAt: number;
	hits: number;
}

interface CacheOptions {
	ttl?: number; // Time to live in seconds
	maxSize?: number; // Maximum cache size
}

@Injectable()
export class CacheService {
	private readonly logger = new Logger(CacheService.name);
	private cache = new Map<string, CacheEntry<any>>();
	private readonly defaultTTL = 300; // 5 minutes
	private readonly maxCacheSize = 1000;
	private cleanupInterval: NodeJS.Timeout;

	constructor() {
		// Run cleanup every minute
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 60000);
	}

	async get<T>(key: string): Promise<T | null> {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return null;
		}

		entry.hits++;
		return entry.value;
	}

	async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
		const ttl = (options?.ttl || this.defaultTTL) * 1000;
		const expiresAt = Date.now() + ttl;

		// Enforce max cache size using LRU
		if (this.cache.size >= (options?.maxSize || this.maxCacheSize)) {
			this.evictLRU();
		}

		this.cache.set(key, {
			value,
			expiresAt,
			hits: 0,
		});

		this.logger.debug(`Cached key: ${key}, TTL: ${ttl}ms`);
	}

	async delete(key: string): Promise<boolean> {
		return this.cache.delete(key);
	}

	async clear(): Promise<void> {
		this.cache.clear();
		this.logger.log('Cache cleared');
	}

	async has(key: string): Promise<boolean> {
		const entry = this.cache.get(key);
		if (!entry) return false;

		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	// Get or set pattern for efficient caching
	async getOrSet<T>(
		key: string,
		factory: () => Promise<T>,
		options?: CacheOptions,
	): Promise<T> {
		const cached = await this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		const value = await factory();
		await this.set(key, value, options);
		return value;
	}

	// Cache with tags for grouped invalidation
	private taggedCache = new Map<string, Set<string>>();

	async setWithTags<T>(
		key: string,
		value: T,
		tags: string[],
		options?: CacheOptions,
	): Promise<void> {
		await this.set(key, value, options);

		tags.forEach((tag) => {
			if (!this.taggedCache.has(tag)) {
				this.taggedCache.set(tag, new Set());
			}
			this.taggedCache.get(tag)!.add(key);
		});
	}

	async invalidateByTag(tag: string): Promise<void> {
		const keys = this.taggedCache.get(tag);
		if (keys) {
			keys.forEach((key) => this.delete(key));
			this.taggedCache.delete(tag);
		}
	}

	// Pattern-based invalidation
	async invalidatePattern(pattern: string): Promise<void> {
		const regex = new RegExp(pattern);
		const keysToDelete: string[] = [];

		this.cache.forEach((_, key) => {
			if (regex.test(key)) {
				keysToDelete.push(key);
			}
		});

		keysToDelete.forEach((key) => this.cache.delete(key));
		this.logger.debug(
			`Invalidated ${keysToDelete.length} keys matching pattern: ${pattern}`,
		);
	}

	// Cache statistics
	getStats() {
		const stats = {
			size: this.cache.size,
			maxSize: this.maxCacheSize,
			keys: [] as any[],
		};

		this.cache.forEach((entry, key) => {
			stats.keys.push({
				key,
				hits: entry.hits,
				expiresAt: new Date(entry.expiresAt).toISOString(),
			});
		});

		// Sort by hits (most used first)
		stats.keys.sort((a, b) => b.hits - a.hits);

		return stats;
	}

	// Warm up cache with predefined data
	async warmUp(data: Map<string, any>, options?: CacheOptions): Promise<void> {
		for (const [key, value] of data) {
			await this.set(key, value, options);
		}
		this.logger.log(`Cache warmed up with ${data.size} entries`);
	}

	private cleanup(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		this.cache.forEach((entry, key) => {
			if (now > entry.expiresAt) {
				expiredKeys.push(key);
			}
		});

		expiredKeys.forEach((key) => this.cache.delete(key));

		if (expiredKeys.length > 0) {
			this.logger.debug(
				`Cleaned up ${expiredKeys.length} expired cache entries`,
			);
		}
	}

	private evictLRU(): void {
		let lruKey: string | null = null;
		let minHits = Infinity;

		this.cache.forEach((entry, key) => {
			if (entry.hits < minHits) {
				minHits = entry.hits;
				lruKey = key;
			}
		});

		if (lruKey) {
			this.cache.delete(lruKey);
			this.logger.debug(`Evicted LRU cache entry: ${lruKey}`);
		}
	}

	onModuleDestroy() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}
}

// Cache key generators
export class CacheKeys {
	static user(id: string): string {
		return `user:${id}`;
	}

	static userByEmail(email: string): string {
		return `user:email:${email}`;
	}

	static transaction(id: string): string {
		return `transaction:${id}`;
	}

	static userTransactions(userId: string, page?: number): string {
		return page
			? `transactions:${userId}:page:${page}`
			: `transactions:${userId}`;
	}

	static apiKey(key: string): string {
		return `apikey:${key}`;
	}

	static settings(key: string): string {
		return `settings:${key}`;
	}

	static coupon(code: string): string {
		return `coupon:${code}`;
	}

	static stats(type: string): string {
		return `stats:${type}`;
	}
}
