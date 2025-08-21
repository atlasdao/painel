import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../repositories/user.repository';
import { EmailService } from '../services/email.service';
import { RegisterDto, LoginDto, AuthResponseDto, CreateApiKeyDto, ForgotPasswordDto, ResetPasswordDto, VerifyResetCodeDto } from '../common/dto/auth.dto';
import { User } from '@prisma/client';
export interface JwtPayload {
    sub: string;
    email: string;
    username: string;
    roles: string[];
    role?: string;
    type: 'access' | 'refresh' | 'api';
}
export declare class AuthService {
    private readonly jwtService;
    private readonly configService;
    private readonly userRepository;
    private readonly emailService;
    constructor(jwtService: JwtService, configService: ConfigService, userRepository: UserRepository, emailService: EmailService);
    register(registerDto: RegisterDto): Promise<AuthResponseDto>;
    login(loginDto: LoginDto): Promise<AuthResponseDto>;
    generateApiToken(userId: string, createApiKeyDto: CreateApiKeyDto): Promise<{
        apiKey: string;
        expiresAt?: Date;
    }>;
    validateApiKey(apiKey: string): Promise<User>;
    getApiKeyStatus(userId: string): Promise<{
        hasApiKey: boolean;
        createdAt?: Date;
    }>;
    revokeApiKey(userId: string): Promise<void>;
    private generateAuthResponse;
    generateToken(payload: JwtPayload): Promise<string>;
    generateRefreshToken(payload: JwtPayload): Promise<string>;
    validateToken(token: string): Promise<JwtPayload>;
    validateRefreshToken(token: string): Promise<JwtPayload>;
    refreshAccessToken(refreshToken: string): Promise<AuthResponseDto>;
    private getTokenExpiration;
    hasScope(scopes: string[], requiredScope: string): boolean;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<{
        valid: boolean;
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
