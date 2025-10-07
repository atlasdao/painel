import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class Setup2FADto {
	@IsString()
	@IsNotEmpty()
	@Length(6, 6)
	token: string;
}

export class Verify2FADto {
	@IsString()
	@IsNotEmpty()
	@Length(6, 6)
	token: string;
}

export class Enable2FADto {
	@IsString()
	@IsNotEmpty()
	secret: string;

	@IsString()
	@IsNotEmpty()
	@Length(6, 6)
	token: string;
}

export class Disable2FADto {
	@IsString()
	@IsNotEmpty()
	@Length(6, 6)
	token: string;

	@IsString()
	@IsOptional()
	password?: string;
}
