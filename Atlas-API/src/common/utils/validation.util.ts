import { BadRequestException } from '@nestjs/common';
import { SecurityUtil } from './security.util';

/**
 * Global validation utility for common validation tasks
 */
export class ValidationUtil {
	/**
	 * Validate required fields
	 */
	static validateRequired(data: Record<string, any>, requiredFields: string[]): void {
		const missing: string[] = [];

		for (const field of requiredFields) {
			if (data[field] === undefined || data[field] === null || data[field] === '') {
				missing.push(field);
			}
		}

		if (missing.length > 0) {
			throw new BadRequestException({
				code: 'MISSING_REQUIRED_FIELDS',
				message: `Campos obrigatórios não fornecidos: ${missing.join(', ')}`,
				details: { missingFields: missing },
			});
		}
	}

	/**
	 * Validate email format
	 */
	static validateEmail(email: string): boolean {
		return SecurityUtil.isValidEmail(email);
	}

	/**
	 * Validate UUID format
	 */
	static validateUUID(uuid: string): boolean {
		return SecurityUtil.isValidUUID(uuid);
	}

	/**
	 * Validate CPF format
	 */
	static validateCPF(cpf: string): boolean {
		return SecurityUtil.isValidCPF(cpf);
	}

	/**
	 * Validate CNPJ format
	 */
	static validateCNPJ(cnpj: string): boolean {
		return SecurityUtil.isValidCNPJ(cnpj);
	}

	/**
	 * Validate amount (positive number with max 2 decimal places)
	 */
	static validateAmount(amount: number, min: number = 0.01, max: number = 1000000): void {
		if (typeof amount !== 'number' || isNaN(amount)) {
			throw new BadRequestException({
				code: 'INVALID_AMOUNT_FORMAT',
				message: 'Valor deve ser um número válido',
			});
		}

		if (amount < min) {
			throw new BadRequestException({
				code: 'AMOUNT_TOO_LOW',
				message: `Valor mínimo é R$ ${min.toFixed(2)}`,
			});
		}

		if (amount > max) {
			throw new BadRequestException({
				code: 'AMOUNT_TOO_HIGH',
				message: `Valor máximo é R$ ${max.toFixed(2)}`,
			});
		}

		// Check decimal places (max 2)
		const decimalPlaces = (amount.toString().split('.')[1] || '').length;
		if (decimalPlaces > 2) {
			throw new BadRequestException({
				code: 'INVALID_DECIMAL_PLACES',
				message: 'Valor não pode ter mais de 2 casas decimais',
			});
		}
	}

	/**
	 * Validate PIX key based on type
	 */
	static validatePixKey(key: string, type: string): void {
		if (!SecurityUtil.isValidPixKey(key, type)) {
			throw new BadRequestException({
				code: 'INVALID_PIX_KEY',
				message: `Chave PIX inválida para o tipo ${type}`,
				details: { key: SecurityUtil.maskData(key), type },
			});
		}
	}

	/**
	 * Validate phone number (Brazilian format)
	 */
	static validatePhone(phone: string): boolean {
		// Remove all non-digits
		const cleanPhone = phone.replace(/\D/g, '');

		// Brazilian phone: 11 digits (with area code) or 10 digits (landline)
		// Format: (11) 99999-9999 or (11) 9999-9999
		const phoneRegex = /^(\d{2})(\d{4,5})(\d{4})$/;

		if (cleanPhone.length < 10 || cleanPhone.length > 11) {
			return false;
		}

		return phoneRegex.test(cleanPhone);
	}

	/**
	 * Validate date range
	 */
	static validateDateRange(startDate: Date, endDate: Date, maxDays: number = 90): void {
		if (startDate > endDate) {
			throw new BadRequestException({
				code: 'INVALID_DATE_RANGE',
				message: 'Data inicial deve ser anterior à data final',
			});
		}

		const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays > maxDays) {
			throw new BadRequestException({
				code: 'DATE_RANGE_TOO_LARGE',
				message: `Período máximo permitido é de ${maxDays} dias`,
			});
		}
	}

	/**
	 * Validate pagination parameters
	 */
	static validatePagination(page?: number, limit?: number): { page: number; limit: number } {
		const validatedPage = Math.max(1, page || 1);
		const validatedLimit = Math.min(100, Math.max(1, limit || 10));

		return { page: validatedPage, limit: validatedLimit };
	}

	/**
	 * Validate password strength
	 */
	static validatePassword(password: string): void {
		SecurityUtil.validatePasswordStrength(password);
	}

	/**
	 * Validate file upload
	 */
	static validateFile(file: any, allowedTypes: string[], maxSize: number): void {
		if (!file) {
			throw new BadRequestException({
				code: 'FILE_REQUIRED',
				message: 'Arquivo é obrigatório',
			});
		}

		if (!allowedTypes.includes(file.mimetype)) {
			throw new BadRequestException({
				code: 'INVALID_FILE_TYPE',
				message: `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(', ')}`,
			});
		}

		if (file.size > maxSize) {
			const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
			throw new BadRequestException({
				code: 'FILE_TOO_LARGE',
				message: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
			});
		}
	}

	/**
	 * Validate array input
	 */
	static validateArray<T>(
		array: T[],
		minLength: number = 0,
		maxLength: number = 100,
		validator?: (item: T) => boolean
	): void {
		if (!Array.isArray(array)) {
			throw new BadRequestException({
				code: 'INVALID_ARRAY_FORMAT',
				message: 'Valor deve ser um array',
			});
		}

		if (array.length < minLength) {
			throw new BadRequestException({
				code: 'ARRAY_TOO_SHORT',
				message: `Array deve ter pelo menos ${minLength} itens`,
			});
		}

		if (array.length > maxLength) {
			throw new BadRequestException({
				code: 'ARRAY_TOO_LONG',
				message: `Array pode ter no máximo ${maxLength} itens`,
			});
		}

		if (validator) {
			const invalidIndex = array.findIndex(item => !validator(item));
			if (invalidIndex !== -1) {
				throw new BadRequestException({
					code: 'INVALID_ARRAY_ITEM',
					message: `Item inválido no índice ${invalidIndex}`,
				});
			}
		}
	}

	/**
	 * Validate string length
	 */
	static validateStringLength(
		value: string,
		minLength: number = 0,
		maxLength: number = 255,
		fieldName: string = 'Campo'
	): void {
		if (typeof value !== 'string') {
			throw new BadRequestException({
				code: 'INVALID_STRING_FORMAT',
				message: `${fieldName} deve ser uma string`,
			});
		}

		if (value.length < minLength) {
			throw new BadRequestException({
				code: 'STRING_TOO_SHORT',
				message: `${fieldName} deve ter pelo menos ${minLength} caracteres`,
			});
		}

		if (value.length > maxLength) {
			throw new BadRequestException({
				code: 'STRING_TOO_LONG',
				message: `${fieldName} pode ter no máximo ${maxLength} caracteres`,
			});
		}
	}

	/**
	 * Validate enum value
	 */
	static validateEnum<T>(value: T, enumObject: Record<string, T>, fieldName: string = 'Campo'): void {
		const validValues = Object.values(enumObject);
		if (!validValues.includes(value)) {
			throw new BadRequestException({
				code: 'INVALID_ENUM_VALUE',
				message: `${fieldName} deve ser um dos valores: ${validValues.join(', ')}`,
			});
		}
	}

	/**
	 * Validate numeric range
	 */
	static validateNumericRange(
		value: number,
		min: number,
		max: number,
		fieldName: string = 'Valor'
	): void {
		if (typeof value !== 'number' || isNaN(value)) {
			throw new BadRequestException({
				code: 'INVALID_NUMBER_FORMAT',
				message: `${fieldName} deve ser um número válido`,
			});
		}

		if (value < min || value > max) {
			throw new BadRequestException({
				code: 'NUMBER_OUT_OF_RANGE',
				message: `${fieldName} deve estar entre ${min} e ${max}`,
			});
		}
	}

	/**
	 * Validate URL format
	 */
	static validateURL(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Sanitize input string
	 */
	static sanitizeInput(input: string): string {
		return SecurityUtil.sanitizeInput(input);
	}

	/**
	 * Validate business hours (for operations that should only happen during business hours)
	 */
	static validateBusinessHours(timezone: string = 'America/Sao_Paulo'): void {
		const now = new Date();
		const hour = parseInt(now.toLocaleString('en-US', {
			timeZone: timezone,
			hour12: false
		}).split(' ')[1].split(':')[0]);

		// Business hours: 6 AM to 10 PM
		if (hour < 6 || hour >= 22) {
			throw new BadRequestException({
				code: 'OUTSIDE_BUSINESS_HOURS',
				message: 'Operação disponível apenas durante horário comercial (06:00 às 22:00)',
			});
		}
	}

	/**
	 * Validate rate limit compliance
	 */
	static validateRateLimit(
		identifier: string,
		operation: string,
		maxRequests: number,
		windowMs: number,
		requestStore: Map<string, { count: number; resetTime: number }>
	): void {
		const key = `${identifier}:${operation}`;
		const now = Date.now();

		let rateLimitData = requestStore.get(key);

		if (!rateLimitData || now > rateLimitData.resetTime) {
			rateLimitData = {
				count: 0,
				resetTime: now + windowMs
			};
		}

		rateLimitData.count++;
		requestStore.set(key, rateLimitData);

		if (rateLimitData.count > maxRequests) {
			const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);
			throw new BadRequestException({
				code: 'RATE_LIMIT_EXCEEDED',
				message: 'Muitas tentativas. Tente novamente mais tarde',
				details: { retryAfter }
			});
		}
	}
}