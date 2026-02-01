import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { CollaboratorRole } from '@prisma/client';

export class InviteCollaboratorDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(2)
	@MaxLength(100)
	name: string;

	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsEnum(CollaboratorRole)
	@IsNotEmpty()
	role: CollaboratorRole;
}
