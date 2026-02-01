import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccountContextRequest } from '../interceptors/account-context.interceptor';

/**
 * Decorator para extrair o ID do usuário efetivo (considerando contexto de colaborador).
 *
 * Se o usuário está atuando como colaborador, retorna o ID do dono da conta.
 * Caso contrário, retorna o ID do usuário autenticado.
 *
 * Uso:
 * ```
 * @Get('data')
 * getData(@EffectiveUserId() userId: string) {
 *   return this.service.getData(userId);
 * }
 * ```
 */
export const EffectiveUserId = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): string => {
		const request = ctx.switchToHttp().getRequest<AccountContextRequest>();

		// Se tem contexto de conta, usar o effectiveUserId
		if (request.accountContext?.effectiveUserId) {
			return request.accountContext.effectiveUserId;
		}

		// Fallback para o usuário autenticado
		const user = (request as any).user;
		return user?.sub || user?.id;
	},
);

/**
 * Decorator para extrair o ID do usuário autenticado (sempre o usuário logado).
 * Útil para operações que precisam do usuário real, não do contexto.
 */
export const AuthenticatedUserId = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): string => {
		const request = ctx.switchToHttp().getRequest<AccountContextRequest>();

		// Sempre retorna o usuário autenticado
		if (request.accountContext?.authenticatedUserId) {
			return request.accountContext.authenticatedUserId;
		}

		const user = (request as any).user;
		return user?.sub || user?.id;
	},
);

/**
 * Decorator para verificar se o usuário está colaborando.
 */
export const IsCollaborating = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): boolean => {
		const request = ctx.switchToHttp().getRequest<AccountContextRequest>();
		return request.accountContext?.isCollaborating || false;
	},
);

/**
 * Decorator para obter o role do colaborador (se aplicável).
 */
export const CollaboratorRole = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): 'GESTOR' | 'AUXILIAR' | null => {
		const request = ctx.switchToHttp().getRequest<AccountContextRequest>();
		return request.accountContext?.collaboratorRole || null;
	},
);

/**
 * Helper function para extrair o effective user ID de um request.
 * Útil quando você já tem o request object.
 */
export function getEffectiveUserId(request: any): string {
	if (request.accountContext?.effectiveUserId) {
		return request.accountContext.effectiveUserId;
	}
	return request.user?.sub || request.user?.id;
}

/**
 * Helper function para obter o contexto completo do colaborador.
 */
export function getCollaboratorContext(request: any): {
	isCollaborating: boolean;
	role: 'GESTOR' | 'AUXILIAR' | null;
	effectiveUserId: string;
	authenticatedUserId: string;
} {
	const accountContext = request.accountContext;
	const userId = request.user?.sub || request.user?.id;

	return {
		isCollaborating: accountContext?.isCollaborating || false,
		role: accountContext?.collaboratorRole || null,
		effectiveUserId: accountContext?.effectiveUserId || userId,
		authenticatedUserId: accountContext?.authenticatedUserId || userId,
	};
}

/**
 * Helper function para verificar se colaborador AUXILIAR está tentando usar carteira personalizada.
 * Retorna true se a operação deve ser bloqueada.
 */
export function isAuxiliarUsingCustomWallet(
	request: any,
	walletAddress: string | undefined,
	ownerDefaultWallet: string | undefined,
): boolean {
	const context = getCollaboratorContext(request);

	// Se não é colaborador ou é GESTOR, permite qualquer carteira
	if (!context.isCollaborating || context.role !== 'AUXILIAR') {
		return false;
	}

	// Se é AUXILIAR e está tentando usar carteira diferente da padrão, bloqueia
	if (walletAddress && ownerDefaultWallet && walletAddress !== ownerDefaultWallet) {
		return true;
	}

	return false;
}
