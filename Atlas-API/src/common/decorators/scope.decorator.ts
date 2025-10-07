import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const RequireScope = (scope: string) => SetMetadata('scope', scope);
export const SCOPE_KEY = 'scope';
export const Scope = (...scopes: UserRole[]) => SetMetadata(SCOPE_KEY, scopes);