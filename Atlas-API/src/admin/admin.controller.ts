import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionCleanupService } from '../services/transaction-cleanup.service';
import { TransactionStatus, TransactionType, UserRole } from '@prisma/client';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly transactionCleanupService: TransactionCleanupService,
  ) {}

  // Middleware to check admin role
  private checkAdminRole(user: any) {
    // Check both 'roles' array and 'role' field with UserRole enum
    const isAdminInRoles = user.roles?.some((r: string) => r === UserRole.ADMIN);
    const isAdminInRole = user.role === UserRole.ADMIN;
    
    if (!isAdminInRoles && !isAdminInRole) {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getAllUsers(
    @Req() req: any,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.getAllUsers({ skip, take, isActive });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getUserById(
    @Req() req: any,
    @Param('id') userId: string,
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.getUserById(userId);
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Update user status (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async updateUserStatus(
    @Req() req: any,
    @Param('id') userId: string,
    @Body('isActive') isActive: boolean,
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.updateUserStatus(userId, isActive);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async updateUser(
    @Req() req: any,
    @Param('id') userId: string,
    @Body() data: any,
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.updateUser(userId, data);
  }

  @Post('users/:id/generate-api-key')
  @ApiOperation({ summary: 'Generate API key for user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'API key generated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 409, description: 'User already has an API key' })
  async generateUserApiKey(
    @Req() req: any,
    @Param('id') userId: string,
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.generateUserApiKey(userId);
  }

  @Delete('users/:id/apikey')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke user API key (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'API key revoked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async revokeUserApiKey(
    @Req() req: any,
    @Param('id') userId: string,
  ) {
    this.checkAdminRole(req.user);
    await this.adminService.revokeUserApiKey(userId);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Admin access required or user has pending transactions' })
  async deleteUser(
    @Req() req: any,
    @Param('id') userId: string,
  ) {
    this.checkAdminRole(req.user);
    await this.adminService.deleteUser(userId);
  }

  @Get('users/:id/stats')
  @ApiOperation({ summary: 'Get statistics for a specific user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getUserStatsById(
    @Req() req: any,
    @Param('id') userId: string,
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.getUserStatsById(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all transactions (Admin only)' })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Alias for take' })
  @ApiQuery({ name: 'offset', type: Number, required: false, description: 'Alias for skip' })
  @ApiQuery({ name: 'status', enum: TransactionStatus, required: false })
  @ApiQuery({ name: 'type', enum: TransactionType, required: false })
  @ApiQuery({ name: 'userId', type: String, required: false })
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getAllTransactions(
    @Req() req: any,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: TransactionStatus,
    @Query('type') type?: TransactionType,
    @Query('userId') userId?: string,
  ) {
    this.checkAdminRole(req.user);
    // Use limit/offset as aliases for take/skip
    const finalTake = take !== undefined ? take : limit;
    const finalSkip = skip !== undefined ? skip : offset;
    return this.adminService.getAllTransactions({
      skip: finalSkip,
      take: finalTake,
      status,
      type,
      userId,
    });
  }

  @Put('transactions/:id/status')
  @ApiOperation({ summary: 'Update transaction status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction status updated' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async updateTransactionStatus(
    @Req() req: any,
    @Param('id') transactionId: string,
    @Body() data: { status: TransactionStatus; errorMessage?: string },
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.updateTransactionStatus(
      transactionId,
      data.status,
      data.errorMessage,
    );
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs (Admin only)' })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  @ApiQuery({ name: 'userId', type: String, required: false })
  @ApiQuery({ name: 'action', type: String, required: false })
  @ApiQuery({ name: 'resource', type: String, required: false })
  @ApiQuery({ name: 'startDate', type: Date, required: false })
  @ApiQuery({ name: 'endDate', type: Date, required: false })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getAuditLogs(
    @Req() req: any,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.getAuditLogs({
      skip,
      take,
      userId,
      action,
      resource,
      startDate,
      endDate,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getSystemStats(@Req() req: any) {
    this.checkAdminRole(req.user);
    return this.adminService.getSystemStats();
  }

  @Get('stats/users')
  @ApiOperation({ summary: 'Get user statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getUserStats(@Req() req: any) {
    this.checkAdminRole(req.user);
    return this.adminService.getUserStats();
  }

  @Get('stats/audit')
  @ApiOperation({ summary: 'Get audit statistics (Admin only)' })
  @ApiQuery({ name: 'startDate', type: Date, required: false })
  @ApiQuery({ name: 'endDate', type: Date, required: false })
  @ApiResponse({ status: 200, description: 'Audit statistics retrieved' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getAuditStats(
    @Req() req: any,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.getAuditStats(startDate, endDate);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getDashboardStats(@Req() req: any) {
    this.checkAdminRole(req.user);
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/data')
  @ApiOperation({ summary: 'Get dashboard data (Admin only)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Limit for recent transactions' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getDashboardData(
    @Req() req: any,
    @Query('limit') limit: number = 5,
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.getDashboardData(limit);
  }

  // ===== USER LIMITS MANAGEMENT (MED COMPLIANCE) =====

  @Get('users/limits')
  @ApiTags('Admin - User Limits')
  @ApiOperation({ summary: 'Get all users with their transaction limits (Admin only)' })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  @ApiQuery({ name: 'isFirstDay', type: Boolean, required: false })
  @ApiQuery({ name: 'isKycVerified', type: Boolean, required: false })
  @ApiQuery({ name: 'isHighRiskUser', type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'Users with limits retrieved' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getAllUsersWithLimits(
    @Req() req: any,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('isFirstDay') isFirstDay?: boolean,
    @Query('isKycVerified') isKycVerified?: boolean,
    @Query('isHighRiskUser') isHighRiskUser?: boolean,
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.getAllUsersWithLimits({
      skip,
      take,
      isFirstDay,
      isKycVerified,
      isHighRiskUser,
    });
  }

  @Get('users/:id/limits')
  @ApiTags('Admin - User Limits')
  @ApiOperation({ summary: 'Get user limits and usage (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User limits retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getUserLimits(
    @Req() req: any,
    @Param('id') userId: string,
  ) {
    this.checkAdminRole(req.user);
    return this.adminService.getUserLimits(userId);
  }

  @Put('users/:id/limits')
  @ApiTags('Admin - User Limits')
  @ApiOperation({ summary: 'Update user transaction limits (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User limits updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async updateUserLimits(
    @Req() req: any,
    @Param('id') userId: string,
    @Body() updateLimitsDto: {
      dailyDepositLimit?: number;
      dailyWithdrawLimit?: number;
      dailyTransferLimit?: number;
      maxDepositPerTx?: number;
      maxWithdrawPerTx?: number;
      maxTransferPerTx?: number;
      monthlyDepositLimit?: number;
      monthlyWithdrawLimit?: number;
      monthlyTransferLimit?: number;
      isKycVerified?: boolean;
      isHighRiskUser?: boolean;
      notes?: string;
    },
  ) {
    this.checkAdminRole(req.user);
    const adminId = req.user.sub || req.user.id;
    return this.adminService.updateUserLimits(userId, updateLimitsDto, adminId);
  }

  @Post('users/:id/limits/reset-first-day')
  @ApiTags('Admin - User Limits')
  @ApiOperation({ summary: 'Reset user first day status (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'First day status reset' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async resetUserFirstDay(
    @Req() req: any,
    @Param('id') userId: string,
  ) {
    this.checkAdminRole(req.user);
    const adminId = req.user.sub || req.user.id;
    return this.adminService.resetUserFirstDay(userId, adminId);
  }

  @Post('users/:id/limits/apply-kyc-limits')
  @ApiTags('Admin - User Limits')
  @ApiOperation({ summary: 'Apply KYC verified limits to user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'KYC limits applied' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async applyKycLimits(
    @Req() req: any,
    @Param('id') userId: string,
  ) {
    this.checkAdminRole(req.user);
    const adminId = req.user.sub || req.user.id;
    return this.adminService.applyKycLimits(userId, adminId);
  }

  // ===== SYSTEM CONFIGURATION =====

  @Put('system/eulen-token')
  @ApiTags('Admin - System Configuration')
  @ApiOperation({ summary: 'Update Eulen API JWT token (Admin only)' })
  @ApiResponse({ status: 200, description: 'Eulen token updated successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 400, description: 'Invalid token format' })
  async updateEulenToken(
    @Req() req: any,
    @Body() data: { token: string },
  ): Promise<{ message: string }> {
    this.checkAdminRole(req.user);
    return this.adminService.updateEulenToken(data.token);
  }

  // ===== TRANSACTION CLEANUP =====

  @Get('transactions/cleanup/stats')
  @ApiTags('Admin - Transaction Cleanup')
  @ApiOperation({ summary: 'Get transaction cleanup statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transaction cleanup statistics' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getTransactionCleanupStats(@Req() req: any) {
    this.checkAdminRole(req.user);
    return this.transactionCleanupService.getTransactionStats();
  }

  @Post('transactions/cleanup/manual')
  @ApiTags('Admin - Transaction Cleanup')
  @ApiOperation({ summary: 'Manually trigger transaction cleanup (Admin only)' })
  @ApiResponse({ status: 200, description: 'Manual cleanup completed' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @HttpCode(HttpStatus.OK)
  async manualTransactionCleanup(@Req() req: any): Promise<{ 
    message: string; 
    expiredCount: number; 
    timestamp: string; 
  }> {
    this.checkAdminRole(req.user);
    const expiredCount = await this.transactionCleanupService.manualCleanup();
    
    return {
      message: 'Manual transaction cleanup completed',
      expiredCount,
      timestamp: new Date().toISOString(),
    };
  }
}