import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { CollaboratorStatus } from '@prisma/client';

export interface AccountContextRequest extends Request {
	accountContext?: {
		// ID da conta que está sendo acessada (do dono ou do colaborador atuando)
		effectiveUserId: string;
		// ID do usuário autenticado (sempre o usuário logado)
		authenticatedUserId: string;
		// Se está atuando como colaborador
		isCollaborating: boolean;
		// Role do colaborador (se aplicável)
		collaboratorRole?: 'GESTOR' | 'AUXILIAR';
		// ID do registro de colaborador (se aplicável)
		collaboratorId?: string;
	};
}

@Injectable()
export class AccountContextInterceptor implements NestInterceptor {
	private readonly logger = new Logger('AccountContext');

	constructor(private readonly prisma: PrismaService) {}

	async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
		const request = context.switchToHttp().getRequest<AccountContextRequest>();

		// Pegar headers de contexto
		const accountId = request.headers['x-account-id'] as string;
		const collaboratorId = request.headers['x-collaborator-id'] as string;
		const accountType = request.headers['x-account-type'] as string;

		// Pegar usuário autenticado do JWT
		const authenticatedUser = (request as any).user;

		if (!authenticatedUser?.sub) {
			// Sem usuário autenticado, continuar sem contexto
			return next.handle();
		}

		const authenticatedUserId = authenticatedUser.sub;

		// Se não tem headers de contexto ou é OWNER, usar conta própria
		if (!accountId || !accountType || accountType === 'OWNER' || accountId === authenticatedUserId) {
			request.accountContext = {
				effectiveUserId: authenticatedUserId,
				authenticatedUserId,
				isCollaborating: false,
			};
			return next.handle();
		}

		// Está tentando acessar como colaborador - validar permissão
		if (accountType === 'COLLABORATOR' && collaboratorId) {
			try {
				const collaboration = await this.prisma.collaborator.findFirst({
					where: {
						id: collaboratorId,
						collaboratorId: authenticatedUserId,
						accountOwnerId: accountId,
						status: CollaboratorStatus.ACTIVE,
					},
				});

				if (collaboration) {
					request.accountContext = {
						effectiveUserId: accountId, // Usa o ID do dono da conta
						authenticatedUserId,
						isCollaborating: true,
						collaboratorRole: collaboration.role as 'GESTOR' | 'AUXILIAR',
						collaboratorId: collaboration.id,
					};
					this.logger.log(`User ${authenticatedUserId} accessing account ${accountId} as ${collaboration.role}`);
				} else {
					// Colaboração não encontrada ou inválida - usar conta própria
					this.logger.warn(`Invalid collaboration attempt: user ${authenticatedUserId} -> account ${accountId}`);
					request.accountContext = {
						effectiveUserId: authenticatedUserId,
						authenticatedUserId,
						isCollaborating: false,
					};
				}
			} catch (error) {
				this.logger.error(`Error validating collaboration: ${error.message}`);
				request.accountContext = {
					effectiveUserId: authenticatedUserId,
					authenticatedUserId,
					isCollaborating: false,
				};
			}
		} else {
			request.accountContext = {
				effectiveUserId: authenticatedUserId,
				authenticatedUserId,
				isCollaborating: false,
			};
		}

		return next.handle();
	}
}
