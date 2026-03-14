import { IsNumber, IsString, Min, Max, MinLength } from 'class-validator';

export class DecreaseCollateralDto {
	@IsNumber()
	@Min(1, { message: 'O valor mínimo é R$ 1,00' })
	@Max(6000, { message: 'O valor máximo é R$ 6.000,00' })
	amount: number;

	@IsString()
	@MinLength(10, { message: 'Endereço Liquid inválido' })
	liquidAddress: string;
}
