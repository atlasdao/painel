import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaymentLinkService } from './payment-link.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentLinkDto, PaymentLinkResponseDto } from './dto/payment-link.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payment Links')
@Controller('payment-links')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentLinkController {
  constructor(private readonly paymentLinkService: PaymentLinkService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment link' })
  @ApiResponse({ status: 201, description: 'Payment link created successfully' })
  async createPaymentLink(
    @Req() req: any,
    @Body() dto: CreatePaymentLinkDto,
  ): Promise<PaymentLinkResponseDto> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.paymentLinkService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payment links for current user' })
  @ApiResponse({ status: 200, description: 'Returns all payment links' })
  async getMyPaymentLinks(@Req() req: any): Promise<PaymentLinkResponseDto[]> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.paymentLinkService.findByUserId(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment link' })
  @ApiResponse({ status: 200, description: 'Payment link deleted successfully' })
  async deletePaymentLink(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    await this.paymentLinkService.delete(id, userId);
    return { message: 'Payment link deleted successfully' };
  }
}