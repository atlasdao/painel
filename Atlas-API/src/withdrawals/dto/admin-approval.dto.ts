import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminApprovalDto {
	@ApiProperty({ description: 'Approve or reject the withdrawal' })
	@IsBoolean()
	approve: boolean;

	@ApiProperty({ description: 'Admin notes', required: false })
	@IsOptional()
	@IsString()
	adminNotes?: string;

	@ApiProperty({ description: 'Reason for rejection', required: false })
	@IsOptional()
	@IsString()
	statusReason?: string;

	@ApiProperty({ description: 'Coldwallet transaction ID', required: false })
	@IsOptional()
	@IsString()
	coldwalletTxId?: string;
}
