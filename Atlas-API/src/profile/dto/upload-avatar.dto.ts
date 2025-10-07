import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class UploadAvatarDto {
	@IsString()
	@IsOptional()
	@IsUrl()
	@MaxLength(500)
	avatarUrl?: string;

	@IsString()
	@IsOptional()
	@MaxLength(6815744) // 5MB max for images (approximately 6.7MB in base64)
	avatarData?: string;

	@IsString()
	@IsOptional()
	@MaxLength(100)
	mimeType?: string;
}

export class UpdateProfileDto {
	@IsString()
	@IsOptional()
	@MaxLength(100)
	username?: string;

	@IsString()
	@IsOptional()
	@MaxLength(255)
	email?: string;

	@IsString()
	@IsOptional()
	@MaxLength(500)
	profilePicture?: string;

	@IsString()
	@IsOptional()
	@MaxLength(255)
	defaultWalletAddress?: string;

	@IsString()
	@IsOptional()
	defaultWalletType?: 'LIQUID' | 'LIGHTNING' | 'ON_CHAIN';
}
