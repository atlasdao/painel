import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
	@ApiProperty({
		description: 'HTTP status code',
		example: 400,
	})
	statusCode: number;

	@ApiProperty({
		description: 'Error message',
		example: 'Bad Request',
	})
	message: string;

	@ApiProperty({
		description: 'Error type/name',
		example: 'BadRequestException',
	})
	error: string;

	@ApiProperty({
		description: 'Request timestamp',
		example: new Date().toISOString(),
	})
	timestamp: string;

	@ApiProperty({
		description: 'Request path',
		example: '/api/deposit',
	})
	path: string;

	@ApiProperty({
		description: 'Request ID for tracking',
		example: 'req_abc123xyz',
	})
	requestId: string;
}

export class ValidationErrorDto extends ErrorResponseDto {
	@ApiProperty({
		description: 'Validation errors',
		example: [
			{
				field: 'amount',
				message: 'amount must be a positive number',
			},
		],
	})
	errors: ValidationErrorItem[];
}

export class ValidationErrorItem {
	@ApiProperty({
		description: 'Field name with error',
		example: 'amount',
	})
	field: string;

	@ApiProperty({
		description: 'Error message',
		example: 'amount must be a positive number',
	})
	message: string;
}
