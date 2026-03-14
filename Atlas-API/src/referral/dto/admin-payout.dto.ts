import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminApprovePayoutDto {
	@ApiPropertyOptional({
		description: 'Admin notes about the approval',
	})
	@IsString()
	@IsOptional()
	adminNotes?: string;

	@ApiPropertyOptional({
		description: 'Cold wallet transaction ID after payment',
	})
	@IsString()
	@IsOptional()
	coldwalletTxId?: string;
}

export class AdminRejectPayoutDto {
	@ApiProperty({
		description: 'Reason for rejecting the payout',
	})
	@IsString()
	statusReason: string;

	@ApiPropertyOptional({
		description: 'Admin notes about the rejection',
	})
	@IsString()
	@IsOptional()
	adminNotes?: string;
}

export class AdminBlockUserDto {
	@ApiProperty({
		description: 'Reason for blocking the user from referral program',
	})
	@IsString()
	blockReason: string;
}
