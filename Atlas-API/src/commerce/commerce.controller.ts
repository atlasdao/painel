import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { CommerceService } from './commerce.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  CreateCommerceApplicationDto,
  UpdateApplicationStatusDto,
  CommerceApplicationStatus,
} from './dto/commerce.dto';

@Controller({
  path: 'commerce',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class CommerceController {
  private readonly logger = new Logger(CommerceController.name);

  constructor(private readonly commerceService: CommerceService) {}

  @Post('application')
  @HttpCode(HttpStatus.CREATED)
  async createApplication(
    @Request() req,
    @Body() dto: CreateCommerceApplicationDto,
  ) {
    this.logger.log(`Creating commerce application for user ${req.user.id}`);
    return this.commerceService.createApplication(req.user.id, dto);
  }

  @Get('application')
  async getMyApplication(@Request() req) {
    this.logger.log(`Fetching application for user ${req.user.id}`);
    return this.commerceService.getApplication(req.user.id);
  }

  @Get('application/status')
  async getApplicationStatus(@Request() req) {
    this.logger.log(`Checking application status for user ${req.user.id}`);
    return this.commerceService.getUserApplicationStatus(req.user.id);
  }

  @Post('deposit/:transactionId')
  @HttpCode(HttpStatus.OK)
  async processDeposit(
    @Request() req,
    @Param('transactionId') transactionId: string,
  ) {
    this.logger.log(
      `Processing deposit for user ${req.user.id} with transaction ${transactionId}`,
    );
    return this.commerceService.processDeposit(req.user.id, transactionId);
  }

  @Get('refund/eligibility')
  async checkRefundEligibility(@Request() req) {
    this.logger.log(`Checking refund eligibility for user ${req.user.id}`);
    return this.commerceService.checkRefundEligibility(req.user.id);
  }

  // Admin endpoints
  @Get('admin/applications')
  @UseGuards(AdminGuard)
  async getAllApplications(
    @Query('status') status?: CommerceApplicationStatus,
  ) {
    this.logger.log(`Admin fetching all applications with status: ${status}`);
    return this.commerceService.getAllApplications(status);
  }

  @Put('admin/application/:id/status')
  @UseGuards(AdminGuard)
  async updateApplicationStatus(
    @Request() req,
    @Param('id') applicationId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    this.logger.log(
      `Admin ${req.user.id} updating application ${applicationId} status to ${dto.status}`,
    );
    return this.commerceService.updateApplicationStatus(
      applicationId,
      req.user.id,
      dto,
    );
  }

  @Post('admin/refund/:userId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async processRefund(
    @Request() req,
    @Param('userId') userId: string,
  ) {
    this.logger.log(
      `Admin ${req.user.id} processing refund for user ${userId}`,
    );
    return this.commerceService.processRefund(userId, req.user.id);
  }
}