import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { EulenService } from './eulen.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { Public } from '../common/decorators/public.decorator';
import { RequireScope } from '../common/decorators/scope.decorator';
import { DepositDto, TransactionResponseDto } from './dto/eulen.dto';

@Controller()
@UseGuards(JwtAuthGuard, ScopeGuard)
export class EulenController {
	constructor(private readonly eulenService: EulenService) {}

	@Get('ping')
	@Public()
	async ping() {
		return this.eulenService.ping();
	}

	@Post('deposit')
	@RequireScope('deposit')
	async deposit(
		@Body() depositDto: DepositDto,
	): Promise<TransactionResponseDto> {
		return this.eulenService.deposit(depositDto);
	}

	@Get('deposit-status')
	@RequireScope('deposit')
	async getDepositStatus(
		@Query('transactionId') transactionId: string,
	): Promise<TransactionResponseDto> {
		return this.eulenService.getDepositStatus(transactionId);
	}
}
