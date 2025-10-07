import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../repositories/user.repository';
import { EmailService } from '../services/email.service';
import { ApiKeyUtils } from '../common/utils/api-key.util';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto, LoginDto, AuthResponseDto, CreateApiKeyDto, ForgotPasswordDto, ResetPasswordDto, VerifyResetCodeDto } from '../common/dto/auth.dto';
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
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
  ) {}

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
      [] // Will be assigned default role by the service
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

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { emailOrUsername, password } = loginDto;

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

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Generate tokens
    return this.generateAuthResponse(user);
  }

  async generateApiToken(
    userId: string, 
    createApiKeyDto: CreateApiKeyDto
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

  async getApiKeyStatus(userId: string): Promise<{ hasApiKey: boolean; createdAt?: Date }> {
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
    const refreshToken = await this.generateRefreshToken({ ...payload, type: 'refresh' });
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
      throw new UnauthorizedException('Invalid token');
    }
  }

  async validateRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
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
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        case 'm': return value * 60;
        default: return 86400; // 24 hours default
      }
    }
    
    return 86400; // 24 hours default
  }

  hasScope(scopes: string[], requiredScope: string): boolean {
    return scopes.includes('admin') || scopes.includes(requiredScope);
  }

  // ===== PASSWORD RESET METHODS =====

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;
    
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return { message: 'If an account with this email exists, a reset code has been sent.' };
    }

    // Check rate limiting (max 3 attempts per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (user.passwordResetAttempts >= 3 && user.updatedAt > oneHourAgo) {
      throw new BadRequestException('Too many password reset attempts. Please try again in 1 hour.');
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with reset code
    await this.userRepository.update(user.id, {
      passwordResetCode: resetCode,
      passwordResetExpires: expiresAt,
      passwordResetAttempts: user.passwordResetAttempts + 1,
    });

    // Send email
    try {
      await this.emailService.sendPasswordResetEmail(email, resetCode);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new BadRequestException('Failed to send reset email. Please try again.');
    }

    return { message: 'If an account with this email exists, a reset code has been sent.' };
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<{ valid: boolean; message: string }> {
    const { email, resetCode } = verifyResetCodeDto;
    
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
      return { valid: false, message: 'Invalid or expired reset code.' };
    }

    // Check if code is expired
    if (user.passwordResetExpires < new Date()) {
      return { valid: false, message: 'Reset code has expired. Please request a new one.' };
    }

    // Verify code
    if (user.passwordResetCode !== resetCode) {
      return { valid: false, message: 'Invalid reset code.' };
    }

    return { valid: true, message: 'Reset code is valid.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, resetCode, newPassword } = resetPasswordDto;
    
    const user = await this.userRepository.findByEmail(email);
    if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
      throw new BadRequestException('Invalid or expired reset code.');
    }

    // Check if code is expired
    if (user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset code has expired. Please request a new one.');
    }

    // Verify code
    if (user.passwordResetCode !== resetCode) {
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