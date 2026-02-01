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
import { PrismaService } from '../prisma/prisma.service';
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
		private readonly prisma: PrismaService,
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

		// Generate email verification token
		const verificationToken = uuidv4();
		const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		// Create user with default 'user' role and verification token
		// commerceMode and delayedPaymentEnabled are enabled by default for all users
		const user = await this.userRepository.createWithRoles(
			{
				email,
				username,
				password: hashedPassword,
				isAccountValidated: false,
				commerceMode: true,
				delayedPaymentEnabled: true,
				delayedPaymentEnabledAt: new Date(),
				emailVerificationToken: verificationToken,
				emailVerificationExpires: verificationExpires,
			},
			[], // Will be assigned default role by the service
		);

		// Generate tokens
		const authResponse = await this.generateAuthResponse(user);

		// Send email verification (non-blocking)
		try {
			await this.emailService.sendEmailVerification(user.email, user.username, verificationToken);
			this.logger.log(`[REGISTER] Email verification sent to ${user.email}`);
		} catch (error) {
			this.logger.error('Failed to send email verification:', error);
			// Don't fail registration if email fails
		}

		return authResponse;
	}

	async verifyEmail(token: string): Promise<{ message: string; success: boolean }> {
		// Find user by verification token
		const user = await this.userRepository.findByEmailVerificationToken(token);

		if (!user) {
			throw new BadRequestException('Token de verificação inválido ou expirado.');
		}

		// Check if token is expired
		if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
			throw new BadRequestException('Token de verificação expirado. Solicite um novo email de verificação.');
		}

		// Update user as verified
		await this.userRepository.update(user.id, {
			isAccountValidated: true,
			emailVerificationToken: null,
			emailVerificationExpires: null,
			validatedAt: new Date(),
		});

		this.logger.log(`[VERIFY EMAIL] Email verified for user ${user.email}`);

		return {
			message: 'Email verificado com sucesso! Sua conta está ativa.',
			success: true,
		};
	}

	async resendVerificationEmail(email: string): Promise<{ message: string }> {
		const user = await this.userRepository.findByEmail(email);

		if (!user) {
			// Return success even if user doesn't exist (security best practice)
			return { message: 'Se o email existir, um novo link de verificação foi enviado.' };
		}

		if (user.isAccountValidated) {
			throw new BadRequestException('Esta conta já está verificada.');
		}

		// Generate new verification token
		const verificationToken = uuidv4();
		const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		await this.userRepository.update(user.id, {
			emailVerificationToken: verificationToken,
			emailVerificationExpires: verificationExpires,
		});

		// Send email verification
		try {
			await this.emailService.sendEmailVerification(user.email, user.username, verificationToken);
		} catch (error) {
			this.logger.error('Failed to resend email verification:', error);
			throw new BadRequestException('Falha ao enviar email. Tente novamente.');
		}

		return { message: 'Se o email existir, um novo link de verificação foi enviado.' };
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

		// Find user by email
		const user = await this.userRepository.findByEmail(email);

		if (!user) {
			this.logger.error(`[2FA VERIFY] User not found for email: ${email}`);
			throw new UnauthorizedException('Invalid session');
		}

		this.logger.log(`[2FA VERIFY] User found: ${user.email}, ID: ${user.id}`);

		if (!user.isActive) {
			throw new UnauthorizedException('Account is deactivated');
		}

		if (!user.twoFactorEnabled || !user.twoFactorSecret) {
			throw new BadRequestException('2FA not configured for this account');
		}

		// Check if account is locked due to too many failed attempts
		if (user.twoFactorLockedUntil && user.twoFactorLockedUntil > new Date()) {
			const minutesLeft = Math.ceil((user.twoFactorLockedUntil.getTime() - Date.now()) / 60000);
			this.logger.warn(`[2FA VERIFY] Account locked for user ${user.email}, ${minutesLeft} minutes remaining`);
			throw new BadRequestException(`Conta bloqueada. Tente novamente em ${minutesLeft} minuto(s).`);
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
			// Increment failed attempts
			const newFailedAttempts = (user.twoFactorFailedAttempts || 0) + 1;
			const updateData: any = { twoFactorFailedAttempts: newFailedAttempts };

			// Lock account after 5 failed attempts for 15 minutes
			if (newFailedAttempts >= 5) {
				updateData.twoFactorLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
				this.logger.warn(`[2FA VERIFY] Account locked for user ${user.email} after ${newFailedAttempts} failed attempts`);
			}

			await this.userRepository.update(user.id, updateData);

			const attemptsRemaining = Math.max(0, 5 - newFailedAttempts);
			if (attemptsRemaining > 0) {
				throw new UnauthorizedException(`Código 2FA inválido. ${attemptsRemaining} tentativa(s) restante(s).`);
			} else {
				throw new UnauthorizedException('Código 2FA inválido. Conta bloqueada por 15 minutos.');
			}
		}

		this.logger.log(
			`[2FA VERIFY] 2FA verification successful for user ${user.email}`,
		);

		// Reset failed attempts and update last verified time
		await this.userRepository.update(user.id, {
			twoFactorFailedAttempts: 0,
			twoFactorLockedUntil: null,
			twoFactorLastVerified: new Date(),
		});

		// Update last login
		await this.userRepository.updateLastLogin(user.id);

		// Generate tokens
		return this.generateAuthResponse(user);
	}

	async verify2FAWithBackupCode(email: string, backupCode: string): Promise<AuthResponseDto> {
		this.logger.log(`[2FA BACKUP] Starting backup code verification for email: ${email}`);

		const user = await this.userRepository.findByEmail(email);

		if (!user) {
			throw new UnauthorizedException('Invalid session');
		}

		if (!user.isActive) {
			throw new UnauthorizedException('Account is deactivated');
		}

		if (!user.twoFactorEnabled || !user.twoFactorBackupCodes) {
			throw new BadRequestException('2FA or backup codes not configured');
		}

		// Decrypt backup codes
		const decryptedCodesJson = this.encryptionUtil.decrypt(user.twoFactorBackupCodes);
		if (!decryptedCodesJson) {
			throw new BadRequestException('Error verifying backup codes');
		}

		let backupCodes: string[];
		try {
			backupCodes = JSON.parse(decryptedCodesJson);
		} catch {
			throw new BadRequestException('Error processing backup codes');
		}

		// Check if backup code is valid
		const normalizedCode = backupCode.toUpperCase().trim();
		const codeIndex = backupCodes.findIndex(code => code === normalizedCode);

		if (codeIndex === -1) {
			throw new UnauthorizedException('Código de backup inválido');
		}

		// Remove used backup code
		backupCodes.splice(codeIndex, 1);

		// Re-encrypt and save remaining codes
		const encryptedRemainingCodes = this.encryptionUtil.encrypt(JSON.stringify(backupCodes));
		await this.userRepository.update(user.id, {
			twoFactorBackupCodes: encryptedRemainingCodes,
			twoFactorLastVerified: new Date(),
			twoFactorFailedAttempts: 0,
			twoFactorLockedUntil: null,
		});

		this.logger.log(`[2FA BACKUP] Backup code used for user ${user.email}, ${backupCodes.length} codes remaining`);

		// Update last login
		await this.userRepository.updateLastLogin(user.id);

		// Generate tokens
		return this.generateAuthResponse(user);
	}

	async checkPeriodicVerification(userId: string): Promise<{ requiresVerification: boolean; lastVerified?: Date }> {
		const user = await this.userRepository.findById(userId);

		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		if (!user.twoFactorEnabled || !user.twoFactorPeriodicCheck) {
			return { requiresVerification: false };
		}

		const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
		const requiresVerification = !user.twoFactorLastVerified || user.twoFactorLastVerified < twelveHoursAgo;

		return {
			requiresVerification,
			lastVerified: user.twoFactorLastVerified || undefined,
		};
	}

	async verifyPeriodicCheck(userId: string, token: string): Promise<{ success: boolean }> {
		const user = await this.userRepository.findById(userId);

		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		if (!user.twoFactorEnabled || !user.twoFactorSecret) {
			throw new BadRequestException('2FA not configured');
		}

		// Check if locked
		if (user.twoFactorLockedUntil && user.twoFactorLockedUntil > new Date()) {
			const minutesLeft = Math.ceil((user.twoFactorLockedUntil.getTime() - Date.now()) / 60000);
			throw new BadRequestException(`Conta bloqueada. Tente novamente em ${minutesLeft} minuto(s).`);
		}

		const decryptedSecret = this.encryptionUtil.decrypt(user.twoFactorSecret) || user.twoFactorSecret;

		const verified = speakeasy.totp.verify({
			secret: decryptedSecret,
			encoding: 'base32',
			token,
			window: 2,
		});

		if (!verified) {
			const newFailedAttempts = (user.twoFactorFailedAttempts || 0) + 1;
			const updateData: any = { twoFactorFailedAttempts: newFailedAttempts };

			if (newFailedAttempts >= 5) {
				updateData.twoFactorLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
			}

			await this.userRepository.update(user.id, updateData);
			throw new UnauthorizedException('Código 2FA inválido');
		}

		await this.userRepository.update(user.id, {
			twoFactorLastVerified: new Date(),
			twoFactorFailedAttempts: 0,
			twoFactorLockedUntil: null,
		});

		this.logger.log(`[2FA PERIODIC] Periodic check successful for user ${user.email}`);

		return { success: true };
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
			notifyApprovedSales: user.notifyApprovedSales ?? true,
			notifyReviewSales: user.notifyReviewSales ?? true,
		};

		this.logger.log(
			`[AUTH GET PROFILE] Returning profile with profilePicture: ${!!result.profilePicture}`,
		);
		return result;
	}

	async updateNotificationSettings(
		userId: string,
		settings: { notifyApprovedSales?: boolean; notifyReviewSales?: boolean },
	): Promise<any> {
		this.logger.log(
			`[AUTH] Updating notification settings for user: ${userId}`,
		);

		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new UnauthorizedException('Usuário não encontrado');
		}

		const updateData: any = {};
		if (settings.notifyApprovedSales !== undefined) {
			updateData.notifyApprovedSales = settings.notifyApprovedSales;
		}
		if (settings.notifyReviewSales !== undefined) {
			updateData.notifyReviewSales = settings.notifyReviewSales;
		}

		const updatedUser = await this.userRepository.update(userId, updateData);

		this.logger.log(
			`[AUTH] Notification settings updated - notifyApprovedSales: ${updatedUser.notifyApprovedSales}, notifyReviewSales: ${updatedUser.notifyReviewSales}`,
		);

		return {
			notifyApprovedSales: updatedUser.notifyApprovedSales,
			notifyReviewSales: updatedUser.notifyReviewSales,
		};
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
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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

	// ===== SYSTEM WARNINGS =====

	async getActiveWarningsForUser(userId: string) {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			return { warnings: [] };
		}

		const now = new Date();

		// Get all active warnings that haven't been dismissed by the user
		const warnings = await this.prisma.systemWarning.findMany({
			where: {
				isActive: true,
				OR: [
					{ startDate: null },
					{ startDate: { lte: now } },
				],
				AND: [
					{
						OR: [
							{ endDate: null },
							{ endDate: { gte: now } },
						],
					},
				],
				NOT: {
					dismissals: {
						some: { userId },
					},
				},
			},
			orderBy: [
				{ priority: 'desc' },
				{ createdAt: 'desc' },
			],
		});

		// Filter by target audience
		const filteredWarnings = warnings.filter((warning) => {
			switch (warning.targetAudience) {
				case 'ALL':
					return true;
				case 'VALIDATED_USERS':
					return user.isAccountValidated;
				case 'COMMERCE_USERS':
					return user.commerceMode;
				case 'NEW_USERS':
					// Users created in the last 7 days
					const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					return user.createdAt >= sevenDaysAgo;
				case 'ADMINS':
					return user.role === 'ADMIN';
				default:
					return true;
			}
		});

		return {
			success: true,
			warnings: filteredWarnings,
		};
	}

	async dismissWarning(userId: string, warningId: string) {
		// Check if warning exists
		const warning = await this.prisma.systemWarning.findUnique({
			where: { id: warningId },
		});

		if (!warning) {
			throw new BadRequestException('Aviso não encontrado');
		}

		if (!warning.isDismissible) {
			throw new BadRequestException('Este aviso não pode ser dispensado');
		}

		// Check if already dismissed
		const existingDismissal = await this.prisma.warningDismissal.findUnique({
			where: {
				warningId_userId: {
					warningId,
					userId,
				},
			},
		});

		if (existingDismissal) {
			return { success: true, message: 'Aviso já foi dispensado' };
		}

		// Create dismissal record
		await this.prisma.warningDismissal.create({
			data: {
				warningId,
				userId,
			},
		});

		return {
			success: true,
			message: 'Aviso dispensado com sucesso',
		};
	}
}
