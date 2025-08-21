"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const user_repository_1 = require("../repositories/user.repository");
const email_service_1 = require("../services/email.service");
const bcrypt = __importStar(require("bcrypt"));
const uuid_1 = require("uuid");
const client_1 = require("@prisma/client");
let AuthService = class AuthService {
    jwtService;
    configService;
    userRepository;
    emailService;
    constructor(jwtService, configService, userRepository, emailService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
    async register(registerDto) {
        const { email, username, password } = registerDto;
        const existingEmail = await this.userRepository.findByEmail(email);
        if (existingEmail) {
            throw new common_1.ConflictException('Email already registered');
        }
        const existingUsername = await this.userRepository.findByUsername(username);
        if (existingUsername) {
            throw new common_1.ConflictException('Username already taken');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userRepository.createWithRoles({
            email,
            username,
            password: hashedPassword,
        }, []);
        const authResponse = await this.generateAuthResponse(user);
        try {
            await this.emailService.sendWelcomeEmail(user.email, user.username);
        }
        catch (error) {
            console.error('Failed to send welcome email:', error);
        }
        return authResponse;
    }
    async login(loginDto) {
        const { emailOrUsername, password } = loginDto;
        let user = null;
        if (emailOrUsername.includes('@')) {
            user = await this.userRepository.findByEmail(emailOrUsername);
        }
        else {
            user = await this.userRepository.findByUsername(emailOrUsername);
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is deactivated');
        }
        await this.userRepository.updateLastLogin(user.id);
        return this.generateAuthResponse(user);
    }
    async generateApiToken(userId, createApiKeyDto) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const prefix = this.configService.get('NODE_ENV') === 'production' ? 'atlas_live' : 'atlas_dev';
        const apiKey = `${prefix}_${(0, uuid_1.v4)().replace(/-/g, '')}`;
        let expiresAt;
        if (createApiKeyDto.expirationDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + createApiKeyDto.expirationDays);
        }
        const hashedApiKey = await bcrypt.hash(apiKey, 10);
        await this.userRepository.update(userId, { apiKey: hashedApiKey });
        return {
            apiKey,
            expiresAt,
        };
    }
    async validateApiKey(apiKey) {
        const users = await this.userRepository.findActiveUsers();
        for (const user of users) {
            if (user.apiKey) {
                const isValid = await bcrypt.compare(apiKey, user.apiKey);
                if (isValid) {
                    return user;
                }
            }
        }
        throw new common_1.UnauthorizedException('Invalid API key');
    }
    async getApiKeyStatus(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return {
            hasApiKey: !!user.apiKey,
            createdAt: user.apiKey ? user.updatedAt : undefined,
        };
    }
    async revokeApiKey(userId) {
        await this.userRepository.update(userId, { apiKey: null });
    }
    async generateAuthResponse(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            username: user.username,
            roles: [user.role || client_1.UserRole.USER],
            role: user.role || client_1.UserRole.USER,
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
    async generateToken(payload) {
        return this.jwtService.sign(payload);
    }
    async generateRefreshToken(payload) {
        return this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
        });
    }
    async validateToken(token) {
        try {
            const decoded = this.jwtService.verify(token);
            return decoded;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
    async validateRefreshToken(token) {
        try {
            const decoded = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            return decoded;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async refreshAccessToken(refreshToken) {
        const payload = await this.validateRefreshToken(refreshToken);
        const user = await this.userRepository.findById(payload.sub);
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('User not found or inactive');
        }
        return this.generateAuthResponse(user);
    }
    getTokenExpiration() {
        const expiration = this.configService.get('JWT_EXPIRATION', '24h');
        const match = expiration.match(/(\d+)([hdm])/);
        if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];
            switch (unit) {
                case 'h': return value * 3600;
                case 'd': return value * 86400;
                case 'm': return value * 60;
                default: return 86400;
            }
        }
        return 86400;
    }
    hasScope(scopes, requiredScope) {
        return scopes.includes('admin') || scopes.includes(requiredScope);
    }
    async forgotPassword(forgotPasswordDto) {
        const { email } = forgotPasswordDto;
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            return { message: 'If an account with this email exists, a reset code has been sent.' };
        }
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (user.passwordResetAttempts >= 3 && user.updatedAt > oneHourAgo) {
            throw new common_1.BadRequestException('Too many password reset attempts. Please try again in 1 hour.');
        }
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await this.userRepository.update(user.id, {
            passwordResetCode: resetCode,
            passwordResetExpires: expiresAt,
            passwordResetAttempts: user.passwordResetAttempts + 1,
        });
        try {
            await this.emailService.sendPasswordResetEmail(email, resetCode);
        }
        catch (error) {
            console.error('Failed to send password reset email:', error);
            throw new common_1.BadRequestException('Failed to send reset email. Please try again.');
        }
        return { message: 'If an account with this email exists, a reset code has been sent.' };
    }
    async verifyResetCode(verifyResetCodeDto) {
        const { email, resetCode } = verifyResetCodeDto;
        const user = await this.userRepository.findByEmail(email);
        if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
            return { valid: false, message: 'Invalid or expired reset code.' };
        }
        if (user.passwordResetExpires < new Date()) {
            return { valid: false, message: 'Reset code has expired. Please request a new one.' };
        }
        if (user.passwordResetCode !== resetCode) {
            return { valid: false, message: 'Invalid reset code.' };
        }
        return { valid: true, message: 'Reset code is valid.' };
    }
    async resetPassword(resetPasswordDto) {
        const { email, resetCode, newPassword } = resetPasswordDto;
        const user = await this.userRepository.findByEmail(email);
        if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
            throw new common_1.BadRequestException('Invalid or expired reset code.');
        }
        if (user.passwordResetExpires < new Date()) {
            throw new common_1.BadRequestException('Reset code has expired. Please request a new one.');
        }
        if (user.passwordResetCode !== resetCode) {
            throw new common_1.BadRequestException('Invalid reset code.');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.userRepository.update(user.id, {
            password: hashedPassword,
            passwordResetCode: null,
            passwordResetExpires: null,
            passwordResetAttempts: 0,
        });
        return { message: 'Password has been successfully reset.' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        user_repository_1.UserRepository,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map