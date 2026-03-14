import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	Query,
	UseGuards,
	Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
	CollateralService,
	CollateralSummary,
	PixDepositResponse,
	DepixDepositResponse,
	DepixPollResponse,
	WithdrawalResponse,
} from './collateral.service';
import {
	IncreaseCollateralPixDto,
	IncreaseCollateralDepixDto,
	DecreaseCollateralDto,
	AdminApproveWithdrawalDto,
	AdminRejectWithdrawalDto,
} from './dto';
import { CollateralTransactionType, CollateralTransactionStatus } from '@prisma/client';

@Controller('collateral')
@UseGuards(JwtAuthGuard)
export class CollateralController {
	constructor(private readonly collateralService: CollateralService) {}

	// ==================== USER ENDPOINTS ====================

	/**
	 * Obter resumo do colateral
	 */
	@Get('summary')
	async getSummary(@Request() req): Promise<CollateralSummary> {
		return this.collateralService.getSummary(req.user.id);
	}

	/**
	 * Aumentar colateral via PIX
	 */
	@Post('increase/pix')
	async increaseViaPix(
		@Request() req,
		@Body() dto: IncreaseCollateralPixDto,
	): Promise<PixDepositResponse> {
		return this.collateralService.increaseViaPix(req.user.id, dto.amount);
	}

	/**
	 * Verificar status de pagamento PIX
	 */
	@Get('increase/pix/:transactionId/status')
	async checkPixStatus(
		@Request() req,
		@Param('transactionId') transactionId: string,
	) {
		return this.collateralService.checkPixStatus(req.user.id, transactionId);
	}

	/**
	 * Aumentar colateral via Depix (LWK)
	 */
	@Post('increase/depix')
	async increaseViaDepix(
		@Request() req,
		@Body() dto: IncreaseCollateralDepixDto,
	): Promise<DepixDepositResponse> {
		return this.collateralService.increaseViaDepix(req.user.id, dto.amount);
	}

	/**
	 * Poll para verificar pagamento Depix
	 */
	@Get('increase/depix/:transactionId/poll')
	async pollDepixStatus(
		@Request() req,
		@Param('transactionId') transactionId: string,
	): Promise<DepixPollResponse> {
		return this.collateralService.pollDepixPayment(req.user.id, transactionId);
	}

	/**
	 * Solicitar diminuição de colateral (saque)
	 */
	@Post('decrease')
	async decreaseCollateral(
		@Request() req,
		@Body() dto: DecreaseCollateralDto,
	): Promise<WithdrawalResponse> {
		return this.collateralService.decreaseCollateral(
			req.user.id,
			dto.amount,
			dto.liquidAddress,
		);
	}

	/**
	 * Cancelar solicitação de saque
	 */
	@Delete('decrease/:transactionId')
	async cancelWithdrawal(
		@Request() req,
		@Param('transactionId') transactionId: string,
	) {
		await this.collateralService.cancelWithdrawal(req.user.id, transactionId);
		return { success: true, message: 'Solicitação cancelada com sucesso' };
	}

	/**
	 * Obter histórico de colateral
	 */
	@Get('history')
	async getHistory(
		@Request() req,
		@Query('limit') limit?: string,
		@Query('offset') offset?: string,
		@Query('type') type?: CollateralTransactionType,
	) {
		return this.collateralService.getHistory(req.user.id, {
			limit: limit ? parseInt(limit) : undefined,
			offset: offset ? parseInt(offset) : undefined,
			type,
		});
	}

	/**
	 * Definir carteira para receber excesso (quando depósito > 6000)
	 */
	@Post('excess-wallet/:transactionId')
	async setExcessWallet(
		@Request() req,
		@Param('transactionId') transactionId: string,
		@Body('walletAddress') walletAddress: string,
	) {
		await this.collateralService.setExcessWallet(
			req.user.id,
			transactionId,
			walletAddress,
		);
		return {
			success: true,
			message: 'Carteira definida. O saque do excesso será processado em até 48h.',
		};
	}

	// ==================== ADMIN ENDPOINTS ====================

	/**
	 * Obter saques pendentes (Admin)
	 */
	@Get('admin/withdrawals')
	@UseGuards(AdminGuard)
	async getAdminWithdrawals(
		@Query('status') status?: CollateralTransactionStatus,
	) {
		if (status) {
			return this.collateralService.getWithdrawalHistory(status);
		}
		return this.collateralService.getPendingWithdrawals();
	}

	/**
	 * Obter histórico de saques (Admin)
	 */
	@Get('admin/withdrawals/history')
	@UseGuards(AdminGuard)
	async getAdminWithdrawalHistory(
		@Query('status') status?: CollateralTransactionStatus,
	) {
		return this.collateralService.getWithdrawalHistory(status);
	}

	/**
	 * Aprovar saque (Admin)
	 */
	@Put('admin/withdrawals/:transactionId/approve')
	@UseGuards(AdminGuard)
	async approveWithdrawal(
		@Request() req,
		@Param('transactionId') transactionId: string,
		@Body() dto: AdminApproveWithdrawalDto,
	) {
		return this.collateralService.approveWithdrawal(
			transactionId,
			req.user.id,
			dto,
		);
	}

	/**
	 * Rejeitar saque (Admin)
	 */
	@Put('admin/withdrawals/:transactionId/reject')
	@UseGuards(AdminGuard)
	async rejectWithdrawal(
		@Request() req,
		@Param('transactionId') transactionId: string,
		@Body() dto: AdminRejectWithdrawalDto,
	) {
		return this.collateralService.rejectWithdrawal(
			transactionId,
			req.user.id,
			dto,
		);
	}
}
