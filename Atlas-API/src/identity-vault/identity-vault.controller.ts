import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getEffectiveUserId } from '../common/decorators/effective-user.decorator';
import {
	IdentityVaultService,
	MerchantContactSuggestion,
} from './identity-vault.service';

@ApiTags('Identity Vault')
@Controller('identity-vault')
export class IdentityVaultController {
	constructor(private readonly identityVaultService: IdentityVaultService) {}

	@Get('contacts/search')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Search merchant-scoped payer contacts' })
	@ApiQuery({ name: 'q', required: true })
	async searchContacts(
		@Req() req: any,
		@Query('q') query: string,
	): Promise<MerchantContactSuggestion[]> {
		const merchantId = getEffectiveUserId(req);
		return this.identityVaultService.searchMerchantContacts(merchantId, query || '');
	}
}
