import {
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	IsBoolean,
	Min,
	Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PixKeyType } from '@prisma/client';

export class CreateWithdrawalDto {
	@ApiProperty({ description: 'Valor que deseja receber em BRL via PIX', example: 100.0 })
	@IsNumber()
	@Min(2)
	amount: number;

	@ApiProperty({ description: 'Chave PIX do recebedor' })
	@IsString()
	pixKey: string;

	@ApiProperty({ description: 'Tipo da chave PIX', enum: PixKeyType })
	@IsEnum(PixKeyType)
	pixKeyType: PixKeyType;

	@ApiProperty({ description: 'CPF ou CNPJ do recebedor', required: false })
	@IsOptional()
	@IsString()
	cpfCnpj?: string;

	@ApiProperty({ description: 'Nome completo do recebedor', required: false })
	@IsOptional()
	@IsString()
	fullName?: string;

	@ApiProperty({ description: 'Código de cupom de desconto', required: false })
	@IsOptional()
	@IsString()
	couponCode?: string;

	@ApiProperty({ description: 'Salvar chave PIX para futuros saques', required: false })
	@IsOptional()
	@IsBoolean()
	savePixKey?: boolean;
}
