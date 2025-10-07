import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { IsNumber, IsBoolean, IsOptional } from 'class-validator';

class UpdateMedLimitsDto {
  @IsNumber()
  @IsOptional()
  dailyDepositLimit?: number;

  @IsNumber()
  @IsOptional()
  dailyWithdrawLimit?: number;

  @IsNumber()
  @IsOptional()
  monthlyDepositLimit?: number;

  @IsNumber()
  @IsOptional()
  monthlyWithdrawLimit?: number;

  @IsNumber()
  @IsOptional()
  maxTransactionAmount?: number;

  @IsBoolean()
  @IsOptional()
  requiresKyc?: boolean;

  @IsNumber()
  @IsOptional()
  firstDayLimit?: number;
}

@ApiTags('Admin - MED Limits')
@Controller('admin/med-limits')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class MedLimitsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get current MED limits configuration' })
  @ApiResponse({ status: 200, description: 'Returns MED limits' })
  async getMedLimits() {
    // Get from database or return defaults
    const settings = await this.prisma.systemSettings.findFirst({
      where: { key: 'MED_LIMITS' },
    });

    if (settings && settings.value) {
      return JSON.parse(settings.value);
    }

    // Return default limits
    return {
      dailyDepositLimit: 1000,
      dailyWithdrawLimit: 1000,
      monthlyDepositLimit: 10000,
      monthlyWithdrawLimit: 10000,
      maxTransactionAmount: 5000,
      requiresKyc: false,
      firstDayLimit: 500,
    };
  }

  @Put()
  @ApiOperation({ summary: 'Update MED limits configuration' })
  @ApiResponse({ status: 200, description: 'MED limits updated successfully' })
  async updateMedLimits(@Body() dto: UpdateMedLimitsDto) {
    try {
      console.log('MED Limits update requested:', JSON.stringify(dto));
      
      // Validate input data
      if (dto.dailyDepositLimit !== undefined && dto.dailyDepositLimit <= 0) {
        throw new HttpException('Daily deposit limit must be positive', HttpStatus.BAD_REQUEST);
      }
      if (dto.dailyWithdrawLimit !== undefined && dto.dailyWithdrawLimit <= 0) {
        throw new HttpException('Daily withdraw limit must be positive', HttpStatus.BAD_REQUEST);
      }
      if (dto.monthlyDepositLimit !== undefined && dto.monthlyDepositLimit <= 0) {
        throw new HttpException('Monthly deposit limit must be positive', HttpStatus.BAD_REQUEST);
      }
      if (dto.monthlyWithdrawLimit !== undefined && dto.monthlyWithdrawLimit <= 0) {
        throw new HttpException('Monthly withdraw limit must be positive', HttpStatus.BAD_REQUEST);
      }
      if (dto.maxTransactionAmount !== undefined && dto.maxTransactionAmount <= 0) {
        throw new HttpException('Max transaction amount must be positive', HttpStatus.BAD_REQUEST);
      }
      if (dto.firstDayLimit !== undefined && dto.firstDayLimit <= 0) {
        throw new HttpException('First day limit must be positive', HttpStatus.BAD_REQUEST);
      }

      // Upsert settings in database
      await this.prisma.systemSettings.upsert({
        where: { key: 'MED_LIMITS' },
        update: {
          value: JSON.stringify(dto),
          updatedAt: new Date(),
        },
        create: {
          key: 'MED_LIMITS',
          value: JSON.stringify(dto),
          description: 'MED regulatory limits configuration',
        },
      });

      console.log('MED Limits updated successfully');

      return {
        message: 'MED limits updated successfully',
        limits: dto,
      };
    } catch (error) {
      console.error('Error updating MED limits:', error);
      
      // If it's already an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to update MED limits: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}