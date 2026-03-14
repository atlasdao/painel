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
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBearerAuth,
	ApiQuery,
} from '@nestjs/swagger';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WithdrawalStatus, UserRole } from '@prisma/client';

@ApiTags('withdrawals')
@Controller({ path: 'withdrawals', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WithdrawalsController {
	constructor(private readonly withdrawalsService: WithdrawalsService) {}

	// ========== User endpoints ==========

	@Post()
	@ApiOperation({ summary: 'Create withdrawal request' })
	async createWithdrawal(@Request() req, @Body() dto: CreateWithdrawalDto) {
		return this.withdrawalsService.createWithdrawal(req.user.id, dto);
	}

	@Post('validate-coupon')
	@ApiOperation({ summary: 'Validate discount coupon' })
	async validateCoupon(@Request() req, @Body() dto: any) {
		return this.withdrawalsService.validateCoupon(dto, req.user.id);
	}

	@Get()
	@ApiOperation({ summary: 'Get user withdrawals' })
	@ApiQuery({ name: 'status', required: false, enum: WithdrawalStatus })
	async getUserWithdrawals(
		@Request() req,
		@Query('status') status?: WithdrawalStatus,
	) {
		return this.withdrawalsService.getUserWithdrawals(req.user.id, status);
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get withdrawal statistics' })
	async getWithdrawalStats(@Request() req) {
		return this.withdrawalsService.getWithdrawalStats(req.user.id);
	}

	@Get(':id/deposit-status')
	@ApiOperation({ summary: 'Check deposit status for a withdrawal' })
	async checkDepositStatus(@Request() req, @Param('id') id: string) {
		return this.withdrawalsService.checkDepositStatus(req.user.id, id);
	}

	@Get(':id/receipt')
	@ApiOperation({ summary: 'Get withdrawal receipt' })
	async getReceipt(@Request() req, @Param('id') id: string) {
		return this.withdrawalsService.getReceipt(id, req.user.id);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get withdrawal by ID' })
	async getWithdrawalById(@Request() req, @Param('id') id: string) {
		return this.withdrawalsService.getWithdrawalById(id, req.user.id);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Cancel withdrawal request' })
	async cancelWithdrawal(@Request() req, @Param('id') id: string) {
		return this.withdrawalsService.cancelWithdrawal(id, req.user.id);
	}

	// ========== Admin endpoints ==========

	@Get('admin/all')
	@ApiOperation({ summary: 'Get all withdrawals (Admin)' })
	@ApiQuery({ name: 'status', required: false, enum: WithdrawalStatus })
	async getAllWithdrawals(
		@Request() req,
		@Query('status') status?: WithdrawalStatus,
	) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.withdrawalsService.getAllWithdrawals(status);
	}

	@Get('admin/pending')
	@ApiOperation({ summary: 'Get pending withdrawals (Admin)' })
	async getPendingWithdrawals(@Request() req) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.withdrawalsService.getPendingWithdrawals();
	}

	@Get('admin/processing')
	@ApiOperation({ summary: 'Get processing withdrawals (Admin)' })
	async getProcessingWithdrawals(@Request() req) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.withdrawalsService.getProcessingWithdrawals();
	}

	@Get('admin/stats')
	@ApiOperation({ summary: 'Get system-wide withdrawal statistics (Admin)' })
	async getSystemWithdrawalStats(@Request() req) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.withdrawalsService.getWithdrawalStats();
	}

	@Put('admin/:id/approve')
	@ApiOperation({ summary: 'Approve withdrawal - calls Eulen (Admin)' })
	async adminApproveWithdrawal(@Request() req, @Param('id') id: string) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.withdrawalsService.adminApproveWithdrawal(id, req.user.id);
	}

	@Put('admin/:id/confirm-send')
	@ApiOperation({ summary: 'Confirm DePix sent to Eulen (Admin)' })
	async adminConfirmEulenSend(@Request() req, @Param('id') id: string) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.withdrawalsService.adminConfirmEulenSend(id, req.user.id);
	}

	@Put('admin/:id/reject')
	@ApiOperation({ summary: 'Reject withdrawal (Admin)' })
	async adminRejectWithdrawal(
		@Request() req,
		@Param('id') id: string,
		@Body() body: { reason?: string },
	) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.withdrawalsService.adminRejectWithdrawal(id, req.user.id, body.reason);
	}

	@Get('admin/:id/receipt')
	@ApiOperation({ summary: 'Get withdrawal receipt (Admin)' })
	async getAdminReceipt(@Request() req, @Param('id') id: string) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.withdrawalsService.getReceipt(id);
	}
}
