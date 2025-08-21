export declare class RegisterDto {
    email: string;
    username: string;
    password: string;
}
export declare class LoginDto {
    emailOrUsername: string;
    password: string;
}
export declare class UserResponseDto {
    id: string;
    email: string;
    username: string;
    apiKey?: string;
    roles: string[];
    role?: string;
    isActive: boolean;
    createdAt: Date;
    lastLoginAt?: Date;
}
export declare class AuthResponseDto {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    user: UserResponseDto;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export declare class CreateApiKeyDto {
    name?: string;
    expirationDays?: number;
}
export declare class ApiKeyResponseDto {
    apiKey: string;
    name?: string;
    createdAt: Date;
    expiresAt?: Date;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class ValidateTokenDto {
    token: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    email: string;
    resetCode: string;
    newPassword: string;
}
export declare class VerifyResetCodeDto {
    email: string;
    resetCode: string;
}
