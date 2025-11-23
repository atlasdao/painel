import {
	Controller,
	Get,
	Post,
	Param,
	Body,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { PaymentLinkService } from './payment-link.service';
import {
	PaymentLinkResponseDto,
	GenerateQRWithTaxNumberDto,
	GenerateQRCodeDto,
	QRCodeResponseDto,
} from './dto/payment-link.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Public Payment Links')
@Controller('pay')
export class PublicPaymentLinkController {
	constructor(private readonly paymentLinkService: PaymentLinkService) {}

	@Public()
	@Get(':shortCode')
	@ApiOperation({ summary: 'Get payment link by short code (public)' })
	@ApiResponse({ status: 200, description: 'Returns payment link details' })
	async getPaymentLink(
		@Param('shortCode') shortCode: string,
	): Promise<PaymentLinkResponseDto> {
		const link = await this.paymentLinkService.findByShortCode(shortCode);
		if (!link) {
			throw new HttpException('Payment link not found', HttpStatus.NOT_FOUND);
		}
		// Return the link with isActive status so frontend can show appropriate UI
		return link;
	}

	@Public()
	@Post(':shortCode/generate-qr')
	@ApiOperation({ summary: 'Generate new QR code for payment link (public)' })
	@ApiResponse({ status: 200, description: 'Returns new QR code data or indicates tax number is needed' })
	async generateQRCode(
		@Param('shortCode') shortCode: string,
		@Body() body: GenerateQRCodeDto,
	): Promise<QRCodeResponseDto> {
		return this.paymentLinkService.generateQRCode(shortCode, body?.amount);
	}

	@Public()
	@Post(':shortCode/validate-tax-number')
	@ApiOperation({ summary: 'Validate CPF/CNPJ and generate QR code' })
	@ApiResponse({ status: 200, description: 'Returns QR code with tax number validation' })
	@ApiResponse({ status: 400, description: 'Invalid tax number' })
	async generateQRCodeWithTaxNumber(
		@Param('shortCode') shortCode: string,
		@Body() body: GenerateQRWithTaxNumberDto,
	): Promise<QRCodeResponseDto> {
		return this.paymentLinkService.generateQRCodeWithTaxNumber(shortCode, body);
	}

	@Public()
	@Get(':shortCode/status/:transactionId')
	@ApiOperation({ summary: 'Check payment status (public)' })
	@ApiResponse({ status: 200, description: 'Returns payment status' })
	async checkPaymentStatus(
		@Param('shortCode') shortCode: string,
		@Param('transactionId') transactionId: string,
	): Promise<{ status: string; paid: boolean }> {
		return this.paymentLinkService.checkPaymentStatus(transactionId);
	}
}
