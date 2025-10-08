import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  SetMetadata,
} from '@nestjs/common';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { ConfirmDonationDto } from './dto/confirm-donation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Controller({
  path: 'donations',
  version: '1',
})
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Public()
  @Post()
  create(@Body() createDonationDto: CreateDonationDto, @Request() req) {
    const userId = req.user?.id;
    return this.donationsService.create(createDonationDto, userId);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 20;
    return this.donationsService.findAll(pageNumber, limitNumber);
  }

  @Get('stats')
  getStats() {
    return this.donationsService.getStats();
  }

  @Get('admin/pending-count')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getPendingCount() {
    return this.donationsService.getPendingCount();
  }

  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit: string = '10') {
    const limitNumber = parseInt(limit, 10) || 10;
    return this.donationsService.getLeaderboard(limitNumber);
  }

  // Admin endpoints (require authentication and admin role) - MUST BE BEFORE :id route
  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAllForAdmin(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 20;
    return this.donationsService.findAllForAdmin(pageNumber, limitNumber, status as any);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.donationsService.findOne(id);
  }

  @Public()
  @Patch(':id/confirm')
  confirmDonation(
    @Param('id') id: string,
    @Body() confirmDonationDto: ConfirmDonationDto,
  ) {
    return this.donationsService.confirmDonation(id, confirmDonationDto);
  }

  @Patch('admin/:id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  approveDonation(
    @Param('id') id: string,
    @Request() req,
  ) {
    const adminUserId = req.user.id;
    return this.donationsService.approveDonation(id, adminUserId);
  }

  @Patch('admin/:id/reject')
  @UseGuards(JwtAuthGuard, AdminGuard)
  rejectDonation(
    @Param('id') id: string,
    @Request() req,
    @Body() body?: { reason?: string },
  ) {
    const adminUserId = req.user.id;
    return this.donationsService.rejectDonation(id, adminUserId, body?.reason);
  }
}