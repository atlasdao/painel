import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseGuards,
	Request,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, AdminGuard)
export class CouponsController {
	constructor(private readonly couponsService: CouponsService) {}

	@Post()
	create(@Body() createCouponDto: CreateCouponDto, @Request() req) {
		return this.couponsService.create(createCouponDto, req.user.id);
	}

	@Get()
	findAll() {
		return this.couponsService.findAll();
	}

	@Get('stats')
	getStats() {
		return this.couponsService.getStats();
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.couponsService.findOne(id);
	}

	@Patch(':id')
	update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
		return this.couponsService.update(id, updateCouponDto);
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.couponsService.delete(id);
	}
}
