import {
	Controller,
	Get,
	Post,
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
	ApiParam,
} from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { CustomizeShortCodeDto } from './dto/customize-shortcode.dto';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { AdminApprovePayoutDto, AdminRejectPayoutDto, AdminBlockUserDto } from './dto/admin-payout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommissionPayoutStatus, UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('referral')
@Controller({ path: 'referral', version: '1' })
export class ReferralController {
	constructor(private readonly referralService: ReferralService) {}

	// ==========================================
	// PUBLIC ENDPOINTS
	// ==========================================

	@Public()
	@Get('link/:shortCode')
	@ApiOperation({ summary: 'Validate referral link exists (public)' })
	@ApiParam({ name: 'shortCode', description: 'Referral short code' })
	@ApiResponse({ status: 200, description: 'Validation result' })
	async validateReferralLink(@Param('shortCode') shortCode: string) {
		return this.referralService.validateReferralLink(shortCode);
	}

	// ==========================================
	// USER ENDPOINTS
	// ==========================================

	@Get('status')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get referral status and eligibility' })
	@ApiResponse({ status: 200, description: 'Returns referral status' })
	async getReferralStatus(@Request() req) {
		return this.referralService.getReferralStatus(req.user.id);
	}

	@Post('terms/accept')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Accept referral program terms' })
	@ApiResponse({ status: 200, description: 'Terms accepted' })
	async acceptTerms(@Request() req) {
		return this.referralService.acceptTerms(req.user.id);
	}

	@Post('link')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Create referral link' })
	@ApiResponse({ status: 201, description: 'Referral link created' })
	@ApiResponse({ status: 400, description: 'Campaign ended or terms not accepted' })
	@ApiResponse({ status: 403, description: 'Not eligible (< 10k sales)' })
	@ApiResponse({ status: 409, description: 'Already has referral link' })
	async createReferralLink(@Request() req) {
		return this.referralService.createReferralLink(req.user.id);
	}

	@Post('link/customize')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Customize referral link shortcode' })
	@ApiResponse({ status: 200, description: 'Shortcode updated' })
	@ApiResponse({ status: 400, description: 'Invalid shortcode format' })
	@ApiResponse({ status: 404, description: 'No referral link found' })
	@ApiResponse({ status: 409, description: 'Shortcode already taken' })
	async customizeShortCode(@Request() req, @Body() dto: CustomizeShortCodeDto) {
		return this.referralService.customizeShortCode(req.user.id, dto);
	}

	@Get('link/check/:shortCode')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Check if shortcode is available' })
	@ApiParam({ name: 'shortCode', description: 'Shortcode to check' })
	@ApiResponse({ status: 200, description: 'Availability result' })
	async checkShortCodeAvailability(@Param('shortCode') shortCode: string) {
		return this.referralService.checkShortCodeAvailability(shortCode);
	}

	@Get('referrals')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get list of referrals' })
	@ApiResponse({ status: 200, description: 'Returns referrals list' })
	async getReferrals(@Request() req) {
		const status = await this.referralService.getReferralStatus(req.user.id);
		return status.referrals;
	}

	@Get('commissions')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get commissions summary' })
	@ApiResponse({ status: 200, description: 'Returns commissions data' })
	async getCommissions(@Request() req) {
		return this.referralService.getCommissions(req.user.id);
	}

	@Post('commissions/withdraw')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Request commission withdrawal' })
	@ApiResponse({ status: 200, description: 'Withdrawal requested' })
	@ApiResponse({ status: 400, description: 'Insufficient balance or invalid address' })
	async requestWithdrawal(@Request() req, @Body() dto: RequestPayoutDto) {
		return this.referralService.requestCommissionPayout(req.user.id, dto);
	}

	// ==========================================
	// ADMIN ENDPOINTS
	// ==========================================

	@Get('admin/payouts/pending')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get pending payout requests (Admin)' })
	@ApiResponse({ status: 200, description: 'Returns pending payouts' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	async getPendingPayouts(@Request() req) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.referralService.getPendingPayoutRequests();
	}

	@Get('admin/payouts/history')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get payout history (Admin)' })
	@ApiQuery({ name: 'status', required: false, enum: CommissionPayoutStatus })
	@ApiResponse({ status: 200, description: 'Returns payout history' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	async getPayoutHistory(
		@Request() req,
		@Query('status') status?: CommissionPayoutStatus,
	) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.referralService.getPayoutHistory(status);
	}

	@Post('admin/payouts/:id/approve')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Approve payout request (Admin)' })
	@ApiParam({ name: 'id', description: 'Payout ID' })
	@ApiResponse({ status: 200, description: 'Payout approved' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	@ApiResponse({ status: 404, description: 'Payout not found' })
	async approvePayout(
		@Request() req,
		@Param('id') id: string,
		@Body() dto: AdminApprovePayoutDto,
	) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.referralService.approvePayout(req.user.id, id, dto);
	}

	@Post('admin/payouts/:id/complete')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Mark payout as completed (Admin)' })
	@ApiParam({ name: 'id', description: 'Payout ID' })
	@ApiResponse({ status: 200, description: 'Payout completed' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	async completePayout(
		@Request() req,
		@Param('id') id: string,
		@Body() body: { coldwalletTxId: string },
	) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.referralService.completePayout(req.user.id, id, body.coldwalletTxId);
	}

	@Post('admin/payouts/:id/reject')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Reject payout request (Admin)' })
	@ApiParam({ name: 'id', description: 'Payout ID' })
	@ApiResponse({ status: 200, description: 'Payout rejected' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	@ApiResponse({ status: 404, description: 'Payout not found' })
	async rejectPayout(
		@Request() req,
		@Param('id') id: string,
		@Body() dto: AdminRejectPayoutDto,
	) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.referralService.rejectPayout(req.user.id, id, dto);
	}

	@Post('admin/block/:userId')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Block user from referral program (Admin)' })
	@ApiParam({ name: 'userId', description: 'User ID to block' })
	@ApiResponse({ status: 200, description: 'User blocked' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	@ApiResponse({ status: 404, description: 'User has no referral link' })
	async blockUser(
		@Request() req,
		@Param('userId') userId: string,
		@Body() dto: AdminBlockUserDto,
	) {
		if (req.user.role !== UserRole.ADMIN) {
			throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
		}
		return this.referralService.blockReferralLink(req.user.id, userId, dto);
	}
}
