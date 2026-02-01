import {
	Controller,
	Get,
	Post,
	Body,
	Query,
	UseGuards,
	Req,
	HttpCode,
	HttpStatus,
	HttpException,
	Param,
} from '@nestjs/common';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBearerAuth,
	ApiQuery,
	ApiParam,
} from '@nestjs/swagger';
import { PixService } from './pix.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getEffectiveUserId, getCollaboratorContext } from '../common/decorators/effective-user.decorator';
import {
	DepositDto,
	WithdrawDto,
	TransferDto,
	TransactionResponseDto,
	TransactionFilterDto,
	PaginatedResponseDto,
} from '../eulen/dto/eulen.dto';
import { TransactionStatus, TransactionType } from '@prisma/client';

@ApiTags('PIX Operations')
@Controller('pix')
export class PixController {
	constructor(private readonly pixService: PixService) {}

	// Endpoint for testing without authentication
	@Get('test-eulen-logs')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Test Eulen API logs (temporary endpoint)' })
	async testEulenLogs() {
		// This is a temporary endpoint to test Eulen API logging without authentication
		return this.pixService.pingEulenAPI();
	}

	@Post('deposit')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Create a PIX deposit transaction' })
	@ApiResponse({ status: 201, description: 'Deposit created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async createDeposit(
		@Req() req: any,
		@Body() depositDto: DepositDto,
	): Promise<TransactionResponseDto> {
		const userId = getEffectiveUserId(req);
		return this.pixService.createDeposit(userId, depositDto);
	}

	@Post('withdraw')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Create a PIX withdrawal transaction' })
	@ApiResponse({ status: 201, description: 'Withdrawal created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Insufficient balance' })
	async createWithdraw(
		@Req() req: any,
		@Body() withdrawDto: WithdrawDto,
	): Promise<TransactionResponseDto> {
		const userId = getEffectiveUserId(req);
		return this.pixService.createWithdraw(userId, withdrawDto);
	}

	@Post('transfer')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Create a PIX transfer transaction' })
	@ApiResponse({ status: 201, description: 'Transfer created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Insufficient balance' })
	async createTransfer(
		@Req() req: any,
		@Body() transferDto: TransferDto,
	): Promise<TransactionResponseDto> {
		const userId = getEffectiveUserId(req);
		return this.pixService.createTransfer(userId, transferDto);
	}

	@Get('transactions')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get user transactions with filters' })
	@ApiQuery({ name: 'status', enum: TransactionStatus, required: false })
	@ApiQuery({ name: 'type', enum: TransactionType, required: false })
	@ApiQuery({ name: 'skip', type: Number, required: false })
	@ApiQuery({ name: 'take', type: Number, required: false })
	@ApiQuery({
		name: 'limit',
		type: Number,
		required: false,
		description: 'Alias for take',
	})
	@ApiQuery({
		name: 'offset',
		type: Number,
		required: false,
		description: 'Alias for skip',
	})
	@ApiQuery({
		name: 'startDate',
		type: String,
		required: false,
		description: 'Filter by start date (ISO string format)',
		example: '2025-10-01T00:00:00.000Z',
	})
	@ApiQuery({
		name: 'endDate',
		type: String,
		required: false,
		description: 'Filter by end date (ISO string format)',
		example: '2025-10-07T23:59:59.999Z',
	})
	@ApiResponse({
		status: 200,
		description: 'Transactions retrieved successfully',
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getTransactions(
		@Req() req: any,
		@Query() filters: TransactionFilterDto,
	) {
		const userId = getEffectiveUserId(req);

		// Use limit/offset as aliases for take/skip
		if (filters.limit !== undefined && filters.take === undefined) {
			filters.take = filters.limit;
		}
		if (filters.offset !== undefined && filters.skip === undefined) {
			filters.skip = filters.offset;
		}

		return this.pixService.getUserTransactions(userId, filters);
	}

	@Get('transactions/:id')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get transaction details by ID' })
	@ApiParam({ name: 'id', description: 'Transaction ID' })
	@ApiResponse({ status: 200, description: 'Transaction details retrieved' })
	@ApiResponse({ status: 404, description: 'Transaction not found' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getTransaction(
		@Req() req: any,
		@Param('id') transactionId: string,
	): Promise<TransactionResponseDto> {
		const userId = getEffectiveUserId(req);
		return this.pixService.getTransactionStatus(userId, transactionId);
	}

	@Get('transactions/:id/status')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Check transaction status' })
	@ApiParam({ name: 'id', description: 'Transaction ID' })
	@ApiResponse({ status: 200, description: 'Transaction status retrieved' })
	@ApiResponse({ status: 404, description: 'Transaction not found' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getTransactionStatus(
		@Req() req: any,
		@Param('id') transactionId: string,
	): Promise<TransactionResponseDto> {
		const userId = getEffectiveUserId(req);
		return this.pixService.getTransactionStatus(userId, transactionId);
	}

	@Post('qrcode')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Generate PIX QR Code for payment' })
	@ApiResponse({ status: 201, description: 'QR Code generated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async generateQRCode(
		@Req() req: any,
		@Body()
		data: {
			amount: number;
			depixAddress: string; // DePix address from frontend - REQUIRED
			description?: string;
			expirationMinutes?: number;
			isCommerceRequest?: boolean; // Flag to indicate if request is from commerce page
		},
	) {
		const userId = getEffectiveUserId(req);

		// Check collaborator restrictions for custom wallet
		const collabContext = getCollaboratorContext(req);
		if (collabContext.isCollaborating && collabContext.role === 'AUXILIAR') {
			// Get owner's default wallet to compare
			const owner = await this.pixService.getUserDefaultWallet(userId);
			if (owner?.defaultWalletAddress && data.depixAddress && data.depixAddress !== owner.defaultWalletAddress) {
				throw new HttpException(
					'Colaboradores auxiliares não podem usar carteiras personalizadas. Use a carteira padrão da conta.',
					HttpStatus.FORBIDDEN,
				);
			}
		}

		// Pass authentication context to service to determine which limits to apply
		const isApiRequest = req.user.scope && req.user.scope.includes('api');
		return this.pixService.generatePixQRCode(userId, { ...data, isApiRequest });
	}

	@Post('validate-key')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Validate a PIX key' })
	@ApiResponse({ status: 200, description: 'PIX key validation result' })
	@ApiResponse({ status: 400, description: 'Invalid PIX key format' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async validatePixKey(@Body('pixKey') pixKey: string) {
		return this.pixService.validatePixKey(pixKey);
	}

	@Get('balance')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get user balance' })
	@ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getBalance(@Req() req: any) {
		const userId = getEffectiveUserId(req);
		return this.pixService.getBalance(userId);
	}

	@Get('deposit/:transactionId/status')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Check deposit status' })
	@ApiParam({
		name: 'transactionId',
		description: 'Transaction ID to check status',
	})
	@ApiResponse({
		status: 200,
		description: 'Deposit status retrieved successfully',
	})
	@ApiResponse({ status: 404, description: 'Transaction not found' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async checkDepositStatus(
		@Req() req: any,
		@Param('transactionId') transactionId: string,
	) {
		const userId = getEffectiveUserId(req);
		return this.pixService.checkDepositStatus(userId, transactionId);
	}

	@Get('ping')
	@HttpCode(HttpStatus.OK)
	@ApiTags('Eulen Health')
	@ApiOperation({
		summary: 'Ping Eulen API health check',
		description:
			'Check connectivity and health status of the underlying Eulen API. Returns Eulen API response with JWT token debug info.',
	})
	@ApiResponse({
		status: 200,
		description: 'Eulen API is healthy and responding',
	})
	@ApiResponse({
		status: 401,
		description: 'Unauthorized - invalid JWT or API key',
	})
	@ApiResponse({
		status: 503,
		description: 'Eulen API is unavailable or not responding',
	})
	async ping() {
		return this.pixService.pingEulenAPI();
	}

	@Get('limits')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.OK)
	@ApiTags('User Management')
	@ApiOperation({
		summary: 'Get user transaction limits and usage',
		description:
			'Retrieve current transaction limits, daily/monthly usage, and compliance status for the authenticated user.',
	})
	@ApiResponse({
		status: 200,
		description: 'User limits and usage retrieved successfully',
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getUserLimits(@Req() req: any) {
		const userId = getEffectiveUserId(req);
		return this.pixService.getUserLimits(userId);
	}

	@Get('level-limits')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.OK)
	@ApiTags('User Management')
	@ApiOperation({
		summary: 'Get user level-based limits and current usage',
		description:
			'Retrieve user level information, daily limits, current usage, and remaining limits for transactions.',
	})
	@ApiResponse({
		status: 200,
		description: 'User level limits and usage retrieved successfully',
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	async getUserLevelLimits(@Req() req: any) {
		const userId = getEffectiveUserId(req);
		return this.pixService.getUserLevelLimits(userId);
	}
}
