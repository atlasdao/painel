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
  Query,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../auth/guards/api-key-auth.guard';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookResponseDto,
  TestWebhookDto,
  WebhookEventResponseDto,
} from './dto/webhook.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';

@ApiTags('Webhooks')
@Controller({ path: 'payment-link', version: '1' })
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  // Endpoints protegidos por JWT (interface web)

  @Post(':linkId/webhook')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar webhook para link de pagamento' })
  @ApiResponse({
    status: 201,
    description: 'Webhook criado com sucesso',
    type: WebhookResponseDto,
  })
  async createWebhook(
    @Req() req: any,
    @Param('linkId') linkId: string,
    @Body() dto: CreateWebhookDto,
  ): Promise<WebhookResponseDto> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.createWebhook(linkId, userId, dto);
  }

  @Get(':linkId/webhooks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar webhooks do link de pagamento' })
  @ApiResponse({
    status: 200,
    description: 'Lista de webhooks',
    type: [WebhookResponseDto],
  })
  async getWebhooks(
    @Req() req: any,
    @Param('linkId') linkId: string,
  ): Promise<WebhookResponseDto[]> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.getWebhooks(linkId, userId);
  }

  @Get('webhook/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes do webhook' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do webhook',
    type: WebhookResponseDto,
  })
  async getWebhookById(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<WebhookResponseDto> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.getWebhookById(id, userId);
  }

  @Patch('webhook/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar webhook' })
  @ApiResponse({
    status: 200,
    description: 'Webhook atualizado com sucesso',
    type: WebhookResponseDto,
  })
  async updateWebhook(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ): Promise<WebhookResponseDto> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.updateWebhook(id, userId, dto);
  }

  @Delete('webhook/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar webhook' })
  @ApiResponse({
    status: 200,
    description: 'Webhook deletado com sucesso',
  })
  async deleteWebhook(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.webhookService.deleteWebhook(id, userId);
    return { message: 'Webhook deletado com sucesso' };
  }

  @Post('webhook/:id/test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Testar webhook' })
  @ApiResponse({
    status: 200,
    description: 'Resultado do teste do webhook',
  })
  async testWebhook(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: TestWebhookDto,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.testWebhook(id, userId, dto.eventType);
  }

  @Get(':linkId/webhook-events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar eventos de webhook' })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos de webhook',
    type: [WebhookEventResponseDto],
  })
  async getWebhookEvents(
    @Req() req: any,
    @Param('linkId') linkId: string,
    @Query('webhookId') webhookId?: string,
  ): Promise<WebhookEventResponseDto[]> {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.getWebhookEvents(linkId, userId, webhookId);
  }

  // Endpoints protegidos por API Key (acesso programático)

  @Post('api-key/:linkId/webhook')
  @UseGuards(ApiKeyAuthGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: '[API Key] Criar webhook para link de pagamento' })
  @ApiResponse({
    status: 201,
    description: 'Webhook criado com sucesso',
    type: WebhookResponseDto,
  })
  async createWebhookWithApiKey(
    @Req() req: any,
    @Param('linkId') linkId: string,
    @Body() dto: CreateWebhookDto,
  ): Promise<WebhookResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.createWebhook(linkId, userId, dto);
  }

  @Get('api-key/:linkId/webhooks')
  @UseGuards(ApiKeyAuthGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: '[API Key] Listar webhooks do link de pagamento' })
  @ApiResponse({
    status: 200,
    description: 'Lista de webhooks',
    type: [WebhookResponseDto],
  })
  async getWebhooksWithApiKey(
    @Req() req: any,
    @Param('linkId') linkId: string,
  ): Promise<WebhookResponseDto[]> {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.getWebhooks(linkId, userId);
  }

  @Get('api-key/webhook/:id')
  @UseGuards(ApiKeyAuthGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: '[API Key] Obter detalhes do webhook' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do webhook',
    type: WebhookResponseDto,
  })
  async getWebhookByIdWithApiKey(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<WebhookResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.getWebhookById(id, userId);
  }

  @Patch('api-key/webhook/:id')
  @UseGuards(ApiKeyAuthGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: '[API Key] Atualizar webhook' })
  @ApiResponse({
    status: 200,
    description: 'Webhook atualizado com sucesso',
    type: WebhookResponseDto,
  })
  async updateWebhookWithApiKey(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ): Promise<WebhookResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.updateWebhook(id, userId, dto);
  }

  @Delete('api-key/webhook/:id')
  @UseGuards(ApiKeyAuthGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: '[API Key] Deletar webhook' })
  @ApiResponse({
    status: 200,
    description: 'Webhook deletado com sucesso',
  })
  async deleteWebhookWithApiKey(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.webhookService.deleteWebhook(id, userId);
    return { message: 'Webhook deletado com sucesso' };
  }

  @Post('api-key/webhook/:id/test')
  @UseGuards(ApiKeyAuthGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: '[API Key] Testar webhook' })
  @ApiResponse({
    status: 200,
    description: 'Resultado do teste do webhook',
  })
  async testWebhookWithApiKey(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: TestWebhookDto,
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.testWebhook(id, userId, dto.eventType);
  }

  @Get('api-key/:linkId/webhook-events')
  @UseGuards(ApiKeyAuthGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: '[API Key] Listar eventos de webhook' })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos de webhook',
    type: [WebhookEventResponseDto],
  })
  async getWebhookEventsWithApiKey(
    @Req() req: any,
    @Param('linkId') linkId: string,
    @Query('webhookId') webhookId?: string,
  ): Promise<WebhookEventResponseDto[]> {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'Usuário não autenticado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.webhookService.getWebhookEvents(linkId, userId, webhookId);
  }
}