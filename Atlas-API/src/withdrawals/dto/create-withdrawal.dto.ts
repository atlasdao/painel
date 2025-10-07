import {
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	IsBoolean,
	Min,
	ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WithdrawalMethod, PixKeyType } from '@prisma/client';

export class CreateWithdrawalDto {
	@ApiProperty({ description: 'Amount to withdraw', example: 100.0 })
	@IsNumber()
	@Min(10)
	amount: number;

	@ApiProperty({ description: 'Withdrawal method', enum: WithdrawalMethod })
	@IsEnum(WithdrawalMethod)
	method: WithdrawalMethod;

	@ApiProperty({ description: 'PIX key for PIX withdrawals', required: false })
	@ValidateIf((o) => o.method === WithdrawalMethod.PIX)
	@IsString()
	pixKey?: string;

	@ApiProperty({
		description: 'PIX key type',
		enum: PixKeyType,
		required: false,
	})
	@ValidateIf((o) => o.method === WithdrawalMethod.PIX)
	@IsEnum(PixKeyType)
	pixKeyType?: PixKeyType;

	@ApiProperty({
		description: 'Liquid address for DePix withdrawals',
		required: false,
	})
	@ValidateIf((o) => o.method === WithdrawalMethod.DEPIX)
	@IsString()
	liquidAddress?: string;

	@ApiProperty({ description: 'CPF/CNPJ for verification', required: false })
	@IsOptional()
	@IsString()
	cpfCnpj?: string;

	@ApiProperty({ description: 'Full name for verification', required: false })
	@IsOptional()
	@IsString()
	fullName?: string;

	@ApiProperty({ description: 'Discount coupon code', required: false })
	@IsOptional()
	@IsString()
	couponCode?: string;

	@ApiProperty({ description: 'Save PIX key for future withdrawals', required: false })
	@IsOptional()
	@IsBoolean()
	savePixKey?: boolean;
}
