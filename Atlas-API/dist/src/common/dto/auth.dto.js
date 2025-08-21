"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyResetCodeDto = exports.ResetPasswordDto = exports.ForgotPasswordDto = exports.ValidateTokenDto = exports.RefreshTokenDto = exports.ApiKeyResponseDto = exports.CreateApiKeyDto = exports.ChangePasswordDto = exports.AuthResponseDto = exports.UserResponseDto = exports.LoginDto = exports.RegisterDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class RegisterDto {
    email;
    username;
    password;
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User email address',
        example: 'user@example.com',
    }),
    (0, class_validator_1.IsEmail)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.toLowerCase().trim()),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Username (alphanumeric and underscore only)',
        example: 'john_doe',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_]+$/, {
        message: 'Username can only contain letters, numbers, and underscores',
    }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], RegisterDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User password (minimum 8 characters)',
        example: 'StrongP@ssw0rd',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
class LoginDto {
    emailOrUsername;
    password;
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Email or username',
        example: 'user@example.com',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], LoginDto.prototype, "emailOrUsername", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User password',
        example: 'StrongP@ssw0rd',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class UserResponseDto {
    id;
    email;
    username;
    apiKey;
    roles;
    role;
    isActive;
    createdAt;
    lastLoginAt;
}
exports.UserResponseDto = UserResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User email',
        example: 'user@example.com',
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Username',
        example: 'john_doe',
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'API key for external authentication',
        example: 'atlas_live_abc123xyz456...',
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "apiKey", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User roles',
        isArray: true,
        example: ['user', 'admin'],
    }),
    __metadata("design:type", Array)
], UserResponseDto.prototype, "roles", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'User role',
        example: 'admin',
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Account active status',
        example: true,
    }),
    __metadata("design:type", Boolean)
], UserResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Account creation date',
        example: new Date(),
    }),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Last login date',
        example: new Date(),
    }),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "lastLoginAt", void 0);
class AuthResponseDto {
    accessToken;
    tokenType = 'Bearer';
    expiresIn;
    user;
}
exports.AuthResponseDto = AuthResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'JWT access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    __metadata("design:type", String)
], AuthResponseDto.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Token type',
        example: 'Bearer',
    }),
    __metadata("design:type", String)
], AuthResponseDto.prototype, "tokenType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Token expiration time in seconds',
        example: 86400,
    }),
    __metadata("design:type", Number)
], AuthResponseDto.prototype, "expiresIn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User information',
    }),
    __metadata("design:type", UserResponseDto)
], AuthResponseDto.prototype, "user", void 0);
class ChangePasswordDto {
    currentPassword;
    newPassword;
}
exports.ChangePasswordDto = ChangePasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Current password',
        example: 'CurrentP@ssw0rd',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'New password (minimum 8 characters)',
        example: 'NewStr0ngP@ssw0rd',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
class CreateApiKeyDto {
    name;
    expirationDays;
}
exports.CreateApiKeyDto = CreateApiKeyDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'API key name/label',
        example: 'Production API Key',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateApiKeyDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'API key expiration in days',
        example: 365,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateApiKeyDto.prototype, "expirationDays", void 0);
class ApiKeyResponseDto {
    apiKey;
    name;
    createdAt;
    expiresAt;
}
exports.ApiKeyResponseDto = ApiKeyResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Generated API key',
        example: 'atlas_live_abc123xyz456...',
    }),
    __metadata("design:type", String)
], ApiKeyResponseDto.prototype, "apiKey", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'API key name',
        example: 'Production API Key',
    }),
    __metadata("design:type", String)
], ApiKeyResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Creation date',
        example: new Date(),
    }),
    __metadata("design:type", Date)
], ApiKeyResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Expiration date',
        example: new Date(),
    }),
    __metadata("design:type", Date)
], ApiKeyResponseDto.prototype, "expiresAt", void 0);
class RefreshTokenDto {
    refreshToken;
}
exports.RefreshTokenDto = RefreshTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Refresh token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RefreshTokenDto.prototype, "refreshToken", void 0);
class ValidateTokenDto {
    token;
}
exports.ValidateTokenDto = ValidateTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'JWT token to validate',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateTokenDto.prototype, "token", void 0);
class ForgotPasswordDto {
    email;
}
exports.ForgotPasswordDto = ForgotPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Email address to send reset code',
        example: 'user@example.com'
    }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.toLowerCase().trim()),
    __metadata("design:type", String)
], ForgotPasswordDto.prototype, "email", void 0);
class ResetPasswordDto {
    email;
    resetCode;
    newPassword;
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Email address',
        example: 'user@example.com'
    }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.toLowerCase().trim()),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '6-digit reset code',
        example: '123456'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(6, 6),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'Reset code must be 6 digits' }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "resetCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'New password',
        example: 'NewPassword123!'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain at least one lowercase letter, one uppercase letter, one number and one special character',
    }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "newPassword", void 0);
class VerifyResetCodeDto {
    email;
    resetCode;
}
exports.VerifyResetCodeDto = VerifyResetCodeDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Email address',
        example: 'user@example.com'
    }),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.toLowerCase().trim()),
    __metadata("design:type", String)
], VerifyResetCodeDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '6-digit reset code',
        example: '123456'
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(6, 6),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'Reset code must be 6 digits' }),
    __metadata("design:type", String)
], VerifyResetCodeDto.prototype, "resetCode", void 0);
//# sourceMappingURL=auth.dto.js.map