import { Logger } from '@nestjs/common';

/**
 * Environment validation utility
 * Ensures all required environment variables are set for production
 */
export class EnvironmentUtil {
	private static logger = new Logger('EnvironmentUtil');

	/**
	 * Required environment variables for production
	 */
	private static readonly REQUIRED_PRODUCTION_VARS = [
		'NODE_ENV',
		'PORT',
		'DATABASE_URL',
		'JWT_SECRET',
		'ENCRYPTION_KEY',
		'SESSION_SECRET',
		'ADMIN_EMAIL',
		'ADMIN_PASSWORD',
	];

	/**
	 * Optional environment variables with their default values
	 */
	private static readonly OPTIONAL_VARS: Record<string, string> = {
		PORT: '19997',
		LOG_LEVEL: 'info',
		RATE_LIMIT_GLOBAL_MAX: '100',
		RATE_LIMIT_AUTH_MAX: '5',
		BCRYPT_SALT_ROUNDS: '12',
	};

	/**
	 * Sensitive environment variables that should not be logged
	 */
	private static readonly SENSITIVE_VARS = [
		'DATABASE_URL',
		'JWT_SECRET',
		'ENCRYPTION_KEY',
		'SESSION_SECRET',
		'ADMIN_PASSWORD',
		'API_KEY',
		'SECRET',
		'PASSWORD',
		'TOKEN',
	];

	/**
	 * Validate all required environment variables
	 */
	static validateEnvironment(): void {
		const isProduction = process.env.NODE_ENV === 'production';
		const missing: string[] = [];
		const warnings: string[] = [];

		// Check required variables for production
		if (isProduction) {
			for (const variable of this.REQUIRED_PRODUCTION_VARS) {
				if (!process.env[variable]) {
					missing.push(variable);
				}
			}

			if (missing.length > 0) {
				throw new Error(
					`Missing required environment variables for production: ${missing.join(', ')}`
				);
			}
		}

		// Validate specific variables
		this.validateSpecificVariables(warnings);

		// Log warnings
		if (warnings.length > 0) {
			this.logger.warn('Environment validation warnings:');
			warnings.forEach(warning => this.logger.warn(`  - ${warning}`));
		}

		// Log successful validation
		this.logger.log(`Environment validation completed for ${process.env.NODE_ENV || 'development'} mode`);
	}

	/**
	 * Validate specific environment variables
	 */
	private static validateSpecificVariables(warnings: string[]): void {
		// Validate JWT_SECRET strength
		if (process.env.JWT_SECRET) {
			if (process.env.JWT_SECRET.length < 32) {
				warnings.push('JWT_SECRET should be at least 32 characters long');
			}
		}

		// Validate ENCRYPTION_KEY strength
		if (process.env.ENCRYPTION_KEY) {
			if (process.env.ENCRYPTION_KEY.length < 32) {
				warnings.push('ENCRYPTION_KEY should be at least 32 characters long');
			}
		}

		// Validate SESSION_SECRET strength
		if (process.env.SESSION_SECRET) {
			if (process.env.SESSION_SECRET.length < 32) {
				warnings.push('SESSION_SECRET should be at least 32 characters long');
			}
		}

		// Validate DATABASE_URL format
		if (process.env.DATABASE_URL) {
			if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
				warnings.push('DATABASE_URL should use PostgreSQL format');
			}
		}

		// Validate PORT
		if (process.env.PORT) {
			const port = parseInt(process.env.PORT, 10);
			if (isNaN(port) || port < 1 || port > 65535) {
				warnings.push('PORT should be a valid port number (1-65535)');
			}
		}

		// Validate email format
		if (process.env.ADMIN_EMAIL) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(process.env.ADMIN_EMAIL)) {
				warnings.push('ADMIN_EMAIL should be a valid email address');
			}
		}
	}

	/**
	 * Get environment variable with fallback
	 */
	static get(key: string, defaultValue?: string): string {
		const value = process.env[key];

		if (value === undefined) {
			if (defaultValue !== undefined) {
				return defaultValue;
			}

			// Check if it's an optional variable with default
			if (this.OPTIONAL_VARS[key]) {
				return this.OPTIONAL_VARS[key];
			}

			throw new Error(`Environment variable ${key} is required but not set`);
		}

		return value;
	}

	/**
	 * Get environment variable as number
	 */
	static getNumber(key: string, defaultValue?: number): number {
		const value = this.get(key, defaultValue?.toString());
		const parsed = parseInt(value, 10);

		if (isNaN(parsed)) {
			throw new Error(`Environment variable ${key} should be a valid number`);
		}

		return parsed;
	}

	/**
	 * Get environment variable as boolean
	 */
	static getBoolean(key: string, defaultValue?: boolean): boolean {
		const value = this.get(key, defaultValue?.toString()).toLowerCase();
		return value === 'true' || value === '1' || value === 'yes';
	}

	/**
	 * Get environment variable as array (comma-separated)
	 */
	static getArray(key: string, defaultValue?: string[]): string[] {
		const value = this.get(key, defaultValue?.join(','));
		return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
	}

	/**
	 * Check if running in production
	 */
	static isProduction(): boolean {
		return process.env.NODE_ENV === 'production';
	}

	/**
	 * Check if running in development
	 */
	static isDevelopment(): boolean {
		return process.env.NODE_ENV === 'development';
	}

	/**
	 * Check if running in test
	 */
	static isTest(): boolean {
		return process.env.NODE_ENV === 'test';
	}

	/**
	 * Get sanitized environment info (for logging/debugging)
	 */
	static getSanitizedEnvironmentInfo(): Record<string, string> {
		const sanitized: Record<string, string> = {};

		for (const [key, value] of Object.entries(process.env)) {
			if (this.isSensitiveVariable(key)) {
				sanitized[key] = '[REDACTED]';
			} else {
				sanitized[key] = value || '';
			}
		}

		return sanitized;
	}

	/**
	 * Check if a variable is sensitive
	 */
	private static isSensitiveVariable(key: string): boolean {
		const upperKey = key.toUpperCase();
		return this.SENSITIVE_VARS.some(sensitive =>
			upperKey.includes(sensitive.toUpperCase())
		);
	}

	/**
	 * Generate secure environment variables for development
	 */
	static generateSecureDefaults(): Record<string, string> {
		const crypto = require('crypto');

		return {
			JWT_SECRET: crypto.randomBytes(64).toString('hex'),
			ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
			SESSION_SECRET: crypto.randomBytes(64).toString('hex'),
		};
	}

	/**
	 * Validate CORS origins
	 */
	static validateCorsOrigins(): string[] {
		const origins = this.getArray('ALLOWED_ORIGINS', ['http://localhost:11337']);

		// Validate each origin
		for (const origin of origins) {
			try {
				new URL(origin);
			} catch (error) {
				throw new Error(`Invalid CORS origin: ${origin}`);
			}
		}

		return origins;
	}

	/**
	 * Get database configuration
	 */
	static getDatabaseConfig(): {
		url: string;
		ssl: boolean;
		poolSize: number;
	} {
		return {
			url: this.get('DATABASE_URL'),
			ssl: this.isProduction(),
			poolSize: this.getNumber('DATABASE_POOL_SIZE', 10),
		};
	}

	/**
	 * Get Redis configuration (if using Redis)
	 */
	static getRedisConfig(): {
		host: string;
		port: number;
		password?: string;
		db: number;
	} {
		return {
			host: this.get('REDIS_HOST', 'localhost'),
			port: this.getNumber('REDIS_PORT', 6379),
			password: process.env.REDIS_PASSWORD,
			db: this.getNumber('REDIS_DB', 0),
		};
	}

	/**
	 * Validate and get email configuration
	 */
	static getEmailConfig(): {
		host: string;
		port: number;
		secure: boolean;
		user: string;
		password: string;
	} {
		return {
			host: this.get('SMTP_HOST', 'localhost'),
			port: this.getNumber('SMTP_PORT', 587),
			secure: this.getBoolean('SMTP_SECURE', false),
			user: this.get('SMTP_USER'),
			password: this.get('SMTP_PASSWORD'),
		};
	}
}