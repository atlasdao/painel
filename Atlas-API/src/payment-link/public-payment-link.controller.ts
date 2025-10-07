import {
  Controller,
  Get,
  Post,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaymentLinkService } from './payment-link.service';
import { PaymentLinkResponseDto } from './dto/payment-link.dto';
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
    return link;
  }

  @Public()
  @Post(':shortCode/generate-qr')
  @ApiOperation({ summary: 'Generate new QR code for payment link (public)' })
  @ApiResponse({ status: 200, description: 'Returns new QR code data' })
  async generateQRCode(
    @Param('shortCode') shortCode: string,
  ): Promise<{ qrCode: string; expiresAt: Date }> {
    return this.paymentLinkService.generateQRCode(shortCode);
  }
}