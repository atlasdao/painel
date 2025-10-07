import { IsString, IsOptional, IsIn, MaxLength, IsNotEmpty } from 'class-validator';

export class UpdateWalletDto {
	@IsString()
	@IsOptional()
	@MaxLength(255)
	address?: string;

	@IsString()
	@IsOptional()
	@IsIn(['LIQUID', 'PIX', 'LIGHTNING', 'ON_CHAIN'])
	type?: string;

	@IsString()
	@IsOptional()
	@MaxLength(255)
	pixKey?: string;

	// Also accept the frontend field names
	@IsString()
	@IsOptional()
	@MaxLength(255)
	defaultWalletAddress?: string;

	@IsString()
	@IsOptional()
	@IsIn(['LIQUID', 'PIX', 'LIGHTNING', 'ON_CHAIN'])
	defaultWalletType?: string;
}
