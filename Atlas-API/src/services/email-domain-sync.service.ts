import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { BlockedEmailDomainRepository } from '../repositories/blocked-email-domain.repository';
import axios from 'axios';

@Injectable()
export class EmailDomainSyncService {
	private readonly logger = new Logger(EmailDomainSyncService.name);
	private readonly GITHUB_BLOCKLIST_URL = 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf';
	private isRunning = false;

	constructor(
		private readonly blockedEmailDomainRepository: BlockedEmailDomainRepository,
		private readonly configService: ConfigService,
	) {
		// Run initial sync on service startup
		this.performInitialSync();
	}

	/**
	 * Scheduled task to sync domains daily at 3 AM
	 */
	@Cron(CronExpression.EVERY_DAY_AT_3AM)
	async scheduledDomainSync() {
		this.logger.log('Starting scheduled email domain sync...');
		await this.syncDisposableEmailDomains();
	}

	/**
	 * Manual trigger for domain sync (for admin use)
	 */
	async triggerManualSync(): Promise<{ success: boolean; message: string; stats?: any }> {
		if (this.isRunning) {
			return {
				success: false,
				message: 'Sync already in progress',
			};
		}

		try {
			const stats = await this.syncDisposableEmailDomains();
			return {
				success: true,
				message: 'Sync completed successfully',
				stats,
			};
		} catch (error) {
			this.logger.error('Manual sync failed:', error);
			return {
				success: false,
				message: `Sync failed: ${error.message}`,
			};
		}
	}

	/**
	 * Initial sync on service startup (with delay to avoid startup conflicts)
	 */
	private async performInitialSync() {
		// Wait 30 seconds after startup to avoid database connection issues
		setTimeout(async () => {
			try {
				const stats = await this.blockedEmailDomainRepository.getSyncStats();

				// Only run initial sync if we have no data or data is older than 7 days
				if (stats.total === 0 || !stats.lastSyncDate ||
					Date.now() - new Date(stats.lastSyncDate).getTime() > 7 * 24 * 60 * 60 * 1000) {
					this.logger.log('Running initial email domain sync...');
					await this.syncDisposableEmailDomains();
				} else {
					this.logger.log(`Skipping initial sync. Database has ${stats.active} active domains (last sync: ${stats.lastSyncDate})`);
				}
			} catch (error) {
				this.logger.error('Initial sync failed:', error);
			}
		}, 30000);
	}

	/**
	 * Main sync logic - fetches and updates blocked domains
	 */
	private async syncDisposableEmailDomains(): Promise<any> {
		if (this.isRunning) {
			this.logger.warn('Sync already in progress, skipping...');
			return;
		}

		this.isRunning = true;
		const startTime = Date.now();

		try {
			this.logger.log('Fetching disposable email domains from GitHub...');

			// Fetch the blocklist from GitHub
			const response = await axios.get(this.GITHUB_BLOCKLIST_URL, {
				timeout: 30000, // 30 second timeout
				headers: {
					'User-Agent': 'Atlas-Painel-Email-Validator/1.0',
				},
			});

			if (response.status !== 200) {
				throw new Error(`Failed to fetch blocklist: HTTP ${response.status}`);
			}

			// Parse domains from response
			const domains = this.parseDomainsFromResponse(response.data);

			if (domains.length === 0) {
				throw new Error('No domains found in blocklist response');
			}

			this.logger.log(`Fetched ${domains.length} domains from blocklist`);

			// Get current stats before sync
			const beforeStats = await this.blockedEmailDomainRepository.getSyncStats();

			// Batch sync domains (process in chunks to avoid memory issues)
			const chunkSize = 500;
			let processedCount = 0;

			for (let i = 0; i < domains.length; i += chunkSize) {
				const chunk = domains.slice(i, i + chunkSize);
				await this.blockedEmailDomainRepository.upsertDomains(chunk, 'disposable-email-domains');
				processedCount += chunk.length;

				if (processedCount % 1000 === 0) {
					this.logger.log(`Processed ${processedCount}/${domains.length} domains...`);
				}
			}

			// Deactivate domains not in current list
			const deactivatedCount = await this.blockedEmailDomainRepository.deactivateDomainsNotInList(
				domains,
				'disposable-email-domains'
			);

			// Get final stats
			const afterStats = await this.blockedEmailDomainRepository.getSyncStats();
			const duration = Date.now() - startTime;

			const syncResult = {
				duration: `${duration}ms`,
				fetched: domains.length,
				processed: processedCount,
				deactivated: deactivatedCount,
				before: beforeStats,
				after: afterStats,
			};

			this.logger.log(`Email domain sync completed successfully in ${duration}ms`, syncResult);
			return syncResult;

		} catch (error) {
			const duration = Date.now() - startTime;
			this.logger.error(`Email domain sync failed after ${duration}ms:`, error);
			throw error;
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Parse domains from GitHub response text
	 */
	private parseDomainsFromResponse(responseText: string): string[] {
		return responseText
			.split('\n')
			.map(line => line.trim())
			.filter(line => {
				// Filter out empty lines, comments, and invalid domains
				if (!line || line.startsWith('#') || line.startsWith('//')) {
					return false;
				}

				// Basic domain validation
				const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
				return domainRegex.test(line);
			})
			.map(line => line.toLowerCase()); // Normalize to lowercase
	}

	/**
	 * Check if a domain is in the blocked list
	 */
	async isDomainBlocked(domain: string): Promise<boolean> {
		try {
			return await this.blockedEmailDomainRepository.isDomainBlocked(domain.toLowerCase());
		} catch (error) {
			this.logger.error(`Error checking if domain is blocked: ${domain}`, error);
			// Fail open - don't block if there's a database error
			return false;
		}
	}

	/**
	 * Extract domain from email address
	 */
	extractDomainFromEmail(email: string): string {
		const parts = email.split('@');
		return parts.length === 2 ? parts[1].toLowerCase() : '';
	}

	/**
	 * Check if an email address uses a blocked domain
	 */
	async isEmailBlocked(email: string): Promise<boolean> {
		const domain = this.extractDomainFromEmail(email);
		if (!domain) {
			return false;
		}
		return await this.isDomainBlocked(domain);
	}

	/**
	 * Get sync status and statistics
	 */
	async getSyncStatus() {
		const stats = await this.blockedEmailDomainRepository.getSyncStats();
		return {
			...stats,
			isRunning: this.isRunning,
			nextScheduledSync: '3:00 AM daily',
		};
	}
}