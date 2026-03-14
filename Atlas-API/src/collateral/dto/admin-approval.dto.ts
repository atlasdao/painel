import { IsString, IsOptional } from 'class-validator';

export class AdminApproveWithdrawalDto {
	@IsString()
	@IsOptional()
	coldwalletTxId?: string;

	@IsString()
	@IsOptional()
	adminNotes?: string;
}

export class AdminRejectWithdrawalDto {
	@IsString()
	adminNotes: string;
}
