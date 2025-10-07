import { HttpStatus } from '@nestjs/common';

/**
 * Standard API Response format
 */
export interface ApiResponse<T = any> {
	success: boolean;
	message: string;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: any;
	};
	timestamp: string;
	path?: string;
	method?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

/**
 * Paginated response format
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
	meta: PaginationMeta;
}

/**
 * Global response utility for consistent API responses
 */
export class ResponseUtil {
	/**
	 * Create success response
	 */
	static success<T>(data?: T, message: string = 'Operação realizada com sucesso'): ApiResponse<T> {
		return {
			success: true,
			message,
			data,
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create error response
	 */
	static error(
		code: string,
		message: string,
		details?: any,
		httpStatus: HttpStatus = HttpStatus.BAD_REQUEST
	): ApiResponse {
		return {
			success: false,
			message,
			error: {
				code,
				message,
				details,
			},
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create paginated response
	 */
	static paginated<T>(
		data: T[],
		page: number,
		limit: number,
		total: number,
		message: string = 'Dados carregados com sucesso'
	): PaginatedResponse<T> {
		const totalPages = Math.ceil(total / limit);
		const hasNext = page < totalPages;
		const hasPrev = page > 1;

		return {
			success: true,
			message,
			data,
			meta: {
				page,
				limit,
				total,
				totalPages,
				hasNext,
				hasPrev,
			},
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create validation error response
	 */
	static validationError(errors: any[]): ApiResponse {
		return {
			success: false,
			message: 'Dados inválidos fornecidos',
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Dados inválidos fornecidos',
				details: errors,
			},
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create unauthorized error response
	 */
	static unauthorized(message: string = 'Acesso não autorizado'): ApiResponse {
		return {
			success: false,
			message,
			error: {
				code: 'UNAUTHORIZED',
				message,
			},
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create forbidden error response
	 */
	static forbidden(message: string = 'Acesso negado'): ApiResponse {
		return {
			success: false,
			message,
			error: {
				code: 'FORBIDDEN',
				message,
			},
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create not found error response
	 */
	static notFound(resource: string = 'Recurso'): ApiResponse {
		const message = `${resource} não encontrado`;
		return {
			success: false,
			message,
			error: {
				code: 'NOT_FOUND',
				message,
			},
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create conflict error response
	 */
	static conflict(message: string = 'Conflito de dados'): ApiResponse {
		return {
			success: false,
			message,
			error: {
				code: 'CONFLICT',
				message,
			},
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create rate limit error response
	 */
	static rateLimit(retryAfter?: number): ApiResponse {
		return {
			success: false,
			message: 'Muitas tentativas. Tente novamente mais tarde',
			error: {
				code: 'RATE_LIMIT_EXCEEDED',
				message: 'Muitas tentativas. Tente novamente mais tarde',
				details: retryAfter ? { retryAfter } : undefined,
			},
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create server error response
	 */
	static serverError(message: string = 'Erro interno do servidor'): ApiResponse {
		return {
			success: false,
			message,
			error: {
				code: 'INTERNAL_SERVER_ERROR',
				message,
			},
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create created response
	 */
	static created<T>(data: T, message: string = 'Recurso criado com sucesso'): ApiResponse<T> {
		return {
			success: true,
			message,
			data,
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create no content response
	 */
	static noContent(message: string = 'Operação realizada com sucesso'): ApiResponse {
		return {
			success: true,
			message,
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Create accepted response (for async operations)
	 */
	static accepted<T>(data?: T, message: string = 'Operação aceita e será processada'): ApiResponse<T> {
		return {
			success: true,
			message,
			data,
			timestamp: new Date().toISOString(),
		};
	}
}

/**
 * Common error codes used throughout the application
 */
export const ErrorCodes = {
	// Authentication & Authorization
	INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
	TOKEN_EXPIRED: 'TOKEN_EXPIRED',
	TOKEN_INVALID: 'TOKEN_INVALID',
	INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
	ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
	ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',

	// User Management
	USER_NOT_FOUND: 'USER_NOT_FOUND',
	USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
	EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
	INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
	WEAK_PASSWORD: 'WEAK_PASSWORD',

	// Business Logic
	INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
	INVALID_AMOUNT: 'INVALID_AMOUNT',
	TRANSACTION_FAILED: 'TRANSACTION_FAILED',
	LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
	INVALID_PIX_KEY: 'INVALID_PIX_KEY',
	ACCOUNT_NOT_VALIDATED: 'ACCOUNT_NOT_VALIDATED',

	// System
	EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
	DATABASE_ERROR: 'DATABASE_ERROR',
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
	FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',

	// API
	INVALID_REQUEST_FORMAT: 'INVALID_REQUEST_FORMAT',
	MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
	INVALID_FIELD_VALUE: 'INVALID_FIELD_VALUE',
	RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
	OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
} as const;

/**
 * Success message templates in Portuguese
 */
export const SuccessMessages = {
	// Authentication
	LOGIN_SUCCESS: 'Login realizado com sucesso',
	LOGOUT_SUCCESS: 'Logout realizado com sucesso',
	PASSWORD_RESET_SENT: 'Email de redefinição de senha enviado',
	PASSWORD_CHANGED: 'Senha alterada com sucesso',

	// User Management
	USER_CREATED: 'Usuário criado com sucesso',
	USER_UPDATED: 'Usuário atualizado com sucesso',
	USER_DELETED: 'Usuário removido com sucesso',
	PROFILE_UPDATED: 'Perfil atualizado com sucesso',

	// Transactions
	TRANSACTION_CREATED: 'Transação criada com sucesso',
	PAYMENT_PROCESSED: 'Pagamento processado com sucesso',
	WITHDRAWAL_REQUESTED: 'Solicitação de saque enviada',
	PIX_GENERATED: 'PIX gerado com sucesso',

	// General
	OPERATION_SUCCESS: 'Operação realizada com sucesso',
	DATA_SAVED: 'Dados salvos com sucesso',
	DATA_UPDATED: 'Dados atualizados com sucesso',
	DATA_DELETED: 'Dados removidos com sucesso',
} as const;