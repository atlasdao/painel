import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInviteDto {
	@IsString()
	@IsNotEmpty()
	token: string;
}

export class AcceptInviteRegisterDto {
	@IsString()
	@IsNotEmpty()
	token: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	@MaxLength(30)
	username: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	@MaxLength(128)
	password: string;
}
