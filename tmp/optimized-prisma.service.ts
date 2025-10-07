import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(PrismaService.name);
	private retryCount = 0;
	private readonly maxRetries = 3;

	constructor(private configService: ConfigService) {
		const isDevelopment = configService.get<string>('NODE_ENV') === 'development';

		super({
			datasources: {
				db: {
					url: configService.get<string>('DATABASE_URL'),
				},
			},
			log: isDevelopment
				? [
					{ level: 'query', emit: 'event' },
					{ level: 'info', emit: 'event' },
					{ level: 'warn', emit: 'event' },
					{ level: 'error', emit: 'event' },
				]
				: [
					{ level: 'warn', emit: 'event' },
					{ level: 'error', emit: 'event' },
				],
			// Connection pool configuration for optimal performance
			datasourceUrl: configService.get<string>('DATABASE_URL'),
		});

		// Set up logging if in development
		if (isDevelopment) {
			this.$on('query' as never, (e: any) => {
				if (e.duration > 100) { // Log slow queries over 100ms
					this.logger.warn(`Slow Query (${e.duration}ms): ${e.query}`);
				}
			});
		}

		// Always log errors
		this.$on('error' as never, (e: any) => {
			this.logger.error('Database Error:', e);
		});
	}

	async onModuleInit() {
		// Implement retry logic for connection
		await this.connectWithRetry();

		// Apply runtime optimizations
		await this.applyRuntimeOptimizations();
	}

	async onModuleDestroy() {
		await this.$disconnect();
		this.logger.log('Database connection closed');
	}

	private async connectWithRetry(): Promise<void> {
		try {
			await this.$connect();
			this.logger.log('Database connected successfully');
			this.retryCount = 0;
		} catch (error) {
			this.retryCount++;
			this.logger.error(`Database connection failed (attempt ${this.retryCount}/${this.maxRetries}):`, error);

			if (this.retryCount >= this.maxRetries) {
				throw new Error('Failed to connect to database after maximum retries');
			}

			// Wait before retrying (exponential backoff)
			const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000);
			await new Promise(resolve => setTimeout(resolve, delay));

			return this.connectWithRetry();
		}
	}

	private async applyRuntimeOptimizations() {
		try {
			// Set statement timeout for queries (30 seconds)
			await this.$executeRaw`SET statement_timeout = '30s'`;

			// Set lock timeout (5 seconds)
			await this.$executeRaw`SET lock_timeout = '5s'`;

			// Enable query parallelization
			await this.$executeRaw`SET max_parallel_workers_per_gather = 2`;

			// Optimize for OLTP workloads
			await this.$executeRaw`SET random_page_cost = 1.1`;

			this.logger.log('Runtime optimizations applied');
		} catch (error) {
			this.logger.warn('Failed to apply some runtime optimizations:', error);
		}
	}

	// Helper method for transactions with retry logic
	async executeTransaction<T>(
		fn: (prisma: PrismaClient) => Promise<T>,
		maxRetries = 3,
	): Promise<T> {
		let retries = 0;

		while (retries < maxRetries) {
			try {
				return await this.$transaction(fn, {
					maxWait: 5000, // Maximum time to wait for a transaction slot (5s)
					timeout: 15000, // Maximum time for the transaction to complete (15s)
					isolationLevel: 'ReadCommitted', // Use appropriate isolation level
				});
			} catch (error: any) {
				retries++;

				// Check if it's a deadlock or serialization error
				if (
					(error.code === 'P2034' || // Deadlock
					error.code === 'P2024' || // Transaction conflict
					error.message?.includes('deadlock')) &&
					retries < maxRetries
				) {
					this.logger.warn(`Transaction retry ${retries}/${maxRetries} due to: ${error.message}`);
					// Exponential backoff
					await new Promise(resolve => setTimeout(resolve, Math.min(100 * Math.pow(2, retries), 1000)));
					continue;
				}

				throw error;
			}
		}

		throw new Error('Transaction failed after maximum retries');
	}

	// Optimized batch operations
	async batchCreate<T>(
		model: any,
		data: any[],
		batchSize = 100,
	): Promise<number> {
		let created = 0;

		for (let i = 0; i < data.length; i += batchSize) {
			const batch = data.slice(i, i + batchSize);
			const result = await model.createMany({
				data: batch,
				skipDuplicates: true,
			});
			created += result.count;
		}

		return created;
	}

	// Health check method
	async isHealthy(): Promise<boolean> {
		try {
			await this.$queryRaw`SELECT 1`;
			return true;
		} catch {
			return false;
		}
	}

	// Get connection pool statistics
	async getPoolStats(): Promise<any> {
		try {
			const stats = await this.$queryRaw`
				SELECT
					count(*) as total_connections,
					count(*) filter (where state = 'active') as active_connections,
					count(*) filter (where state = 'idle') as idle_connections,
					count(*) filter (where state = 'idle in transaction') as idle_in_transaction,
					max(age(clock_timestamp(), query_start)) as longest_query_duration
				FROM pg_stat_activity
				WHERE datname = current_database()
					AND pid != pg_backend_pid()
			`;
			return stats[0];
		} catch (error) {
			this.logger.error('Failed to get pool stats:', error);
			return null;
		}
	}

	// Clean up old data (for maintenance)
	async cleanupOldData(daysToKeep = 90): Promise<void> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

		try {
			// Clean old audit logs
			const auditResult = await this.auditLog.deleteMany({
				where: {
					createdAt: {
						lt: cutoffDate,
					},
				},
			});
			this.logger.log(`Cleaned ${auditResult.count} old audit logs`);

			// Clean old expired transactions
			const txResult = await this.transaction.deleteMany({
				where: {
					status: 'EXPIRED',
					createdAt: {
						lt: cutoffDate,
					},
				},
			});
			this.logger.log(`Cleaned ${txResult.count} old expired transactions`);

			// Clean old rate limit entries
			const rateLimitResult = await this.rateLimit.deleteMany({
				where: {
					resetAt: {
						lt: new Date(),
					},
				},
			});
			this.logger.log(`Cleaned ${rateLimitResult.count} old rate limit entries`);

		} catch (error) {
			this.logger.error('Error during cleanup:', error);
			throw error;
		}
	}

	async cleanDatabase() {
		if (this.configService.get('NODE_ENV') === 'production') {
			throw new Error('cleanDatabase is not allowed in production');
		}

		const models = Reflect.ownKeys(this).filter(
			(key) => key[0] !== '_' && key[0] !== '$' && key !== 'constructor',
		);

		return Promise.all(
			models.map((modelKey) => {
				const model = this[modelKey as string];
				if (model && typeof model.deleteMany === 'function') {
					return model.deleteMany();
				}
				return null;
			}),
		);
	}
}