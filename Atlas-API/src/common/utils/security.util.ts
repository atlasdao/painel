import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';
import { SecurityConfig } from '../config/security.config';

export class SecurityUtil {
	// Generate secure random tokens
	static generateSecureToken(length: number = 32): string {
		return crypto.randomBytes(length).toString('hex');
	}

	// Generate API key with prefix
	static generateApiKey(): string {
		const token = crypto
			.randomBytes(SecurityConfig.apiKey.length)
			.toString('base64url');
		return `${SecurityConfig.apiKey.prefix}${token}`;
	}

	// Hash password with bcrypt
	static async hashPassword(password: string): Promise<string> {
		this.validatePasswordStrength(password);
		return bcrypt.hash(password, SecurityConfig.encryption.saltRounds);
	}

	// Compare password with hash
	static async comparePassword(
		password: string,
		hash: string,
	): Promise<boolean> {
		return bcrypt.compare(password, hash);
	}

	// Validate password strength
	static validatePasswordStrength(password: string): void {
		const config = SecurityConfig.password;
		const errors: string[] = [];

		if (password.length < config.minLength) {
			errors.push(
				`Password must be at least ${config.minLength} characters long`,
			);
		}

		if (config.requireUppercase && !/[A-Z]/.test(password)) {
			errors.push('Password must contain at least one uppercase letter');
		}

		if (config.requireLowercase && !/[a-z]/.test(password)) {
			errors.push('Password must contain at least one lowercase letter');
		}

		if (config.requireNumbers && !/\d/.test(password)) {
			errors.push('Password must contain at least one number');
		}

		if (
			config.requireSpecialChars &&
			!/[!@#$%^&*(),.?":{}|<>]/.test(password)
		) {
			errors.push('Password must contain at least one special character');
		}

		if (errors.length > 0) {
			throw new BadRequestException(errors);
		}
	}

	// Encrypt sensitive data
	static encrypt(text: string, key?: string): string {
		const algorithm = SecurityConfig.encryption.algorithm;
		const secretKey = key || process.env.ENCRYPTION_KEY;
		if (!secretKey) {
			throw new Error('Encryption key is required. Set ENCRYPTION_KEY environment variable.');
		}
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv(
			algorithm,
			crypto.scryptSync(secretKey, 'salt', 32),
			iv,
		);

		let encrypted = cipher.update(text, 'utf8', 'hex');
		encrypted += cipher.final('hex');

		const authTag = (cipher as any).getAuthTag();
		return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
	}

	// Decrypt sensitive data
	static decrypt(encryptedText: string, key?: string): string {
		const algorithm = SecurityConfig.encryption.algorithm;
		const secretKey = key || process.env.ENCRYPTION_KEY;
		if (!secretKey) {
			throw new Error('Encryption key is required. Set ENCRYPTION_KEY environment variable.');
		}

		const parts = encryptedText.split(':');
		const iv = Buffer.from(parts[0], 'hex');
		const authTag = Buffer.from(parts[1], 'hex');
		const encrypted = parts[2];

		const decipher = crypto.createDecipheriv(
			algorithm,
			crypto.scryptSync(secretKey, 'salt', 32),
			iv,
		);

		(decipher as any).setAuthTag(authTag);

		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	}

	// Generate OTP code
	static generateOTP(length: number = 6): string {
		const digits = '0123456789';
		let otp = '';
		for (let i = 0; i < length; i++) {
			otp += digits[Math.floor(Math.random() * digits.length)];
		}
		return otp;
	}

	// Sanitize input to prevent XSS
	static sanitizeInput(input: string): string {
		if (!input) return input;

		return input
			.replace(/[<>]/g, '') // Remove angle brackets
			.replace(/javascript:/gi, '') // Remove javascript protocol
			.replace(/on\w+\s*=/gi, '') // Remove event handlers
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
			.trim();
	}

	// Validate email format
	static isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	// Validate UUID format
	static isValidUUID(uuid: string): boolean {
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return uuidRegex.test(uuid);
	}

	// Validate CPF (Brazilian tax ID)
	static isValidCPF(cpf: string): boolean {
		cpf = cpf.replace(/[^\d]/g, '');

		if (cpf.length !== 11) return false;
		if (/^(\d)\1{10}$/.test(cpf)) return false;

		let sum = 0;
		for (let i = 0; i < 9; i++) {
			sum += parseInt(cpf.charAt(i)) * (10 - i);
		}

		let digit = 11 - (sum % 11);
		if (digit === 10 || digit === 11) digit = 0;
		if (digit !== parseInt(cpf.charAt(9))) return false;

		sum = 0;
		for (let i = 0; i < 10; i++) {
			sum += parseInt(cpf.charAt(i)) * (11 - i);
		}

		digit = 11 - (sum % 11);
		if (digit === 10 || digit === 11) digit = 0;
		if (digit !== parseInt(cpf.charAt(10))) return false;

		return true;
	}

	// Validate CNPJ (Brazilian company tax ID)
	static isValidCNPJ(cnpj: string): boolean {
		cnpj = cnpj.replace(/[^\d]/g, '');

		if (cnpj.length !== 14) return false;
		if (/^(\d)\1{13}$/.test(cnpj)) return false;

		const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
		const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

		let sum = 0;
		for (let i = 0; i < 12; i++) {
			sum += parseInt(cnpj.charAt(i)) * weights1[i];
		}

		let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
		if (digit !== parseInt(cnpj.charAt(12))) return false;

		sum = 0;
		for (let i = 0; i < 13; i++) {
			sum += parseInt(cnpj.charAt(i)) * weights2[i];
		}

		digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
		if (digit !== parseInt(cnpj.charAt(13))) return false;

		return true;
	}

	// Generate HMAC signature
	static generateHMAC(data: string, secret: string): string {
		return crypto.createHmac('sha256', secret).update(data).digest('hex');
	}

	// Verify HMAC signature
	static verifyHMAC(data: string, signature: string, secret: string): boolean {
		const expectedSignature = this.generateHMAC(data, secret);
		return crypto.timingSafeEqual(
			Buffer.from(signature),
			Buffer.from(expectedSignature),
		);
	}

	// Mask sensitive data
	static maskData(data: string, visibleChars: number = 4): string {
		if (!data || data.length <= visibleChars) return data;

		const masked =
			data.substring(0, visibleChars) +
			'*'.repeat(data.length - visibleChars * 2) +
			data.substring(data.length - visibleChars);

		return masked;
	}

	// Rate limit key generator
	static generateRateLimitKey(identifier: string, operation: string): string {
		return `rate_limit:${operation}:${identifier}`;
	}

	// Check if IP is in blocklist
	static isBlockedIP(ip: string): boolean {
		const blocklist = SecurityConfig.antifraud.blocklistedIPs as string[];
		return blocklist.includes(ip);
	}

	// Validate PIX key format
	static isValidPixKey(key: string, type: string): boolean {
		switch (type) {
			case 'CPF':
				return this.isValidCPF(key);
			case 'CNPJ':
				return this.isValidCNPJ(key);
			case 'EMAIL':
				return this.isValidEmail(key);
			case 'PHONE':
				return /^\+?[1-9]\d{1,14}$/.test(key.replace(/\D/g, ''));
			case 'RANDOM':
				return this.isValidUUID(key);
			default:
				return false;
		}
	}
}
