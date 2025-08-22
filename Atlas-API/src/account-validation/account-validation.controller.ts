import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AccountValidationService } from './account-validation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

class CreateValidationPaymentDto {
  @IsString()
  depixAddress: string;
}

class AdjustUserLimitsDto {
  @IsNumber()
  @IsOptional()
  dailyLimit?: number;

  @IsNumber()
  @IsOptional()
  tier?: number;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}

class ValidationSettingsDto {
  @IsOptional()
  validationEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  validationAmount?: number;

  @IsNumber()
  @IsOptional()
  initialDailyLimit?: number;

  @IsOptional()
  limitTiers?: number[];

  @IsOptional()
  thresholdTiers?: number[];
}

@ApiTags('Account Validation')
@Controller({ path: 'account-validation', version: '1' })
@ApiBearerAuth()
export class AccountValidationController {
  constructor(
    private readonly accountValidationService: AccountValidationService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check account validation status' })
  @ApiResponse({ status: 200, description: 'Returns validation status' })
  async getValidationStatus(@Req() req: any) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User not authenticated or user ID not found in request');
    }
    
    return this.accountValidationService.checkValidationStatus(req.user.id);
  }

  @Get('requirements')
  @ApiOperation({ summary: 'Get validation requirements' })
  @ApiResponse({ status: 200, description: 'Returns validation requirements' })
  async getValidationRequirements() {
    return this.accountValidationService.getValidationRequirements();
  }

  @Post('create-payment')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create validation payment' })
  @ApiResponse({ status: 201, description: 'Validation payment created' })
  async createValidationPayment(
    @Req() req: any,
    @Body() dto: CreateValidationPaymentDto,
  ) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User not authenticated or user ID not found in request');
    }
    
    return this.accountValidationService.createValidationPayment(
      req.user.id,
      dto.depixAddress,
    );
  }

  @Get('limits')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user limits and reputation' })
  @ApiResponse({ status: 200, description: 'Returns user limits and reputation' })
  async getUserLimits(@Req() req: any) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User not authenticated or user ID not found in request');
    }
    
    return this.accountValidationService.getUserLimitsAndReputation(req.user.id);
  }

  @Get('debug-status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Debug validation status with detailed info' })
  @ApiResponse({ status: 200, description: 'Returns detailed validation debug info' })
  async getDebugValidationStatus(@Req() req: any) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User not authenticated or user ID not found in request');
    }
    
    return this.accountValidationService.getDetailedValidationStatus(req.user.id);
  }

  @Post('manual-check')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Manually trigger validation check' })
  @ApiResponse({ status: 200, description: 'Manual validation check triggered' })
  async manualValidationCheck(@Req() req: any) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('User not authenticated or user ID not found in request');
    }
    
    return this.accountValidationService.manualValidationCheck(req.user.id);
  }

  // Admin endpoints
  @Put('user/:userId/limits')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Adjust user limits (Admin only)' })
  @ApiResponse({ status: 200, description: 'User limits adjusted' })
  async adjustUserLimits(
    @Param('userId') userId: string,
    @Body() dto: AdjustUserLimitsDto,
  ) {
    await this.accountValidationService.adjustUserLimits(
      userId,
      dto.dailyLimit,
      dto.tier,
      dto.adminNotes,
    );
    return { success: true, message: 'User limits adjusted successfully' };
  }

  @Get('settings')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get validation settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns validation settings' })
  async getValidationSettings() {
    return this.accountValidationService.getValidationSettings();
  }

  @Put('settings')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update validation settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Validation settings updated' })
  async updateValidationSettings(@Body() dto: ValidationSettingsDto) {
    await this.accountValidationService.updateValidationSettings(dto);
    return { success: true, message: 'Validation settings updated successfully' };
  }
}