import { IsNumber, Min, Max } from 'class-validator';

export class IncreaseCollateralPixDto {
	@IsNumber()
	@Min(1, { message: 'O valor mínimo é R$ 1,00' })
	@Max(6000, { message: 'O valor máximo é R$ 6.000,00' })
	amount: number;
}
