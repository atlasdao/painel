import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  Logger,
  Get,
  Query,
  UseGuards
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { WebhookDepositEventDto, WebhookEventResponseDto } from '../common/dto/webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('deposit')
  @Public() // Webhooks should be public endpoints
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Receive deposit webhook events from Eulen API',
    description: 'This endpoint receives webhook notifications when deposit transactions are processed by Eulen/Fitbank'
  })
  @ApiBody({ 
    type: WebhookDepositEventDto,
    description: 'Deposit event data from Eulen API'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Webhook processed successfully',
    type: WebhookEventResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - invalid webhook data'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Transaction not found for the provided qrId'
  })
  async receiveDepositWebhook(
    @Body() eventData: WebhookDepositEventDto
  ): Promise<WebhookEventResponseDto> {
    this.logger.log(`🔔 WEBHOOK ENDPOINT: Received deposit event for qrId: ${eventData.qrId}`);
    
    return await this.webhookService.processDepositWebhook(eventData);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get webhook processing statistics',
    description: 'Returns statistics about webhook events processed by the system (Admin only)'
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for statistics (ISO 8601 format)',
    example: '2025-01-01T00:00:00Z'
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for statistics (ISO 8601 format)',
    example: '2025-12-31T23:59:59Z'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Webhook statistics retrieved successfully'
  })
  async getWebhookStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return await this.webhookService.getWebhookStats(start, end);
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Test webhook endpoint with sample data',
    description: 'Allows admins to test the webhook functionality with sample data (Admin only)'
  })
  @ApiBody({ 
    type: WebhookDepositEventDto,
    description: 'Test webhook data'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Test webhook processed successfully'
  })
  async testWebhook(
    @Body() eventData: WebhookDepositEventDto
  ): Promise<WebhookEventResponseDto> {
    this.logger.log(`🧪 TEST WEBHOOK: Processing test event for qrId: ${eventData.qrId}`);
    
    return await this.webhookService.processDepositWebhook(eventData);
  }
}