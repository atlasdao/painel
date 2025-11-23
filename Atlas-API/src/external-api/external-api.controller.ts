import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ExternalApiService } from './external-api.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Public } from '../common/decorators/public.decorator';
import { CreatePixDto, CreatePixResponseDto } from './dto/create-pix.dto';

@ApiTags('External API')
@ApiSecurity('api_key')
@Controller('external')
@UseGuards(ApiKeyGuard)
export class ExternalApiController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  // ===== PIX ENDPOINTS =====

  @Post('pix/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a PIX transaction with optional webhook configuration' })
  @ApiBody({ type: CreatePixDto })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
    type: CreatePixResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Invalid API Key' })
  @ApiResponse({ status: 403, description: 'Forbidden - Check API Key permissions' })
  async createPixTransaction(@Req() req: any, @Body() body: CreatePixDto) {
    const userId = req.user.id;
    const apiKeyId = req.apiKeyId; // This should be set by the ApiKeyGuard

    // Validate required fields
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // taxNumber is required only for amounts >= 3000 BRL
    if (body.amount >= 3000 && !body.taxNumber) {
      throw new BadRequestException('Tax number (CPF/CNPJ) is required for amounts equal to or above R$ 3000');
    }

    return this.externalApiService.createPixTransaction(userId, apiKeyId, body);
  }

  @Get('pix/status/:id')
  @ApiOperation({ summary: 'Get transaction status by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionStatus(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.externalApiService.getTransactionStatus(userId, id);
  }

  @Get('pix/transactions')
  @ApiOperation({ summary: 'List transactions with filters' })
  @ApiQuery({ name: 'status', required: false, description: 'Transaction status' })
  @ApiQuery({ name: 'type', required: false, description: 'Transaction type' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'merchantOrderId', required: false, description: 'Merchant order ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20, max: 100)' })
  async listTransactions(@Req() req: any, @Query() query: any) {
    const userId = req.user.id;
    return this.externalApiService.listTransactions(userId, query);
  }

  @Delete('pix/cancel/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found or already processed' })
  async cancelTransaction(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.externalApiService.cancelTransaction(userId, id);
  }

  // ===== PAYMENT LINK ENDPOINTS =====

  @Post('payment-links')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a payment link' })
  @ApiResponse({ status: 201, description: 'Payment link created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Payment links not enabled for user' })
  async createPaymentLink(@Req() req: any, @Body() body: any) {
    const userId = req.user.id;

    // Validate required fields
    if (!body.title) {
      throw new BadRequestException('Title is required');
    }

    if (!body.isCustomAmount && (!body.amount || body.amount <= 0)) {
      throw new BadRequestException('Amount must be greater than 0 for fixed amount links');
    }

    return this.externalApiService.createPaymentLink(userId, body);
  }

  @Get('payment-links')
  @ApiOperation({ summary: 'List payment links' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20, max: 100)' })
  async listPaymentLinks(@Req() req: any, @Query() query: any) {
    const userId = req.user.id;
    return this.externalApiService.listPaymentLinks(userId, query);
  }

  @Get('payment-links/:id')
  @ApiOperation({ summary: 'Get payment link details' })
  @ApiParam({ name: 'id', description: 'Payment link ID' })
  @ApiResponse({ status: 200, description: 'Payment link details' })
  @ApiResponse({ status: 404, description: 'Payment link not found' })
  async getPaymentLink(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.externalApiService.getPaymentLink(userId, id);
  }

  // ===== STATS & MONITORING =====

  @Get('stats/usage')
  @ApiOperation({ summary: 'Get API usage statistics' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to include (default: 30, max: 90)' })
  @ApiResponse({ status: 200, description: 'API usage statistics' })
  async getUsageStats(@Req() req: any, @Query('days') days?: string) {
    const userId = req.user.id;
    const daysNum = Math.min(parseInt(days || '30'), 90);
    return this.externalApiService.getApiUsageStats(userId, daysNum);
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'Atlas External API',
    };
  }

  // ===== USER PROFILE (with API Key) =====

  @Get('profile')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile information' })
  async getProfile(@Req() req: any) {
    const user = req.user;

    // Return limited user information for API consumers
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      commerceMode: user.commerceMode,
      paymentLinksEnabled: user.paymentLinksEnabled,
      isAccountValidated: user.isAccountValidated,
      createdAt: user.createdAt,
    };
  }
}