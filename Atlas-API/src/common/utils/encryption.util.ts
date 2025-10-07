import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EncryptionUtil {
	private readonly algorithm = 'aes-256-gcm';
	private readonly keyLength = 32; // 256 bits
	private readonly ivLength = 16; // 128 bits
	private readonly tagLength = 16; // 128 bits
	private readonly saltLength = 32; // 256 bits
	private readonly iterations = 10000;
	private encryptionKey: Buffer;

	constructor(private readonly configService: ConfigService) {
		// Derive encryption key from dedicated encryption secret
		const encryptionSecret =
			this.configService?.get<string>('ENCRYPTION_SECRET');

		if (!encryptionSecret) {
			throw new Error(
				'CRITICAL SECURITY ERROR: ENCRYPTION_SECRET environment variable is required. ' +
				'Please set a strong, random encryption key in your environment variables.'
			);
		}

		// Validate minimum key strength
		if (encryptionSecret.length < 32) {
			throw new Error(
				'SECURITY ERROR: ENCRYPTION_SECRET must be at least 32 characters long for adequate security.'
			);
		}

		// Create a consistent key from the secret
		const salt = crypto.createHash('sha256').update('atlas-2fa-salt-v2').digest();
		this.encryptionKey = crypto.pbkdf2Sync(
			encryptionSecret,
			salt,
			this.iterations,
			this.keyLength,
			'sha256',
		);
	}

	/**
	 * Encrypts sensitive data
	 * @param text Plain text to encrypt
	 * @returns Encrypted string in format: salt:iv:tag:encrypted
	 */
	encrypt(text: string): string | null {
		if (!text) {
			return null;
		}

		if (!this.encryptionKey) {
			throw new Error('Encryption key not initialized');
		}

		try {
			// Generate random IV for each encryption
			const iv = crypto.randomBytes(this.ivLength);

			// Create cipher
			const cipher = crypto.createCipheriv(
				this.algorithm,
				this.encryptionKey,
				iv,
			);

			// Encrypt the text
			let encrypted = cipher.update(text, 'utf8', 'base64');
			encrypted += cipher.final('base64');

			// Get the authentication tag
			const tag = cipher.getAuthTag();

			// Combine all parts with delimiter
			const result = `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;

			return result;
		} catch (error) {
			console.error('Encryption error:', error);
			throw new Error('Failed to encrypt data');
		}
	}

	/**
	 * Decrypts sensitive data
	 * @param encryptedText Encrypted string in format: iv:tag:encrypted
	 * @returns Decrypted plain text
	 */
	decrypt(encryptedText: string): string | null {
		if (!encryptedText) return null;

		try {
			// Split the encrypted text
			const parts = encryptedText.split(':');
			if (parts.length !== 3) {
				// Data might be unencrypted (for backward compatibility)
				console.warn('Data appears to be unencrypted, returning as-is');
				return encryptedText;
			}

			const [ivBase64, tagBase64, encrypted] = parts;

			// Convert from base64
			const iv = Buffer.from(ivBase64, 'base64');
			const tag = Buffer.from(tagBase64, 'base64');

			// Create decipher
			const decipher = crypto.createDecipheriv(
				this.algorithm,
				this.encryptionKey,
				iv,
			);
			decipher.setAuthTag(tag);

			// Decrypt
			let decrypted = decipher.update(encrypted, 'base64', 'utf8');
			decrypted += decipher.final('utf8');

			return decrypted;
		} catch (error) {
			console.error('Decryption error:', error);
			// For backward compatibility, return the original if decryption fails
			// This allows gradual migration of existing unencrypted data
			return encryptedText;
		}
	}

	/**
	 * Checks if a string appears to be encrypted
	 * @param text String to check
	 * @returns true if the string appears to be encrypted
	 */
	isEncrypted(text: string): boolean {
		if (!text) return false;
		const parts = text.split(':');
		return (
			parts.length === 3 && this.isBase64(parts[0]) && this.isBase64(parts[1])
		);
	}

	/**
	 * Helper to check if a string is valid base64
	 */
	private isBase64(str: string): boolean {
		try {
			return Buffer.from(str, 'base64').toString('base64') === str;
		} catch {
			return false;
		}
	}

	/**
	 * Securely compare two strings (constant time comparison)
	 * Useful for comparing tokens, secrets, etc.
	 */
	secureCompare(a: string, b: string): boolean {
		if (!a || !b) return false;
		if (a.length !== b.length) return false;

		return crypto.timingSafeEqual(
			Buffer.from(a, 'utf8'),
			Buffer.from(b, 'utf8'),
		);
	}
}
