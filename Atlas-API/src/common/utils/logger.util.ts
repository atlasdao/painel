import { Logger as NestLogger } from '@nestjs/common';

/**
 * Global logger utility that wraps NestJS Logger
 * Provides consistent logging across the application
 * Automatically excludes sensitive information from logs
 */
export class AppLogger {
	private static instance: AppLogger;
	private logger: NestLogger;

	private constructor(context?: string) {
		this.logger = new NestLogger(context || 'Application');
	}

	public static getInstance(context?: string): AppLogger {
		if (!AppLogger.instance) {
			AppLogger.instance = new AppLogger(context);
		}
		return AppLogger.instance;
	}

	public static getLogger(context: string): AppLogger {
		return new AppLogger(context);
	}

	/**
	 * Log info message
	 */
	info(message: string, data?: any): void {
		if (data) {
			this.logger.log(`${message} | ${this.sanitizeData(data)}`);
		} else {
			this.logger.log(message);
		}
	}

	/**
	 * Log warning message
	 */
	warn(message: string, data?: any): void {
		if (data) {
			this.logger.warn(`${message} | ${this.sanitizeData(data)}`);
		} else {
			this.logger.warn(message);
		}
	}

	/**
	 * Log error message
	 */
	error(message: string, error?: Error | any): void {
		if (error) {
			if (error instanceof Error) {
				this.logger.error(`${message} | ${error.message}`, error.stack);
			} else {
				this.logger.error(`${message} | ${this.sanitizeData(error)}`);
			}
		} else {
			this.logger.error(message);
		}
	}

	/**
	 * Log debug message (only in development)
	 */
	debug(message: string, data?: any): void {
		if (process.env.NODE_ENV === 'development') {
			if (data) {
				this.logger.debug(`${message} | ${this.sanitizeData(data)}`);
			} else {
				this.logger.debug(message);
			}
		}
	}

	/**
	 * Log verbose message (only in development)
	 */
	verbose(message: string, data?: any): void {
		if (process.env.NODE_ENV === 'development') {
			if (data) {
				this.logger.verbose(`${message} | ${this.sanitizeData(data)}`);
			} else {
				this.logger.verbose(message);
			}
		}
	}

	/**
	 * Sanitize data to remove sensitive information before logging
	 */
	private sanitizeData(data: any): string {
		try {
			const sanitized = this.deepSanitize(data);
			return JSON.stringify(sanitized, null, 2);
		} catch (error) {
			return '[Object - Could not serialize]';
		}
	}

	/**
	 * Deep sanitize object to remove sensitive fields
	 */
	private deepSanitize(obj: any): any {
		if (obj === null || obj === undefined) {
			return obj;
		}

		if (Array.isArray(obj)) {
			return obj.map(item => this.deepSanitize(item));
		}

		if (typeof obj === 'object') {
			const sanitized: any = {};
			for (const [key, value] of Object.entries(obj)) {
				const lowerKey = key.toLowerCase();

				// List of sensitive field names
				const sensitiveFields = [
					'password', 'token', 'secret', 'key', 'auth',
					'authorization', 'apikey', 'api_key', 'jwt',
					'bearer', 'credential', 'hash', 'salt'
				];

				const isSensitive = sensitiveFields.some(field =>
					lowerKey.includes(field)
				);

				if (isSensitive) {
					sanitized[key] = '[REDACTED]';
				} else {
					sanitized[key] = this.deepSanitize(value);
				}
			}
			return sanitized;
		}

		return obj;
	}

	/**
	 * Log performance metric
	 */
	performance(operation: string, startTime: number, data?: any): void {
		const duration = Date.now() - startTime;
		const message = `Performance | ${operation} completed in ${duration}ms`;

		if (data) {
			this.info(message, data);
		} else {
			this.info(message);
		}
	}

	/**
	 * Log audit event
	 */
	audit(event: string, userId?: string, data?: any): void {
		const auditData = {
			event,
			userId,
			timestamp: new Date().toISOString(),
			data: data ? this.deepSanitize(data) : undefined
		};

		this.logger.log(`AUDIT | ${JSON.stringify(auditData)}`);
	}

	/**
	 * Log security event
	 */
	security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: any): void {
		const securityData = {
			event,
			severity,
			timestamp: new Date().toISOString(),
			data: data ? this.deepSanitize(data) : undefined
		};

		if (severity === 'critical' || severity === 'high') {
			this.logger.error(`SECURITY | ${JSON.stringify(securityData)}`);
		} else {
			this.logger.warn(`SECURITY | ${JSON.stringify(securityData)}`);
		}
	}
}

// Convenience methods for quick access
export const logger = AppLogger.getInstance();

export const createLogger = (context: string) => AppLogger.getLogger(context);

/**
 * Replace console.log statements with this function during development
 * Will be removed in production builds
 */
export const devLog = (message: string, data?: any) => {
	if (process.env.NODE_ENV === 'development') {
		logger.debug(`DEV | ${message}`, data);
	}
};

/**
 * Performance timing utility
 */
export class PerformanceTimer {
	private startTime: number;
	private operation: string;
	private logger: AppLogger;

	constructor(operation: string, context?: string) {
		this.operation = operation;
		this.startTime = Date.now();
		this.logger = context ? createLogger(context) : logger;
	}

	end(data?: any): void {
		this.logger.performance(this.operation, this.startTime, data);
	}
}

/**
 * Decorator for automatic performance logging
 */
export function LogPerformance(operation?: string) {
	return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
		const method = descriptor.value;
		const operationName = operation || `${target.constructor.name}.${propertyName}`;

		descriptor.value = async function (...args: any[]) {
			const timer = new PerformanceTimer(operationName, target.constructor.name);
			try {
				const result = await method.apply(this, args);
				timer.end();
				return result;
			} catch (error) {
				timer.end({ error: error.message });
				throw error;
			}
		};

		return descriptor;
	};
}