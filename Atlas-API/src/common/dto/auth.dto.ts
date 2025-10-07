import {
	IsEmail,
	IsString,
	MinLength,
	IsOptional,
	IsArray,
	IsUUID,
	Matches,
	IsNotEmpty,
	Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
	@ApiProperty({
		description: 'User email address',
		example: 'user@example.com',
	})
	@IsEmail()
	@Transform(({ value }) => value?.toLowerCase().trim())
	email: string;

	@ApiProperty({
		description: 'Username (alphanumeric and underscore only)',
		example: 'john_doe',
	})
	@IsString()
	@Matches(/^[a-zA-Z0-9_]+$/, {
		message: 'Username can only contain letters, numbers, and underscores',
	})
	@Transform(({ value }) => value?.trim())
	username: string;

	@ApiProperty({
		description: 'User password (minimum 8 characters)',
		example: 'StrongP@ssw0rd',
	})
	@IsString()
	@MinLength(8)
	password: string;
}

export class LoginDto {
	@ApiProperty({
		description: 'Email or username',
		example: 'user@example.com',
	})
	@IsString()
	@Transform(({ value }) => value?.trim())
	emailOrUsername: string;

	@ApiProperty({
		description: 'User password',
		example: 'StrongP@ssw0rd',
	})
	@IsString()
	password: string;

	@ApiPropertyOptional({
		description: '2FA token (6 digits)',
		example: '123456',
	})
	@IsOptional()
	@IsString()
	@Length(6, 6)
	@Matches(/^\d{6}$/, { message: '2FA token must be 6 digits' })
	twoFactorToken?: string;
}

export class UserResponseDto {
	@ApiProperty({
		description: 'User ID',
		example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
	})
	id: string;

	@ApiProperty({
		description: 'User email',
		example: 'user@example.com',
	})
	email: string;

	@ApiProperty({
		description: 'Username',
		example: 'john_doe',
	})
	username: string;

	@ApiPropertyOptional({
		description: 'API key for external authentication',
		example: 'atlas_abc123xyz456...',
	})
	apiKey?: string;

	@ApiProperty({
		description: 'User roles',
		isArray: true,
		example: ['user', 'admin'],
	})
	roles: string[];

	@ApiPropertyOptional({
		description: 'User role',
		example: 'admin',
	})
	role?: string;

	@ApiProperty({
		description: 'Account active status',
		example: true,
	})
	isActive: boolean;

	@ApiProperty({
		description: 'Account creation date',
		example: new Date(),
	})
	createdAt: Date;

	@ApiPropertyOptional({
		description: 'Last login date',
		example: new Date(),
	})
	lastLoginAt?: Date;

	@ApiPropertyOptional({
		description: 'Profile picture base64 data',
		example: 'data:image/png;base64,...',
	})
	profilePicture?: string | null;

	@ApiPropertyOptional({
		description: 'Two factor authentication enabled',
		example: false,
	})
	twoFactorEnabled?: boolean;

	@ApiPropertyOptional({
		description: 'Default wallet address',
		example:
			'lq1qqv5mhqqktx8hlwq56qf77ja7lmlksqyx0dmz0xtwvxspk4dlzv54thqegpqyd92fczshfjev66554rc3xz6e54djt63gjh8mn',
	})
	defaultWalletAddress?: string | null;

	@ApiPropertyOptional({
		description: 'Default wallet type',
		example: 'LIQUID',
	})
	defaultWalletType?: string | null;

	@ApiProperty({
		description: 'Commerce mode enabled status',
		example: false,
	})
	commerceMode: boolean;

	@ApiPropertyOptional({
		description: 'Commerce mode activation date',
		example: new Date(),
	})
	commerceModeActivatedAt?: Date | null;
}

export class AuthResponseDto {
	@ApiProperty({
		description: 'JWT access token',
		example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
	})
	accessToken: string;

	@ApiProperty({
		description: 'Token type',
		example: 'Bearer',
	})
	tokenType: string = 'Bearer';

	@ApiProperty({
		description: 'Token expiration time in seconds',
		example: 86400,
	})
	expiresIn: number;

	@ApiProperty({
		description: 'User information',
	})
	user: UserResponseDto;
}

export class TwoFactorAuthRequiredDto {
	@ApiProperty({
		description: 'Indicates that 2FA is required',
		example: true,
	})
	requiresTwoFactor: boolean = true;

	@ApiProperty({
		description: 'User email for reference',
		example: 'user@example.com',
	})
	email: string;

	@ApiProperty({
		description: 'Message for the user',
		example: '2FA verification required',
	})
	message: string = '2FA verification required';
}

export class ChangePasswordDto {
	@ApiProperty({
		description: 'Current password',
		example: 'CurrentP@ssw0rd',
	})
	@IsString()
	currentPassword: string;

	@ApiProperty({
		description: 'New password (minimum 8 characters)',
		example: 'NewStr0ngP@ssw0rd',
	})
	@IsString()
	@MinLength(8)
	newPassword: string;
}

export class CreateApiKeyDto {
	@ApiPropertyOptional({
		description: 'API key name/label',
		example: 'Production API Key',
	})
	@IsOptional()
	@IsString()
	name?: string;

	@ApiPropertyOptional({
		description: 'API key expiration in days',
		example: 365,
	})
	@IsOptional()
	expirationDays?: number;
}

export class ApiKeyResponseDto {
	@ApiProperty({
		description: 'Generated API key',
		example: 'atlas_abc123xyz456...',
	})
	apiKey: string;

	@ApiPropertyOptional({
		description: 'API key name',
		example: 'Production API Key',
	})
	name?: string;

	@ApiProperty({
		description: 'Creation date',
		example: new Date(),
	})
	createdAt: Date;

	@ApiPropertyOptional({
		description: 'Expiration date',
		example: new Date(),
	})
	expiresAt?: Date;
}

export class RefreshTokenDto {
	@ApiProperty({
		description: 'Refresh token',
		example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
	})
	@IsString()
	refreshToken: string;
}

export class ValidateTokenDto {
	@ApiProperty({
		description: 'JWT token to validate',
		example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
	})
	@IsString()
	token: string;
}

export class ForgotPasswordDto {
	@ApiProperty({
		description: 'Email address to send reset code',
		example: 'user@example.com',
	})
	@IsEmail()
	@IsNotEmpty()
	@Transform(({ value }) => value?.toLowerCase().trim())
	email: string;
}

export class ResetPasswordDto {
	@ApiProperty({
		description: 'Email address',
		example: 'user@example.com',
	})
	@IsEmail()
	@IsNotEmpty()
	@Transform(({ value }) => value?.toLowerCase().trim())
	email: string;

	@ApiProperty({
		description: '6-digit reset code',
		example: '123456',
	})
	@IsString()
	@IsNotEmpty()
	@Length(6, 6)
	@Matches(/^\d{6}$/, { message: 'Reset code must be 6 digits' })
	resetCode: string;

	@ApiProperty({
		description: 'New password',
		example: 'NewPassword123!',
	})
	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
		message:
			'Password must contain at least one lowercase letter, one uppercase letter, one number and one special character',
	})
	newPassword: string;
}

export class VerifyResetCodeDto {
	@ApiProperty({
		description: 'Email address',
		example: 'user@example.com',
	})
	@IsEmail()
	@IsNotEmpty()
	@Transform(({ value }) => value?.toLowerCase().trim())
	email: string;

	@ApiProperty({
		description: '6-digit reset code',
		example: '123456',
	})
	@IsString()
	@IsNotEmpty()
	@Length(6, 6)
	@Matches(/^\d{6}$/, { message: 'Reset code must be 6 digits' })
	resetCode: string;
}
