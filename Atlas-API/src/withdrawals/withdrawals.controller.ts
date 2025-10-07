import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { AdminApprovalDto } from './dto/admin-approval.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WithdrawalStatus, WithdrawalMethod, UserRole } from '@prisma/client';

@ApiTags('withdrawals')
@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create withdrawal request' })
  @ApiResponse({ status: 201, description: 'Withdrawal request created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Account not validated' })
  async createWithdrawal(@Request() req, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalsService.createWithdrawal(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user withdrawals' })
  @ApiQuery({ name: 'status', required: false, enum: WithdrawalStatus })
  @ApiResponse({ status: 200, description: 'Returns user withdrawals' })
  async getUserWithdrawals(
    @Request() req,
    @Query('status') status?: WithdrawalStatus
  ) {
    return this.withdrawalsService.getUserWithdrawals(req.user.id, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get withdrawal statistics' })
  @ApiResponse({ status: 200, description: 'Returns withdrawal statistics' })
  async getWithdrawalStats(@Request() req) {
    return this.withdrawalsService.getWithdrawalStats(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get withdrawal by ID' })
  @ApiResponse({ status: 200, description: 'Returns withdrawal details' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async getWithdrawalById(@Request() req, @Param('id') id: string) {
    return this.withdrawalsService.getWithdrawalById(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel withdrawal request' })
  @ApiResponse({ status: 200, description: 'Withdrawal cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel non-pending withdrawal' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async cancelWithdrawal(@Request() req, @Param('id') id: string) {
    return this.withdrawalsService.cancelWithdrawal(id, req.user.id);
  }

  // Admin endpoints
  @Get('admin/all')
  @ApiOperation({ summary: 'Get all withdrawals (Admin)' })
  @ApiQuery({ name: 'status', required: false, enum: WithdrawalStatus })
  @ApiQuery({ name: 'method', required: false, enum: WithdrawalMethod })
  @ApiResponse({ status: 200, description: 'Returns all withdrawals' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getAllWithdrawals(
    @Request() req,
    @Query('status') status?: WithdrawalStatus,
    @Query('method') method?: WithdrawalMethod
  ) {
    console.log(`🔍 Admin getAllWithdrawals called by user: ${req.user.id}, role: ${req.user.role}`);
    
    if (req.user.role !== UserRole.ADMIN) {
      console.log(`❌ Access denied for user ${req.user.id} with role ${req.user.role}`);
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
    }
    
    const result = await this.withdrawalsService.getAllWithdrawals(status, method);
    console.log(`📊 Found ${result.length} withdrawals`);
    return result;
  }

  @Get('admin/pending')
  @ApiOperation({ summary: 'Get pending withdrawals ready for processing (Admin)' })
  @ApiResponse({ status: 200, description: 'Returns pending withdrawals' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getPendingWithdrawals(@Request() req) {
    console.log(`🔍 Admin getPendingWithdrawals called by user: ${req.user.id}, role: ${req.user.role}`);
    
    if (req.user.role !== UserRole.ADMIN) {
      console.log(`❌ Access denied for user ${req.user.id} with role ${req.user.role}`);
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
    }
    
    const result = await this.withdrawalsService.getPendingWithdrawals();
    console.log(`📊 Found ${result.length} pending withdrawals`);
    return result;
  }

  @Get('admin/stats')
  @ApiOperation({ summary: 'Get system-wide withdrawal statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Returns system withdrawal statistics' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getSystemWithdrawalStats(@Request() req) {
    console.log(`🔍 Admin getSystemWithdrawalStats called by user: ${req.user.id}, role: ${req.user.role}`);
    
    if (req.user.role !== UserRole.ADMIN) {
      console.log(`❌ Access denied for user ${req.user.id} with role ${req.user.role}`);
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
    }
    
    const result = await this.withdrawalsService.getWithdrawalStats();
    console.log(`📊 Withdrawal stats:`, result);
    return result;
  }

  @Put('admin/:id/approve')
  @ApiOperation({ summary: 'Approve or reject withdrawal (Admin)' })
  @ApiResponse({ status: 200, description: 'Withdrawal updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async approveOrRejectWithdrawal(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AdminApprovalDto
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
    }
    return this.withdrawalsService.approveOrRejectWithdrawal(id, req.user.id, dto);
  }

  @Post('admin/process')
  @ApiOperation({ summary: 'Process approved withdrawals (Admin)' })
  @ApiResponse({ status: 200, description: 'Processing started' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async processWithdrawals(@Request() req) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
    }
    await this.withdrawalsService.processApprovedWithdrawals();
    return { message: 'Processamento de saques iniciado' };
  }
}