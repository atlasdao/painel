import {
	Controller,
	Post,
	Get,
	Put,
	Param,
	Body,
	UseGuards,
	Req,
	Query,
	HttpCode,
	HttpStatus,
	HttpException,
} from '@nestjs/common';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBearerAuth,
	ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { Scope } from '../common/decorators/scope.decorator';
import { ApiKeyRequestService } from './api-key-request.service';
import {
	CreateApiKeyRequestDto,
	ApproveApiKeyRequestDto,
	RejectApiKeyRequestDto,
	FilterApiKeyRequestsDto,
	ApiKeyRequestResponseDto,
} from '../common/dto/api-key-request.dto';
import { UserRole } from '@prisma/client';

@ApiTags('API Key Requests')
@Controller({ path: 'api-key-requests', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeyRequestController {
	constructor(private readonly apiKeyRequestService: ApiKeyRequestService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Request an API key' })
	@ApiResponse({
		status: 201,
		description: 'API key request created successfully',
		type: ApiKeyRequestResponseDto,
	})
	@ApiResponse({
		status: 409,
		description: 'Conflict - User already has request or API key',
	})
	async createRequest(@Req() req: any, @Body() dto: CreateApiKeyRequestDto) {
		console.log('=== API Key Request Debug ===');
		console.log('Request user object:', req.user);
		console.log('Raw request body:', req.body);
		console.log('Parsed DTO:', dto);
		console.log('DTO type:', typeof dto);
		console.log('DTO keys:', Object.keys(dto));
		console.log('UsageType value:', dto.usageType);
		console.log('UsageType type:', typeof dto.usageType);

		const userId = req.user?.id || req.user?.sub;

		if (!userId) {
			throw new HttpException(
				'User ID not found in token',
				HttpStatus.UNAUTHORIZED,
			);
		}

		console.log('Using userId:', userId);

		try {
			const result = await this.apiKeyRequestService.createRequest(userId, dto);
			console.log('Service call successful:', result);
			return result;
		} catch (error) {
			console.log('Service call failed:', error);
			console.log('Error type:', error.constructor.name);
			console.log('Error message:', error.message);
			console.log('Error stack:', error.stack);
			throw error;
		}
	}

	@Get('my-requests')
	@ApiOperation({ summary: 'Get current user API key requests' })
	@ApiResponse({
		status: 200,
		description: 'List of user API key requests',
		type: [ApiKeyRequestResponseDto],
	})
	async getMyRequests(@Req() req: any) {
		const userId = req.user.id || req.user.sub;
		return await this.apiKeyRequestService.getUserRequests(userId);
	}

	@Get('my-api-keys')
	@ApiOperation({ summary: 'Get current user active API keys' })
	@ApiResponse({
		status: 200,
		description: 'List of user active API keys',
		type: [ApiKeyRequestResponseDto],
	})
	async getMyApiKeys(@Req() req: any) {
		const userId = req.user.id || req.user.sub;
		return await this.apiKeyRequestService.getUserActiveApiKeys(userId);
	}

	@Get()
	@UseGuards(ScopeGuard)
	@Scope(UserRole.ADMIN)
	@ApiOperation({ summary: 'Get all API key requests (Admin only)' })
	@ApiQuery({
		name: 'status',
		required: false,
		enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'],
	})
	@ApiQuery({ name: 'userId', required: false, type: String })
	@ApiResponse({
		status: 200,
		description: 'List of all API key requests',
		type: [ApiKeyRequestResponseDto],
	})
	async getAllRequests(@Query() filter: FilterApiKeyRequestsDto) {
		return await this.apiKeyRequestService.getAllRequests(filter);
	}

	@Get(':id')
	@UseGuards(ScopeGuard)
	@Scope(UserRole.ADMIN)
	@ApiOperation({ summary: 'Get API key request by ID (Admin only)' })
	@ApiResponse({
		status: 200,
		description: 'API key request details',
		type: ApiKeyRequestResponseDto,
	})
	@ApiResponse({ status: 404, description: 'Request not found' })
	async getRequestById(@Param('id') id: string) {
		return await this.apiKeyRequestService.getRequestById(id);
	}

	@Put(':id/approve')
	@UseGuards(ScopeGuard)
	@Scope(UserRole.ADMIN)
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Approve API key request (Admin only)' })
	@ApiResponse({
		status: 200,
		description: 'Request approved and API key generated',
		schema: {
			properties: {
				id: { type: 'string' },
				status: { type: 'string', example: 'APPROVED' },
				apiKey: {
					type: 'string',
					description: 'Generated API key (only shown once)',
				},
				approvedAt: { type: 'string', format: 'date-time' },
			},
		},
	})
	@ApiResponse({ status: 400, description: 'Request already processed' })
	@ApiResponse({ status: 404, description: 'Request not found' })
	async approveRequest(
		@Param('id') id: string,
		@Req() req: any,
		@Body() dto: ApproveApiKeyRequestDto,
	) {
		const adminId = req.user.id || req.user.sub;
		return await this.apiKeyRequestService.approveRequest(id, adminId, dto);
	}

	@Put(':id/reject')
	@UseGuards(ScopeGuard)
	@Scope(UserRole.ADMIN)
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Reject API key request (Admin only)' })
	@ApiResponse({
		status: 200,
		description: 'Request rejected',
		type: ApiKeyRequestResponseDto,
	})
	@ApiResponse({ status: 400, description: 'Request already processed' })
	@ApiResponse({ status: 404, description: 'Request not found' })
	async rejectRequest(
		@Param('id') id: string,
		@Req() req: any,
		@Body() dto: RejectApiKeyRequestDto,
	) {
		const adminId = req.user.id || req.user.sub;
		return await this.apiKeyRequestService.rejectRequest(id, adminId, dto);
	}

	@Put(':id/revoke')
	@UseGuards(ScopeGuard)
	@Scope(UserRole.ADMIN)
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Revoke approved API key (Admin only)' })
	@ApiResponse({
		status: 200,
		description: 'API key revoked',
		type: ApiKeyRequestResponseDto,
	})
	@ApiResponse({ status: 400, description: 'Can only revoke approved keys' })
	@ApiResponse({ status: 404, description: 'Request not found' })
	async revokeApiKey(
		@Param('id') id: string,
		@Req() req: any,
		@Body('reason') reason: string,
	) {
		const adminId = req.user.id || req.user.sub;
		return await this.apiKeyRequestService.revokeApiKey(id, adminId, reason);
	}
}
