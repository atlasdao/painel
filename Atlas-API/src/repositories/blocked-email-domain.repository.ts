import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AbstractBaseRepository } from './base.repository';
import { BlockedEmailDomain } from '@prisma/client';

@Injectable()
export class BlockedEmailDomainRepository extends AbstractBaseRepository<BlockedEmailDomain> {
	protected model = this.prisma.blockedEmailDomain;

	constructor(prisma: PrismaService) {
		super(prisma);
	}

	/**
	 * Find a blocked domain by domain name
	 */
	async findByDomain(domain: string): Promise<BlockedEmailDomain | null> {
		return this.model.findUnique({
			where: { domain },
		});
	}

	/**
	 * Check if a domain is blocked and active
	 */
	async isDomainBlocked(domain: string): Promise<boolean> {
		const blockedDomain = await this.model.findFirst({
			where: {
				domain,
				isActive: true,
			},
		});
		return !!blockedDomain;
	}

	/**
	 * Bulk upsert domains from sync process
	 */
	async upsertDomains(domains: string[], source: string = 'disposable-email-domains'): Promise<void> {
		const now = new Date();

		// Batch upsert operations for better performance
		const upsertPromises = domains.map(domain =>
			this.model.upsert({
				where: { domain },
				update: {
					lastVerified: now,
					isActive: true,
					source,
				},
				create: {
					domain,
					source,
					isActive: true,
					addedAt: now,
					lastVerified: now,
				},
			})
		);

		await this.prisma.$transaction(upsertPromises);
	}

	/**
	 * Deactivate domains not found in latest sync
	 */
	async deactivateDomainsNotInList(domains: string[], source: string = 'disposable-email-domains'): Promise<number> {
		const result = await this.model.updateMany({
			where: {
				domain: {
					notIn: domains,
				},
				source,
				isActive: true,
			},
			data: {
				isActive: false,
			},
		});

		return result.count;
	}

	/**
	 * Get all active blocked domains
	 */
	async getActiveDomains(): Promise<string[]> {
		const domains = await this.model.findMany({
			where: { isActive: true },
			select: { domain: true },
		});

		return domains.map(d => d.domain);
	}

	/**
	 * Get domains sync statistics
	 */
	async getSyncStats() {
		const [total, active, lastSyncDate] = await Promise.all([
			this.model.count(),
			this.model.count({ where: { isActive: true } }),
			this.model.findFirst({
				orderBy: { lastVerified: 'desc' },
				select: { lastVerified: true },
			}),
		]);

		return {
			total,
			active,
			inactive: total - active,
			lastSyncDate: lastSyncDate?.lastVerified,
		};
	}
}