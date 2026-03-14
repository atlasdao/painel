import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReferralService } from './referral.service';

@Injectable()
export class ReferralCronService {
	private readonly logger = new Logger(ReferralCronService.name);

	constructor(private readonly referralService: ReferralService) {}

	/**
	 * Update sales for all pending referrals - runs every hour
	 */
	@Cron(CronExpression.EVERY_HOUR)
	async updatePendingReferralSales() {
		this.logger.log('[CRON] Starting pending referral sales update...');

		try {
			await this.referralService.updatePendingReferralSales();
			this.logger.log('[CRON] Pending referral sales update completed');
		} catch (error) {
			this.logger.error('[CRON] Error updating pending referral sales:', error);
		}
	}

	/**
	 * Expire old referrals past deadline - runs daily at midnight
	 */
	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async expireOldReferrals() {
		this.logger.log('[CRON] Starting referral expiration check...');

		try {
			await this.referralService.expireOldReferrals();
			this.logger.log('[CRON] Referral expiration check completed');
		} catch (error) {
			this.logger.error('[CRON] Error expiring old referrals:', error);
		}
	}

	/**
	 * Manual trigger for testing purposes
	 */
	async manualUpdate() {
		this.logger.log('[MANUAL] Triggering manual referral update...');
		await this.referralService.updatePendingReferralSales();
		await this.referralService.expireOldReferrals();
		this.logger.log('[MANUAL] Manual referral update completed');
	}
}
