import {
	Injectable,
	BadRequestException,
	NotFoundException,
	ForbiddenException,
	ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../services/email.service';
import { CollaboratorRole, CollaboratorStatus } from '@prisma/client';
import { InviteCollaboratorDto, AcceptInviteRegisterDto, UpdateCollaboratorRoleDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

// Permissões do sistema
export enum Permission {
	// Dashboard
	VIEW_DASHBOARD = 'VIEW_DASHBOARD',
	VIEW_BALANCE = 'VIEW_BALANCE', // Ver saldos (disponível, pendente, total)

	// Transações
	VIEW_TRANSACTIONS = 'VIEW_TRANSACTIONS',

	// QR Code / Cobranças
	CREATE_QR_CODE = 'CREATE_QR_CODE',
	CREATE_QR_CODE_CUSTOM_WALLET = 'CREATE_QR_CODE_CUSTOM_WALLET',

	// Payment Links
	VIEW_PAYMENT_LINKS = 'VIEW_PAYMENT_LINKS',
	CREATE_PAYMENT_LINK = 'CREATE_PAYMENT_LINK',
	EDIT_PAYMENT_LINK = 'EDIT_PAYMENT_LINK',
	DELETE_PAYMENT_LINK = 'DELETE_PAYMENT_LINK',

	// Webhooks
	VIEW_WEBHOOKS = 'VIEW_WEBHOOKS',
	MANAGE_WEBHOOKS = 'MANAGE_WEBHOOKS',

	// API Key
	VIEW_API_KEY = 'VIEW_API_KEY',
	MANAGE_API_KEY = 'MANAGE_API_KEY',

	// Configurações
	VIEW_SETTINGS = 'VIEW_SETTINGS',
	EDIT_SETTINGS = 'EDIT_SETTINGS',
	EDIT_WALLET = 'EDIT_WALLET', // Editar carteira padrão
	EDIT_SECURITY = 'EDIT_SECURITY',

	// Colaboradores
	MANAGE_COLLABORATORS = 'MANAGE_COLLABORATORS',
}

// Permissões por cargo
const ROLE_PERMISSIONS: Record<CollaboratorRole | 'OWNER', Permission[]> = {
	OWNER: Object.values(Permission), // Dono tem todas as permissões

	GESTOR: [
		Permission.VIEW_DASHBOARD,
		Permission.VIEW_BALANCE, // Gestor pode ver saldos
		Permission.VIEW_TRANSACTIONS,
		Permission.CREATE_QR_CODE,
		Permission.CREATE_QR_CODE_CUSTOM_WALLET,
		Permission.VIEW_PAYMENT_LINKS,
		Permission.CREATE_PAYMENT_LINK,
		Permission.EDIT_PAYMENT_LINK,
		Permission.DELETE_PAYMENT_LINK,
		Permission.VIEW_WEBHOOKS,
		Permission.MANAGE_WEBHOOKS,
		Permission.VIEW_API_KEY,
		Permission.VIEW_SETTINGS,
		// GESTOR não pode EDIT_WALLET nem EDIT_SECURITY
	],

	AUXILIAR: [
		Permission.VIEW_DASHBOARD,
		// AUXILIAR NÃO pode VIEW_BALANCE - não vê saldos financeiros
		Permission.VIEW_TRANSACTIONS,
		Permission.CREATE_QR_CODE,
		// AUXILIAR NÃO pode CREATE_QR_CODE_CUSTOM_WALLET
		Permission.VIEW_PAYMENT_LINKS,
		Permission.CREATE_PAYMENT_LINK,
		Permission.VIEW_SETTINGS,
		// AUXILIAR NÃO pode EDIT_SETTINGS, EDIT_WALLET, EDIT_SECURITY
	],
};

export interface CollaboratorContext {
	type: 'OWNER' | 'COLLABORATOR';
	accountId: string;
	accountName: string;
	collaboratorId?: string;
	role: CollaboratorRole | 'OWNER';
	permissions: Permission[];
}

@Injectable()
export class CollaboratorService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
		private readonly jwtService: JwtService,
		private readonly emailService: EmailService,
	) {}

	// Retorna as permissões de um cargo
	getPermissionsForRole(role: CollaboratorRole | 'OWNER'): Permission[] {
		return ROLE_PERMISSIONS[role] || [];
	}

	// Verifica se um cargo tem uma permissão
	hasPermission(role: CollaboratorRole | 'OWNER', permission: Permission): boolean {
		return this.getPermissionsForRole(role).includes(permission);
	}

	// Envia convite para colaborador
	async inviteCollaborator(ownerId: string, dto: InviteCollaboratorDto) {
		const owner = await this.prisma.user.findUnique({
			where: { id: ownerId },
			select: { id: true, email: true, username: true },
		});

		if (!owner) {
			throw new NotFoundException('Usuário não encontrado');
		}

		const normalizedEmail = dto.email.toLowerCase().trim();

		// Não pode convidar a si mesmo
		if (owner.email.toLowerCase() === normalizedEmail) {
			throw new BadRequestException('Você não pode convidar a si mesmo');
		}

		// Verificar limite de colaboradores (máximo 10)
		const existingCount = await this.prisma.collaborator.count({
			where: {
				accountOwnerId: ownerId,
				status: { in: [CollaboratorStatus.PENDING, CollaboratorStatus.ACTIVE] },
			},
		});

		if (existingCount >= 10) {
			throw new BadRequestException('Limite máximo de 10 colaboradores atingido');
		}

		// Verificar se já existe qualquer registro para este email (incluindo REVOKED)
		const existingInvite = await this.prisma.collaborator.findFirst({
			where: {
				accountOwnerId: ownerId,
				invitedEmail: normalizedEmail,
			},
		});

		// Gerar token de convite
		const inviteToken = uuidv4();
		const inviteExpires = new Date();
		inviteExpires.setDate(inviteExpires.getDate() + 7); // 7 dias

		let collaborator;

		if (existingInvite) {
			// Se já está ACTIVE, erro
			if (existingInvite.status === CollaboratorStatus.ACTIVE) {
				throw new ConflictException('Este email já tem acesso à sua conta');
			}

			// Se está PENDING, erro
			if (existingInvite.status === CollaboratorStatus.PENDING) {
				throw new ConflictException('Já existe um convite pendente para este email');
			}

			// Se está REVOKED, reativar o convite
			collaborator = await this.prisma.collaborator.update({
				where: { id: existingInvite.id },
				data: {
					invitedName: dto.name,
					role: dto.role,
					status: CollaboratorStatus.PENDING,
					inviteToken,
					inviteExpires,
					collaboratorId: null, // Limpar referência antiga
					acceptedAt: null,
					revokedAt: null,
				},
			});
		} else {
			// Criar novo convite
			collaborator = await this.prisma.collaborator.create({
				data: {
					accountOwnerId: ownerId,
					invitedEmail: normalizedEmail,
					invitedName: dto.name,
					role: dto.role,
					inviteToken,
					inviteExpires,
				},
			});
		}

		// Enviar email de convite
		await this.sendInviteEmail(normalizedEmail, dto.name, owner.username, dto.role, inviteToken);

		// Gerar link de convite para exibição no painel
		const baseUrl = this.configService.get<string>('FRONTEND_URL', 'https://painel.atlasdao.info');
		const inviteLink = `${baseUrl}/invite/${inviteToken}`;

		return {
			id: collaborator.id,
			invitedEmail: collaborator.invitedEmail,
			invitedName: collaborator.invitedName,
			role: collaborator.role,
			status: collaborator.status,
			createdAt: collaborator.createdAt,
			inviteExpires: collaborator.inviteExpires,
			inviteLink, // Link para copiar e enviar manualmente
		};
	}

	// Listar colaboradores de uma conta (exclui REVOKED)
	async listCollaborators(ownerId: string) {
		const collaborators = await this.prisma.collaborator.findMany({
			where: {
				accountOwnerId: ownerId,
				status: { in: [CollaboratorStatus.PENDING, CollaboratorStatus.ACTIVE] },
			},
			include: {
				collaborator: {
					select: {
						id: true,
						username: true,
						email: true,
						profilePicture: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		const baseUrl = this.configService.get<string>('FRONTEND_URL', 'https://painel.atlasdao.info');

		return collaborators.map((c) => ({
			id: c.id,
			invitedEmail: c.invitedEmail,
			invitedName: c.invitedName,
			role: c.role,
			status: c.status,
			createdAt: c.createdAt,
			acceptedAt: c.acceptedAt,
			revokedAt: c.revokedAt,
			inviteExpires: c.inviteExpires,
			// Incluir link de convite apenas para convites pendentes
			inviteLink: c.status === CollaboratorStatus.PENDING ? `${baseUrl}/invite/${c.inviteToken}` : undefined,
			collaborator: c.collaborator
				? {
						id: c.collaborator.id,
						username: c.collaborator.username,
						email: c.collaborator.email,
						profilePicture: c.collaborator.profilePicture,
					}
				: null,
		}));
	}

	// Atualizar cargo do colaborador
	async updateCollaboratorRole(ownerId: string, collaboratorId: string, dto: UpdateCollaboratorRoleDto) {
		const collaborator = await this.prisma.collaborator.findFirst({
			where: {
				id: collaboratorId,
				accountOwnerId: ownerId,
				status: CollaboratorStatus.ACTIVE,
			},
		});

		if (!collaborator) {
			throw new NotFoundException('Colaborador não encontrado');
		}

		const updated = await this.prisma.collaborator.update({
			where: { id: collaboratorId },
			data: { role: dto.role },
		});

		return {
			id: updated.id,
			role: updated.role,
			message: 'Cargo atualizado com sucesso',
		};
	}

	// Revogar acesso do colaborador
	async revokeCollaborator(ownerId: string, collaboratorId: string) {
		const collaborator = await this.prisma.collaborator.findFirst({
			where: {
				id: collaboratorId,
				accountOwnerId: ownerId,
				status: { in: [CollaboratorStatus.PENDING, CollaboratorStatus.ACTIVE] },
			},
		});

		if (!collaborator) {
			throw new NotFoundException('Colaborador não encontrado');
		}

		await this.prisma.collaborator.update({
			where: { id: collaboratorId },
			data: {
				status: CollaboratorStatus.REVOKED,
				revokedAt: new Date(),
			},
		});

		return { message: 'Acesso revogado com sucesso' };
	}

	// Reenviar convite
	async resendInvite(ownerId: string, collaboratorId: string) {
		const collaborator = await this.prisma.collaborator.findFirst({
			where: {
				id: collaboratorId,
				accountOwnerId: ownerId,
				status: CollaboratorStatus.PENDING,
			},
			include: {
				accountOwner: {
					select: { username: true },
				},
			},
		});

		if (!collaborator) {
			throw new NotFoundException('Convite não encontrado ou já foi aceito');
		}

		// Gerar novo token
		const newToken = uuidv4();
		const newExpires = new Date();
		newExpires.setDate(newExpires.getDate() + 7);

		await this.prisma.collaborator.update({
			where: { id: collaboratorId },
			data: {
				inviteToken: newToken,
				inviteExpires: newExpires,
			},
		});

		// Reenviar email
		await this.sendInviteEmail(
			collaborator.invitedEmail,
			collaborator.invitedName,
			collaborator.accountOwner.username,
			collaborator.role,
			newToken,
		);

		// Gerar link de convite para exibição no painel
		const baseUrl = this.configService.get<string>('FRONTEND_URL', 'https://painel.atlasdao.info');
		const inviteLink = `${baseUrl}/invite/${newToken}`;

		return {
			message: 'Convite reenviado com sucesso',
			inviteLink, // Link atualizado para copiar
			inviteExpires: newExpires,
		};
	}

	// Validar token de convite
	async validateInviteToken(token: string) {
		const collaborator = await this.prisma.collaborator.findUnique({
			where: { inviteToken: token },
			include: {
				accountOwner: {
					select: {
						id: true,
						username: true,
						email: true,
						profilePicture: true,
					},
				},
			},
		});

		if (!collaborator) {
			throw new NotFoundException('Convite não encontrado');
		}

		if (collaborator.status !== CollaboratorStatus.PENDING) {
			throw new BadRequestException('Este convite já foi utilizado ou revogado');
		}

		if (new Date() > collaborator.inviteExpires) {
			throw new BadRequestException('Este convite expirou');
		}

		// Verificar se o email já tem uma conta
		const existingUser = await this.prisma.user.findUnique({
			where: { email: collaborator.invitedEmail },
			select: { id: true, username: true },
		});

		return {
			invitedEmail: collaborator.invitedEmail,
			invitedName: collaborator.invitedName,
			role: collaborator.role,
			accountOwner: {
				username: collaborator.accountOwner.username,
				profilePicture: collaborator.accountOwner.profilePicture,
			},
			hasExistingAccount: !!existingUser,
			roleDescription: this.getRoleDescription(collaborator.role),
		};
	}

	// Aceitar convite (usuário existente)
	async acceptInvite(token: string, userId: string) {
		const collaborator = await this.prisma.collaborator.findUnique({
			where: { inviteToken: token },
			include: {
				accountOwner: {
					select: { id: true, username: true },
				},
			},
		});

		if (!collaborator) {
			throw new NotFoundException('Convite não encontrado');
		}

		if (collaborator.status !== CollaboratorStatus.PENDING) {
			throw new BadRequestException('Este convite já foi utilizado ou revogado');
		}

		if (new Date() > collaborator.inviteExpires) {
			throw new BadRequestException('Este convite expirou');
		}

		// Verificar se o email do usuário bate com o convite
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { email: true },
		});

		if (!user || user.email.toLowerCase() !== collaborator.invitedEmail.toLowerCase()) {
			throw new ForbiddenException('Este convite foi enviado para outro email');
		}

		// Aceitar convite
		await this.prisma.collaborator.update({
			where: { id: collaborator.id },
			data: {
				status: CollaboratorStatus.ACTIVE,
				collaboratorId: userId,
				acceptedAt: new Date(),
			},
		});

		return {
			message: 'Convite aceito com sucesso',
			accountOwner: collaborator.accountOwner.username,
			role: collaborator.role,
		};
	}

	// Aceitar convite criando nova conta
	async acceptInviteWithRegistration(dto: AcceptInviteRegisterDto) {
		const collaborator = await this.prisma.collaborator.findUnique({
			where: { inviteToken: dto.token },
			include: {
				accountOwner: {
					select: { id: true, username: true },
				},
			},
		});

		if (!collaborator) {
			throw new NotFoundException('Convite não encontrado');
		}

		if (collaborator.status !== CollaboratorStatus.PENDING) {
			throw new BadRequestException('Este convite já foi utilizado ou revogado');
		}

		if (new Date() > collaborator.inviteExpires) {
			throw new BadRequestException('Este convite expirou');
		}

		// Verificar se email ou username já existem
		const existingUser = await this.prisma.user.findFirst({
			where: {
				OR: [{ email: collaborator.invitedEmail }, { username: dto.username }],
			},
		});

		if (existingUser) {
			if (existingUser.email === collaborator.invitedEmail) {
				throw new ConflictException('Este email já está cadastrado. Faça login para aceitar o convite.');
			}
			throw new ConflictException('Este nome de usuário já está em uso');
		}

		// Hash da senha
		const hashedPassword = await bcrypt.hash(dto.password, 10);

		// Criar usuário e aceitar convite em transação
		const result = await this.prisma.$transaction(async (tx) => {
			// Criar usuário
			const newUser = await tx.user.create({
				data: {
					email: collaborator.invitedEmail,
					username: dto.username,
					password: hashedPassword,
					isAccountValidated: true, // Já validado pois recebeu o convite por email
					validatedAt: new Date(),
				},
			});

			// Aceitar convite
			await tx.collaborator.update({
				where: { id: collaborator.id },
				data: {
					status: CollaboratorStatus.ACTIVE,
					collaboratorId: newUser.id,
					acceptedAt: new Date(),
				},
			});

			return newUser;
		});

		// Gerar tokens de autenticação
		const payload = {
			sub: result.id,
			email: result.email,
			username: result.username,
			roles: ['USER'],
		};

		const accessToken = this.jwtService.sign(payload, {
			secret: this.configService.get<string>('JWT_SECRET'),
			expiresIn: this.configService.get<string>('JWT_EXPIRATION', '24h'),
		});

		const refreshToken = this.jwtService.sign(
			{ ...payload, type: 'refresh' },
			{
				secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
				expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
			},
		);

		return {
			message: 'Conta criada e convite aceito com sucesso',
			accessToken,
			refreshToken,
			user: {
				id: result.id,
				email: result.email,
				username: result.username,
				roles: ['USER'],
			},
			accountOwner: collaborator.accountOwner.username,
			role: collaborator.role,
		};
	}

	// Listar contas que o usuário tem acesso
	async getMyAccounts(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				username: true,
				email: true,
				profilePicture: true,
			},
		});

		if (!user) {
			throw new NotFoundException('Usuário não encontrado');
		}

		const collaborations = await this.prisma.collaborator.findMany({
			where: {
				collaboratorId: userId,
				status: CollaboratorStatus.ACTIVE,
			},
			include: {
				accountOwner: {
					select: {
						id: true,
						username: true,
						email: true,
						profilePicture: true,
					},
				},
			},
		});

		return {
			ownAccount: {
				id: user.id,
				username: user.username,
				email: user.email,
				profilePicture: user.profilePicture,
				role: 'OWNER' as const,
			},
			collaborations: collaborations.map((c) => ({
				collaboratorId: c.id,
				accountId: c.accountOwner.id,
				username: c.accountOwner.username,
				email: c.accountOwner.email,
				profilePicture: c.accountOwner.profilePicture,
				role: c.role,
				permissions: this.getPermissionsForRole(c.role),
			})),
		};
	}

	// Trocar para conta de colaborador
	async switchToAccount(userId: string, collaboratorRecordId: string) {
		const collaboration = await this.prisma.collaborator.findFirst({
			where: {
				id: collaboratorRecordId,
				collaboratorId: userId,
				status: CollaboratorStatus.ACTIVE,
			},
			include: {
				accountOwner: {
					select: {
						id: true,
						username: true,
						email: true,
					},
				},
			},
		});

		if (!collaboration) {
			throw new ForbiddenException('Você não tem acesso a esta conta');
		}

		const context: CollaboratorContext = {
			type: 'COLLABORATOR',
			accountId: collaboration.accountOwner.id,
			accountName: collaboration.accountOwner.username,
			collaboratorId: collaboration.id,
			role: collaboration.role,
			permissions: this.getPermissionsForRole(collaboration.role),
		};

		return {
			context,
			message: `Acessando conta de ${collaboration.accountOwner.username}`,
		};
	}

	// Voltar para conta própria
	async switchToOwnAccount(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, username: true },
		});

		if (!user) {
			throw new NotFoundException('Usuário não encontrado');
		}

		const context: CollaboratorContext = {
			type: 'OWNER',
			accountId: user.id,
			accountName: user.username,
			role: 'OWNER',
			permissions: this.getPermissionsForRole('OWNER'),
		};

		return { context };
	}

	// Obter contexto atual
	async getCurrentContext(userId: string, activeAccountId?: string, collaboratorId?: string) {
		// Se não tiver activeAccountId ou for o próprio userId, é conta própria
		if (!activeAccountId || activeAccountId === userId) {
			const user = await this.prisma.user.findUnique({
				where: { id: userId },
				select: { id: true, username: true },
			});

			if (!user) {
				throw new NotFoundException('Usuário não encontrado');
			}

			return {
				type: 'OWNER' as const,
				accountId: user.id,
				accountName: user.username,
				role: 'OWNER' as const,
				permissions: this.getPermissionsForRole('OWNER'),
			};
		}

		// Buscar colaboração
		const collaboration = await this.prisma.collaborator.findFirst({
			where: {
				id: collaboratorId,
				collaboratorId: userId,
				accountOwnerId: activeAccountId,
				status: CollaboratorStatus.ACTIVE,
			},
			include: {
				accountOwner: {
					select: { id: true, username: true },
				},
			},
		});

		if (!collaboration) {
			throw new ForbiddenException('Você não tem acesso a esta conta');
		}

		return {
			type: 'COLLABORATOR' as const,
			accountId: collaboration.accountOwner.id,
			accountName: collaboration.accountOwner.username,
			collaboratorId: collaboration.id,
			role: collaboration.role,
			permissions: this.getPermissionsForRole(collaboration.role),
		};
	}

	// Descrição dos cargos
	private getRoleDescription(role: CollaboratorRole): { title: string; description: string; permissions: string[] } {
		const descriptions = {
			GESTOR: {
				title: 'Gestor',
				description:
					'Acesso completo às operações do dia-a-dia. Pode criar e editar links de pagamento, gerar QR codes com qualquer wallet, visualizar API key e configurar webhooks.',
				permissions: [
					'Dashboard e transações completos',
					'Criar, editar e excluir links de pagamento',
					'Gerar QR codes com wallet personalizada',
					'Ver API key e configurar webhooks',
				],
			},
			AUXILIAR: {
				title: 'Auxiliar',
				description:
					'Acesso para operações financeiras básicas e criação de cobranças. Ideal para equipe de vendas ou atendimento.',
				permissions: [
					'Dashboard e transações completos',
					'Criar links de pagamento (wallet padrão)',
					'Gerar QR codes (wallet padrão)',
					'Ver métricas de links de pagamento',
				],
			},
		};

		return descriptions[role];
	}

	// Enviar email de convite
	private async sendInviteEmail(
		email: string,
		name: string,
		ownerUsername: string,
		role: CollaboratorRole,
		token: string,
	): Promise<void> {
		const baseUrl = this.configService.get<string>('FRONTEND_URL', 'https://painel.atlasdao.info');
		const inviteLink = `${baseUrl}/invite/${token}`;
		const roleInfo = this.getRoleDescription(role);

		try {
			await this.emailService.sendCollaboratorInviteEmail(
				email,
				name,
				ownerUsername,
				roleInfo.title,
				roleInfo.permissions,
				inviteLink,
			);
		} catch (error) {
			console.error('Erro ao enviar email de convite:', error);
			throw new Error('Falha ao enviar email de convite');
		}
	}
}
