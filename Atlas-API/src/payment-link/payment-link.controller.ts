import {
	Controller,
	Get,
	Post,
	Delete,
	Patch,
	Body,
	Param,
	UseGuards,
	Req,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { PaymentLinkService } from './payment-link.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getEffectiveUserId, getCollaboratorContext } from '../common/decorators/effective-user.decorator';
import {
	CreatePaymentLinkDto,
	UpdatePaymentLinkDto,
	PaymentLinkResponseDto,
} from './dto/payment-link.dto';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Payment Links')
@Controller('payment-links')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentLinkController {
	constructor(private readonly paymentLinkService: PaymentLinkService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new payment link' })
	@ApiResponse({
		status: 201,
		description: 'Payment link created successfully',
	})
	async createPaymentLink(
		@Req() req: any,
		@Body() dto: CreatePaymentLinkDto,
	): Promise<PaymentLinkResponseDto> {
		const userId = getEffectiveUserId(req);
		if (!userId) {
			throw new HttpException(
				'User not authenticated',
				HttpStatus.UNAUTHORIZED,
			);
		}

		// Check collaborator restrictions
		const collabContext = getCollaboratorContext(req);
		if (collabContext.isCollaborating && collabContext.role === 'AUXILIAR') {
			// AUXILIAR cannot use custom wallet - must use owner's default wallet
			if (dto.walletAddress) {
				throw new HttpException(
					'Colaboradores auxiliares não podem usar carteiras personalizadas. Use a carteira padrão da conta.',
					HttpStatus.FORBIDDEN,
				);
			}
		}

		// Enhanced logging for debugging validation issues
		console.log('🔍 Payment Link Creation Request:');
		console.log('  User ID:', userId);
		console.log('  Collaborator Context:', JSON.stringify(collabContext, null, 2));
		console.log('  Request Body:', JSON.stringify(req.body, null, 2));
		console.log('  Validated DTO:', JSON.stringify(dto, null, 2));

		try {
			return await this.paymentLinkService.create(userId, dto, collabContext);
		} catch (error) {
			console.error('❌ Payment Link Creation Error:', error);

			// Check if it's a validation error and provide better Portuguese messages
			if (error.message && error.message.includes('validation')) {
				throw new HttpException(
					'Erro de validação: Verifique os dados enviados e tente novamente.',
					HttpStatus.BAD_REQUEST,
				);
			}

			// Re-throw the original error if it's not a validation issue
			throw error;
		}
	}

	@Get()
	@ApiOperation({ summary: 'Get all payment links for current user' })
	@ApiResponse({ status: 200, description: 'Returns all payment links' })
	async getMyPaymentLinks(@Req() req: any): Promise<PaymentLinkResponseDto[]> {
		const userId = getEffectiveUserId(req);
		if (!userId) {
			throw new HttpException(
				'User not authenticated',
				HttpStatus.UNAUTHORIZED,
			);
		}
		return this.paymentLinkService.findByUserId(userId);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update a payment link' })
	@ApiResponse({
		status: 200,
		description: 'Payment link updated successfully',
	})
	async updatePaymentLink(
		@Req() req: any,
		@Param('id') id: string,
		@Body() dto: UpdatePaymentLinkDto,
	): Promise<PaymentLinkResponseDto> {
		const userId = getEffectiveUserId(req);
		if (!userId) {
			throw new HttpException(
				'User not authenticated',
				HttpStatus.UNAUTHORIZED,
			);
		}

		// Check if AUXILIAR is trying to change wallet address
		const collabContext = getCollaboratorContext(req);
		if (collabContext.isCollaborating && collabContext.role === 'AUXILIAR') {
			// AUXILIAR cannot change wallet address
			if (dto.walletAddress !== undefined) {
				throw new HttpException(
					'Colaboradores auxiliares não podem alterar a carteira de links de pagamento.',
					HttpStatus.FORBIDDEN,
				);
			}
		}

		// Enhanced logging for debugging update issues
		console.log('🔍 Payment Link Update Request:');
		console.log('  User ID:', userId);
		console.log('  Payment Link ID:', id);
		console.log('  Request Body:', JSON.stringify(req.body, null, 2));
		console.log('  Validated DTO:', JSON.stringify(dto, null, 2));

		try {
			return await this.paymentLinkService.update(id, userId, dto);
		} catch (error) {
			console.error('❌ Payment Link Update Error:', error);

			// Check if it's a validation error and provide better Portuguese messages
			if (error.message && error.message.includes('validation')) {
				throw new HttpException(
					'Erro de validação: Verifique os dados enviados e tente novamente.',
					HttpStatus.BAD_REQUEST,
				);
			}

			// Re-throw the original error if it's not a validation issue
			throw error;
		}
	}

	@Patch(':id/toggle')
	@ApiOperation({ summary: 'Toggle payment link active status' })
	@ApiResponse({
		status: 200,
		description: 'Payment link status toggled successfully',
	})
	async togglePaymentLink(
		@Req() req: any,
		@Param('id') id: string,
	): Promise<PaymentLinkResponseDto> {
		const userId = getEffectiveUserId(req);
		if (!userId) {
			throw new HttpException(
				'User not authenticated',
				HttpStatus.UNAUTHORIZED,
			);
		}
		return this.paymentLinkService.toggleStatus(id, userId);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete a payment link' })
	@ApiResponse({
		status: 200,
		description: 'Payment link deleted successfully',
	})
	async deletePaymentLink(
		@Req() req: any,
		@Param('id') id: string,
	): Promise<{ message: string }> {
		const userId = getEffectiveUserId(req);
		if (!userId) {
			throw new HttpException(
				'User not authenticated',
				HttpStatus.UNAUTHORIZED,
			);
		}
		await this.paymentLinkService.delete(id, userId);
		return { message: 'Payment link deleted successfully' };
	}
}
