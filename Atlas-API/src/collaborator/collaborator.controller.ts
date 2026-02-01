import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Body,
	Param,
	UseGuards,
	Request,
	HttpCode,
	HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CollaboratorService } from './collaborator.service';
import { InviteCollaboratorDto, AcceptInviteDto, AcceptInviteRegisterDto, UpdateCollaboratorRoleDto } from './dto';

@Controller('collaborator')
export class CollaboratorController {
	constructor(private readonly collaboratorService: CollaboratorService) {}

	// ============================================
	// ENDPOINTS DO DONO DA CONTA
	// ============================================

	/**
	 * Enviar convite para colaborador
	 */
	@Post('invite')
	@UseGuards(JwtAuthGuard)
	async inviteCollaborator(@Request() req, @Body() dto: InviteCollaboratorDto) {
		return this.collaboratorService.inviteCollaborator(req.user.sub, dto);
	}

	/**
	 * Listar colaboradores da conta
	 */
	@Get('list')
	@UseGuards(JwtAuthGuard)
	async listCollaborators(@Request() req) {
		return this.collaboratorService.listCollaborators(req.user.sub);
	}

	/**
	 * Atualizar cargo do colaborador
	 */
	@Patch(':id/role')
	@UseGuards(JwtAuthGuard)
	async updateCollaboratorRole(
		@Request() req,
		@Param('id') collaboratorId: string,
		@Body() dto: UpdateCollaboratorRoleDto,
	) {
		return this.collaboratorService.updateCollaboratorRole(req.user.sub, collaboratorId, dto);
	}

	/**
	 * Revogar acesso do colaborador
	 */
	@Delete(':id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async revokeCollaborator(@Request() req, @Param('id') collaboratorId: string) {
		return this.collaboratorService.revokeCollaborator(req.user.sub, collaboratorId);
	}

	/**
	 * Reenviar convite
	 */
	@Post(':id/resend')
	@UseGuards(JwtAuthGuard)
	async resendInvite(@Request() req, @Param('id') collaboratorId: string) {
		return this.collaboratorService.resendInvite(req.user.sub, collaboratorId);
	}

	// ============================================
	// ENDPOINTS DE CONVITE (PÚBLICO/AUTH)
	// ============================================

	/**
	 * Validar token de convite (público)
	 */
	@Get('invite/:token')
	@Public()
	async validateInviteToken(@Param('token') token: string) {
		return this.collaboratorService.validateInviteToken(token);
	}

	/**
	 * Aceitar convite (usuário autenticado)
	 */
	@Post('invite/accept')
	@UseGuards(JwtAuthGuard)
	async acceptInvite(@Request() req, @Body() dto: AcceptInviteDto) {
		return this.collaboratorService.acceptInvite(dto.token, req.user.sub);
	}

	/**
	 * Aceitar convite criando nova conta (público)
	 */
	@Post('invite/register')
	@Public()
	async acceptInviteWithRegistration(@Body() dto: AcceptInviteRegisterDto) {
		return this.collaboratorService.acceptInviteWithRegistration(dto);
	}

	// ============================================
	// ENDPOINTS DE CONTEXTO (AUTH)
	// ============================================

	/**
	 * Listar contas que o usuário tem acesso
	 */
	@Get('my-accounts')
	@UseGuards(JwtAuthGuard)
	async getMyAccounts(@Request() req) {
		return this.collaboratorService.getMyAccounts(req.user.sub);
	}

	/**
	 * Voltar para conta própria
	 * IMPORTANTE: Esta rota deve vir ANTES de /switch/:collaboratorId
	 */
	@Post('switch/own')
	@UseGuards(JwtAuthGuard)
	async switchToOwnAccount(@Request() req) {
		return this.collaboratorService.switchToOwnAccount(req.user.sub);
	}

	/**
	 * Trocar para conta de colaborador
	 */
	@Post('switch/:collaboratorId')
	@UseGuards(JwtAuthGuard)
	async switchToAccount(@Request() req, @Param('collaboratorId') collaboratorId: string) {
		return this.collaboratorService.switchToAccount(req.user.sub, collaboratorId);
	}
}
