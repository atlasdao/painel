import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPayoutDto {
	@ApiProperty({
		description: 'Liquid Network address for receiving the commission payment',
		example: 'VJL...',
	})
	@IsString()
	@IsNotEmpty({ message: 'Endereco Liquid e obrigatorio' })
	liquidAddress: string;
}
