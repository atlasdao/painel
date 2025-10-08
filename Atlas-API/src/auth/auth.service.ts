import {
	Injectable,
	UnauthorizedException,
	BadRequestException,
	ConflictException,
	Logger,
	HttpStatus,
	HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../repositories/user.repository';
import { EmailService } from '../services/email.service';
import { ApiKeyUtils } from '../common/utils/api-key.util';
import { EncryptionUtil } from '../common/utils/encryption.util';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';
import {
	RegisterDto,
	LoginDto,
	AuthResponseDto,
	CreateApiKeyDto,
	ForgotPasswordDto,
	ResetPasswordDto,
	VerifyResetCodeDto,
} from '../common/dto/auth.dto';
import { User, UserRole } from '@prisma/client';

export interface JwtPayload {
	sub: string;
	email: string;
	username: string;
	roles: string[];
	role?: string; // Add single role field for compatibility
	type: 'access' | 'refresh' | 'api';
}

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);
	constructor(
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		private readonly userRepository: UserRepository,
		private readonly emailService: EmailService,
		private readonly encryptionUtil: EncryptionUtil,
	) {
		// Debug encryption util injection
		this.logger.log('[INIT] AuthService initialized');
		this.logger.log('[INIT] EncryptionUtil injected:', !!this.encryptionUtil);

		if (this.encryptionUtil) {
			try {
				// Test encryption immediately
				const testValue = 'TEST_123456';
				const encrypted = this.encryptionUtil.encrypt(testValue);
				this.logger.log('[INIT] Test encryption successful:', !!encrypted);
				this.logger.log(
					'[INIT] Encrypted format check:',
					encrypted?.includes(':'),
				);

				if (encrypted) {
					const decrypted = this.encryptionUtil.decrypt(encrypted);
					this.logger.log(
						'[INIT] Test decryption successful:',
						decrypted === testValue,
					);
				}
			} catch (error) {
				this.logger.error('[INIT] Encryption test failed:', error);
			}
		} else {
			this.logger.error('[INIT] EncryptionUtil is NULL!');
		}
	}

	async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
		const { email, username, password } = registerDto;

		// Check if user already exists
		const existingEmail = await this.userRepository.findByEmail(email);
		if (existingEmail) {
			throw new ConflictException('Email already registered');
		}

		const existingUsername = await this.userRepository.findByUsername(username);
		if (existingUsername) {
			throw new ConflictException('Username already taken');
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user with default 'user' role
		const user = await this.userRepository.createWithRoles(
			{
				email,
				username,
				password: hashedPassword,
			},
			[], // Will be assigned default role by the service
		);

		// Generate tokens
		const authResponse = await this.generateAuthResponse(user);

		// Send welcome email (non-blocking)
		try {
			await this.emailService.sendWelcomeEmail(user.email, user.username);
		} catch (error) {
			console.error('Failed to send welcome email:', error);
			// Don't fail registration if email fails
		}

		return authResponse;
	}

	async login(loginDto: LoginDto): Promise<AuthResponseDto | { requiresTwoFactor: boolean; sessionToken: string; message: string; user?: { email: string } }> {
		const { emailOrUsername, password, twoFactorToken } = loginDto;

		// Find user by email or username
		let user: User | null = null;
		if (emailOrUsername.includes('@')) {
			user = await this.userRepository.findByEmail(emailOrUsername);
		} else {
			user = await this.userRepository.findByUsername(emailOrUsername);
		}

		if (!user) {
			throw new UnauthorizedException('Invalid credentials');
		}

		// Verify password
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			throw new UnauthorizedException('Invalid credentials');
		}

		// Check if user is active
		if (!user.isActive) {
			throw new UnauthorizedException('Account is deactivated');
		}

		// Check if 2FA is enabled for this user
		if (user.twoFactorEnabled) {
			this.logger.log(`[LOGIN] 2FA enabled for user ${user.email}`);

			// If no 2FA token provided, return that 2FA is required
			if (!twoFactorToken) {
				this.logger.log(
					`[LOGIN] No 2FA token provided, returning 2FA required response`,
				);

				// Generate a temporary session token for 2FA verification
				const sessionToken = uuidv4();

				// Store session info temporarily (in production, use Redis or similar)
				// For now, we'll use the JWT service to create a short-lived token
				const tempPayload = {
					email: user.email,
					userId: user.id,
					type: '2fa-session',
					// Remove exp from payload since we're using expiresIn in sign options
				};

				const sessionJwt = await this.jwtService.sign(tempPayload, {
					expiresIn: '15m',
				});

				// Return a special response indicating 2FA is required
				return {
					requiresTwoFactor: true,
					sessionToken: sessionJwt,
					message: 'Verificação 2FA necessária',
					user: {
						email: user.email,
					},
				};
			}

			// Verify 2FA token
			if (!user.twoFactorSecret) {
				this.logger.error(
					`[LOGIN] 2FA enabled but no secret found for user ${user.email}`,
				);
				throw new BadRequestException('2FA configuration error');
			}

			// Decrypt the secret
			const decryptedSecret =
				this.encryptionUtil.decrypt(user.twoFactorSecret) ||
				user.twoFactorSecret;

			// Verify the token
			const verified = speakeasy.totp.verify({
				secret: decryptedSecret,
				encoding: 'base32',
				token: twoFactorToken,
				window: 2, // Allow 2 time windows for clock skew
			});

			if (!verified) {
				this.logger.log(`[LOGIN] Invalid 2FA token for user ${user.email}`);
				throw new UnauthorizedException('Token 2FA inválido');
			}

			this.logger.log(
				`[LOGIN] 2FA verification successful for user ${user.email}`,
			);
		}

		// Update last login
		await this.userRepository.updateLastLogin(user.id);

		// Generate tokens
		return this.generateAuthResponse(user);
	}

	async verify2FA(email: string, twoFactorToken: string): Promise<AuthResponseDto> {
		this.logger.log(`[2FA VERIFY] Starting 2FA verification for email: ${email}`);
		this.logger.log(`[2FA VERIFY] Received token: ${twoFactorToken}`);

		// Find user by email
		const user = await this.userRepository.findByEmail(email);

		if (!user) {
			this.logger.error(`[2FA VERIFY] User not found for email: ${email}`);
			throw new UnauthorizedException('Invalid session');
		}

		this.logger.log(`[2FA VERIFY] User found: ${user.email}, ID: ${user.id}`);
		this.logger.log(`[2FA VERIFY] 2FA enabled: ${user.twoFactorEnabled}`);
		this.logger.log(`[2FA VERIFY] Has 2FA secret: ${!!user.twoFactorSecret}`);

		if (!user.isActive) {
			throw new UnauthorizedException('Account is deactivated');
		}

		if (!user.twoFactorEnabled || !user.twoFactorSecret) {
			throw new BadRequestException('2FA not configured for this account');
		}

		// Decrypt the secret
		const decryptedSecret =
			this.encryptionUtil.decrypt(user.twoFactorSecret) ||
			user.twoFactorSecret;

		// Verify the token
		const verified = speakeasy.totp.verify({
			secret: decryptedSecret,
			encoding: 'base32',
			token: twoFactorToken,
			window: 2, // Allow 2 time windows for clock skew
		});

		if (!verified) {
			this.logger.log(`[2FA VERIFY] Invalid 2FA token for user ${user.email}`);
			throw new UnauthorizedException('Código 2FA inválido');
		}

		this.logger.log(
			`[2FA VERIFY] 2FA verification successful for user ${user.email}`,
		);

		// Update last login
		await this.userRepository.updateLastLogin(user.id);

		// Generate tokens
		return this.generateAuthResponse(user);
	}

	async generateApiToken(
		userId: string,
		createApiKeyDto: CreateApiKeyDto,
	): Promise<{ apiKey: string; expiresAt?: Date }> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		// Generate unique API key with professional format
		const apiKey = ApiKeyUtils.generateApiKey();

		// Calculate expiration
		let expiresAt: Date | undefined;
		if (createApiKeyDto.expirationDays) {
			expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + createApiKeyDto.expirationDays);
		}

		// Store API key (hashed)
		const hashedApiKey = await bcrypt.hash(apiKey, 10);
		await this.userRepository.update(userId, { apiKey: hashedApiKey });

		return {
			apiKey,
			expiresAt,
		};
	}

	async validateApiKey(apiKey: string): Promise<User> {
		// Find all users with API keys and check
		const users = await this.userRepository.findActiveUsers();

		for (const user of users) {
			if (user.apiKey) {
				const isValid = await bcrypt.compare(apiKey, user.apiKey);
				if (isValid) {
					return user;
				}
			}
		}

		throw new UnauthorizedException('Invalid API key');
	}

	async getApiKeyStatus(
		userId: string,
	): Promise<{ hasApiKey: boolean; createdAt?: Date }> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		return {
			hasApiKey: !!user.apiKey,
			createdAt: user.apiKey ? user.updatedAt : undefined, // Using updatedAt as proxy for API key creation time
		};
	}

	async revokeApiKey(userId: string): Promise<void> {
		await this.userRepository.update(userId, { apiKey: null });
	}

	private async generateAuthResponse(user: any): Promise<AuthResponseDto> {
		const payload: JwtPayload = {
			sub: user.id,
			email: user.email,
			username: user.username,
			roles: [user.role || UserRole.USER],
			role: user.role || UserRole.USER, // Add single role field for compatibility
			type: 'access',
		};

		const accessToken = await this.generateToken(payload);
		const refreshToken = await this.generateRefreshToken({
			...payload,
			type: 'refresh',
		});
		const expiresIn = this.getTokenExpiration();

		return {
			accessToken,
			tokenType: 'Bearer',
			expiresIn,
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				roles: payload.roles,
				role: user.role,
				isActive: user.isActive,
				createdAt: user.createdAt,
				lastLoginAt: user.lastLoginAt,
				profilePicture: user.profilePicture || null,
				commerceMode: user.commerceMode || false,
				commerceModeActivatedAt: user.commerceModeActivatedAt || null,
				twoFactorEnabled: user.twoFactorEnabled || false,
				defaultWalletAddress: user.defaultWalletAddress || null,
				defaultWalletType: user.defaultWalletType || null,
			},
		};
	}

	async generateToken(payload: JwtPayload): Promise<string> {
		return this.jwtService.sign(payload);
	}

	async generateRefreshToken(payload: JwtPayload): Promise<string> {
		return this.jwtService.sign(payload, {
			secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
			expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
		});
	}

	async validateToken(token: string): Promise<JwtPayload> {
		try {
			const decoded = this.jwtService.verify(token);
			return decoded;
		} catch (error) {
			throw new UnauthorizedException('Token inválido');
		}
	}

	async getUserProfile(userId: string): Promise<any> {
		this.logger.log(`[AUTH GET PROFILE] Fetching profile for user: ${userId}`);
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		this.logger.log(`[AUTH GET PROFILE] User found: ${!!user}`);
		this.logger.log(
			`[AUTH GET PROFILE] isAccountValidated: ${user.isAccountValidated}`,
		);
		this.logger.log(
			`[AUTH GET PROFILE] commerceMode: ${user.commerceMode}`,
		);
		this.logger.log(
			`[AUTH GET PROFILE] Has profilePicture in DB: ${!!user.profilePicture}`,
		);
		this.logger.log(
			`[AUTH GET PROFILE] ProfilePicture length: ${user.profilePicture?.length || 0}`,
		);

		// Return user with all fields including commerce fields and profile picture
		const result = {
			id: user.id,
			username: user.username,
			email: user.email,
			role: user.role,
			isAccountValidated: user.isAccountValidated || false,
			commerceMode: user.commerceMode,
			commerceModeActivatedAt: user.commerceModeActivatedAt,
			paymentLinksEnabled: user.paymentLinksEnabled,
			isActive: user.isActive,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			lastLoginAt: user.lastLoginAt,
			profilePicture: user.profilePicture || null,
			twoFactorEnabled: user.twoFactorEnabled || false,
			defaultWalletAddress: user.defaultWalletAddress || null,
			defaultWalletType: user.defaultWalletType || null,
			pixKey: user.pixKey || null,
			pixKeyType: user.pixKeyType || null,
		};

		this.logger.log(
			`[AUTH GET PROFILE] Returning profile with profilePicture: ${!!result.profilePicture}`,
		);
		return result;
	}

	async validateRefreshToken(token: string): Promise<JwtPayload> {
		try {
			const decoded = this.jwtService.verify(token, {
				secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
			});
			return decoded;
		} catch (error) {
			throw new UnauthorizedException('Token de atualização inválido');
		}
	}

	async refreshAccessToken(refreshToken: string): Promise<AuthResponseDto> {
		const payload = await this.validateRefreshToken(refreshToken);
		const user = await this.userRepository.findById(payload.sub);

		if (!user || !user.isActive) {
			throw new UnauthorizedException('User not found or inactive');
		}

		return this.generateAuthResponse(user);
	}

	private getTokenExpiration(): number {
		const expiration = this.configService.get<string>('JWT_EXPIRATION', '24h');
		const match = expiration.match(/(\d+)([hdm])/);

		if (match) {
			const value = parseInt(match[1]);
			const unit = match[2];

			switch (unit) {
				case 'h':
					return value * 3600;
				case 'd':
					return value * 86400;
				case 'm':
					return value * 60;
				default:
					return 86400; // 24 hours default
			}
		}

		return 86400; // 24 hours default
	}

	hasScope(scopes: string[], requiredScope: string): boolean {
		return scopes.includes('admin') || scopes.includes(requiredScope);
	}

	// ===== PASSWORD RESET METHODS =====

	async forgotPassword(
		forgotPasswordDto: ForgotPasswordDto,
	): Promise<{ message: string }> {
		const { email } = forgotPasswordDto;

		const user = await this.userRepository.findByEmail(email);
		if (!user) {
			// Return success even if user doesn't exist (security best practice)
			return {
				message:
					'If an account with this email exists, a reset code has been sent.',
			};
		}

		// Check rate limiting (max 3 attempts per hour)
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		if (user.passwordResetAttempts >= 3 && user.updatedAt > oneHourAgo) {
			throw new BadRequestException(
				'Too many password reset attempts. Please try again in 1 hour.',
			);
		}

		// Generate 6-digit code
		const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

		this.logger.log('[FORGOT-PASSWORD] Generated reset code:', resetCode);
		this.logger.log(
			'[FORGOT-PASSWORD] EncryptionUtil available:',
			!!this.encryptionUtil,
		);

		// Encrypt and update user with reset code
		let encryptedCode: string | null = null;
		try {
			encryptedCode = this.encryptionUtil.encrypt(resetCode);
			this.logger.log(
				'[FORGOT-PASSWORD] Encrypted code:',
				encryptedCode?.substring(0, 50) + '...',
			);
			this.logger.log(
				'[FORGOT-PASSWORD] Is encrypted format?',
				encryptedCode?.includes(':'),
			);
		} catch (error) {
			this.logger.error('[FORGOT-PASSWORD] Encryption failed:', error);
			this.logger.error(
				'[FORGOT-PASSWORD] CRITICAL: Cannot save unencrypted password reset codes!',
			);
			throw new Error('Failed to encrypt reset code - security requirement');
		}

		// CRITICAL FIX: Remove fallback to plain text
		if (!encryptedCode) {
			this.logger.error(
				'[FORGOT-PASSWORD] CRITICAL: Encryption returned null/empty!',
			);
			throw new Error(
				'Failed to encrypt password reset code - security requirement',
			);
		}

		this.logger.log('[FORGOT-PASSWORD] Saving encrypted code to database');
		await this.userRepository.update(user.id, {
			passwordResetCode: encryptedCode,
			passwordResetExpires: expiresAt,
			passwordResetAttempts: user.passwordResetAttempts + 1,
		});

		// Verify what was saved
		const verification = await this.userRepository.findById(user.id);
		this.logger.log(
			'[FORGOT-PASSWORD] Verification - Code saved:',
			verification?.passwordResetCode?.substring(0, 50) + '...',
		);
		this.logger.log(
			'[FORGOT-PASSWORD] Verification - Is encrypted?',
			verification?.passwordResetCode?.includes(':'),
		);

		// Send email
		try {
			await this.emailService.sendPasswordResetEmail(email, resetCode);
		} catch (error) {
			console.error('Failed to send password reset email:', error);
			throw new BadRequestException(
				'Failed to send reset email. Please try again.',
			);
		}

		return {
			message:
				'If an account with this email exists, a reset code has been sent.',
		};
	}

	async verifyResetCode(
		verifyResetCodeDto: VerifyResetCodeDto,
	): Promise<{ valid: boolean; message: string }> {
		const { email, resetCode } = verifyResetCodeDto;

		const user = await this.userRepository.findByEmail(email);
		if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
			return { valid: false, message: 'Código de redefinição inválido ou expirado.' };
		}

		// Check if code is expired
		if (user.passwordResetExpires < new Date()) {
			return {
				valid: false,
				message: 'Reset code has expired. Please request a new one.',
			};
		}

		// Decrypt and verify code
		const decryptedCode =
			this.encryptionUtil.decrypt(user.passwordResetCode) ||
			user.passwordResetCode;
		if (decryptedCode !== resetCode) {
			return { valid: false, message: 'Invalid reset code.' };
		}

		return { valid: true, message: 'Reset code is valid.' };
	}

	async resetPassword(
		resetPasswordDto: ResetPasswordDto,
	): Promise<{ message: string }> {
		const { email, resetCode, newPassword } = resetPasswordDto;

		const user = await this.userRepository.findByEmail(email);
		if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
			throw new BadRequestException('Código de redefinição inválido ou expirado.');
		}

		// Check if code is expired
		if (user.passwordResetExpires < new Date()) {
			throw new BadRequestException(
				'Reset code has expired. Please request a new one.',
			);
		}

		// Decrypt and verify code
		const decryptedCode =
			this.encryptionUtil.decrypt(user.passwordResetCode) ||
			user.passwordResetCode;
		if (decryptedCode !== resetCode) {
			throw new BadRequestException('Invalid reset code.');
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// Update user password and clear reset fields
		await this.userRepository.update(user.id, {
			password: hashedPassword,
			passwordResetCode: null,
			passwordResetExpires: null,
			passwordResetAttempts: 0,
		});

		return { message: 'Password has been successfully reset.' };
	}
}
