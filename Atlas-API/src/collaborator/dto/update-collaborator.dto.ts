import { IsEnum, IsNotEmpty } from 'class-validator';
import { CollaboratorRole } from '@prisma/client';

export class UpdateCollaboratorRoleDto {
	@IsEnum(CollaboratorRole)
	@IsNotEmpty()
	role: CollaboratorRole;
}
