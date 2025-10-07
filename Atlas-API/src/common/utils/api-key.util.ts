import * as crypto from 'crypto';

export class ApiKeyUtils {
	/**
	 * Generates a secure API key with consistent format
	 * Uses crypto.randomBytes for security and hex encoding for consistency
	 */
	static generateApiKey(): string {
		const prefix = 'atlas_';
		const randomBytes = crypto.randomBytes(32).toString('hex');
		return `${prefix}${randomBytes}`;
	}

	/**
	 * Validates API key format
	 */
	static isValidApiKeyFormat(apiKey: string): boolean {
		const pattern = /^atlas_[a-f0-9]{64}$/;
		return pattern.test(apiKey);
	}
}
