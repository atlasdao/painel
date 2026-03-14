import { IsString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CustomizeShortCodeDto {
	@ApiProperty({
		description: 'Custom shortcode for referral link (5-15 chars, lowercase alphanumeric and hyphens)',
		example: 'joao123',
		minLength: 5,
		maxLength: 15,
	})
	@IsString()
	@Length(5, 15, { message: 'Shortcode deve ter entre 5 e 15 caracteres' })
	@Matches(/^[a-z0-9-]+$/, {
		message: 'Shortcode deve conter apenas letras minusculas, numeros e hifens',
	})
	shortCode: string;
}
