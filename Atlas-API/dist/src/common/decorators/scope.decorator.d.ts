import { UserRole } from '@prisma/client';
export declare const RequireScope: (scope: string) => import("@nestjs/common").CustomDecorator<string>;
export declare const SCOPE_KEY = "scope";
export declare const Scope: (...scopes: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
