import { Injectable, Logger } from '@nestjs/common';
import {
	IdentityVaultEventType,
	PayerIdentityStatus,
	PayerMatchStatus,
	PayerRiskTier,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
	buildTaxNumberSearchToken,
	buildTaxNumberSearchTokens,
	hashEuid,
	hashTaxNumber,
	maskTaxNumber,
	matchesTaxNumber,
	normalizeEuid,
	normalizeSearchName,
	normalizeTaxNumber,
} from './identity-vault.utils';

export interface MerchantContactSuggestion {
	id: string;
	displayName: string;
	taxNumberMasked: string | null;
	lastSuccessfulPaymentAt: Date | null;
	status: PayerIdentityStatus;
}

export interface InternalMerchantContact {
	id: string;
	displayName: string;
	taxNumberMasked: string | null;
	identity: {
		id: string;
		euid: string | null;
		taxNumberHash: string | null;
		taxNumberMasked: string | null;
		canonicalName: string | null;
		status: PayerIdentityStatus;
	};
}

@Injectable()
export class IdentityVaultService {
	private readonly logger = new Logger(IdentityVaultService.name);

	constructor(private readonly prisma: PrismaService) {}

	async searchMerchantContacts(
		merchantId: string,
		query: string,
		limit = 10,
	): Promise<MerchantContactSuggestion[]> {
		const searchName = normalizeSearchName(query);
		const taxToken = buildTaxNumberSearchToken(query);

		if (!searchName && !taxToken) return [];

		const contacts = await this.prisma.merchantContact.findMany({
			where: {
				merchantId,
				deletedAt: null,
				OR: [
					...(searchName
						? [
								{
									searchName: {
										contains: searchName,
										mode: 'insensitive' as const,
									},
								},
							]
						: []),
					...(taxToken
						? [
								{
									taxNumberSearchTokens: {
										has: taxToken,
									},
								},
							]
						: []),
				],
			},
			orderBy: [{ lastSuccessfulPaymentAt: 'desc' }, { displayName: 'asc' }],
			take: Math.min(Math.max(limit, 1), 20),
		});

		return contacts.map((contact) => ({
			id: contact.id,
			displayName: contact.displayName,
			taxNumberMasked: contact.taxNumberMasked,
			lastSuccessfulPaymentAt: contact.lastSuccessfulPaymentAt,
			status: contact.status,
		}));
	}

	async findMerchantContactByTaxNumber(
		merchantId: string,
		taxNumber: string,
	): Promise<InternalMerchantContact | null> {
		const taxNumberHash = hashTaxNumber(taxNumber);
		if (!taxNumberHash) return null;

		const contact = await this.prisma.merchantContact.findFirst({
			where: {
				merchantId,
				deletedAt: null,
				identity: { taxNumberHash },
			},
			include: { identity: true },
		});

		return contact as InternalMerchantContact | null;
	}

	async getMerchantContactForQr(
		merchantId: string,
		contactId: string,
	): Promise<InternalMerchantContact | null> {
		const contact = await this.prisma.merchantContact.findFirst({
			where: {
				id: contactId,
				merchantId,
				deletedAt: null,
				status: { not: PayerIdentityStatus.BLOCKED },
			},
			include: { identity: true },
		});

		return contact as InternalMerchantContact | null;
	}

	async prepareNewPayerIdentity(input: {
		merchantId: string;
		taxNumber: string;
		fullName: string;
	}): Promise<{
		taxNumberHash: string;
		taxNumberMasked: string;
		fullName: string;
	}> {
		const taxNumberHash = hashTaxNumber(input.taxNumber);
		const taxNumberMasked = maskTaxNumber(input.taxNumber);
		if (!taxNumberHash || !taxNumberMasked) {
			throw new Error('Invalid tax number');
		}

		return {
			taxNumberHash,
			taxNumberMasked,
			fullName: input.fullName.trim(),
		};
	}

	async upsertMerchantContactFromPayment(input: {
		merchantId: string;
		transactionId?: string;
		payerName?: string | null;
		payerTaxNumber?: string | null;
		payerEuid?: string | null;
		expectedTaxNumber?: string | null;
		expectedEuid?: string | null;
	}): Promise<{
		matchStatus: PayerMatchStatus;
		contactId?: string;
		identityId?: string;
	}> {
		const expectedEuid = normalizeEuid(input.expectedEuid);
		const actualEuid = normalizeEuid(input.payerEuid);
		let matchStatus: PayerMatchStatus = PayerMatchStatus.UNKNOWN;

		if (expectedEuid && actualEuid) {
			matchStatus =
				expectedEuid === actualEuid
					? PayerMatchStatus.MATCHED
					: PayerMatchStatus.MISMATCH;
		} else if (input.expectedTaxNumber) {
			const taxMatch = matchesTaxNumber(
				input.expectedTaxNumber,
				input.payerTaxNumber,
			);
			if (taxMatch === true) matchStatus = PayerMatchStatus.MATCHED;
			else if (taxMatch === false) matchStatus = PayerMatchStatus.MISMATCH;
			else matchStatus = PayerMatchStatus.UNVERIFIABLE;
		}

		const actualTaxNumberHash = hashTaxNumber(input.payerTaxNumber);
		const actualTaxNumberMasked =
			maskTaxNumber(input.payerTaxNumber) ||
			(input.payerTaxNumber?.includes('*') ? input.payerTaxNumber : null);
		const actualEuidHash = hashEuid(actualEuid);

		if (matchStatus === PayerMatchStatus.MISMATCH) {
			await this.updateTransactionIdentity(input.transactionId, {
				payerMatchStatus: matchStatus,
				payerTaxNumberHash: actualTaxNumberHash,
				payerTaxNumberMasked: actualTaxNumberMasked,
				payerEuidHash: actualEuidHash,
			});
			await this.createEvent({
				type: IdentityVaultEventType.PAYMENT_MISMATCH,
				merchantId: input.merchantId,
				transactionId: input.transactionId,
				details: {
					expectedEuidHash: hashEuid(expectedEuid),
					actualEuidHash,
					expectedTaxNumberHash: hashTaxNumber(input.expectedTaxNumber),
					actualTaxNumberHash,
				},
			});
			return { matchStatus };
		}

		const identity = await this.upsertIdentity({
			euid: actualEuid,
			taxNumberHash: actualTaxNumberHash,
			taxNumberMasked: actualTaxNumberMasked,
			canonicalName: input.payerName || undefined,
			status:
				matchStatus === PayerMatchStatus.UNVERIFIABLE
					? PayerIdentityStatus.UNKNOWN
					: PayerIdentityStatus.VERIFIED,
		});

		const contact = await this.upsertMerchantContact({
			merchantId: input.merchantId,
			identityId: identity.id,
			displayName:
				input.payerName ||
				identity.canonicalName ||
				`Pagador ${actualTaxNumberMasked || ''}`.trim(),
			taxNumberMasked: actualTaxNumberMasked,
			taxNumber: input.payerTaxNumber || input.expectedTaxNumber || undefined,
			transactionId: input.transactionId,
		});

		await this.updateTransactionIdentity(input.transactionId, {
			actualPayerIdentityId: identity.id,
			merchantContactId: contact.id,
			payerMatchStatus: matchStatus,
			payerTaxNumberHash: actualTaxNumberHash,
			payerTaxNumberMasked: actualTaxNumberMasked,
			payerEuidHash: actualEuidHash,
			buyerName: input.payerName || undefined,
		});

		await this.createEvent({
			type: IdentityVaultEventType.PAYMENT_MATCHED,
			identityId: identity.id,
			merchantId: input.merchantId,
			contactId: contact.id,
			transactionId: input.transactionId,
			details: { matchStatus },
		});

		return {
			matchStatus,
			contactId: contact.id,
			identityId: identity.id,
		};
	}

	private async upsertIdentity(input: {
		euid?: string | null;
		taxNumberHash?: string | null;
		taxNumberMasked?: string | null;
		canonicalName?: string;
		status?: PayerIdentityStatus;
	}) {
		const euid = normalizeEuid(input.euid);
		const euidHash = hashEuid(euid);
		const where = [
			...(input.taxNumberHash ? [{ taxNumberHash: input.taxNumberHash }] : []),
			...(euidHash ? [{ euidHash }] : []),
		];

		const existing = where.length
			? await this.prisma.payerIdentity.findFirst({ where: { OR: where } })
			: null;

		const data = {
			euid,
			euidHash,
			taxNumberHash: input.taxNumberHash,
			taxNumberMasked: input.taxNumberMasked,
			canonicalName: input.canonicalName,
			searchName: normalizeSearchName(input.canonicalName),
			status: input.status || PayerIdentityStatus.UNKNOWN,
			riskTier: PayerRiskTier.UNKNOWN,
			lastSuccessfulPaymentAt: new Date(),
		};

		if (existing) {
			return this.prisma.payerIdentity.update({
				where: { id: existing.id },
				data: {
					euid: existing.euid || data.euid,
					euidHash: existing.euidHash || data.euidHash,
					taxNumberHash: existing.taxNumberHash || data.taxNumberHash,
					taxNumberMasked: existing.taxNumberMasked || data.taxNumberMasked,
					canonicalName: data.canonicalName || existing.canonicalName,
					searchName: data.searchName || existing.searchName,
					status:
						existing.status === PayerIdentityStatus.UNKNOWN
							? data.status
							: existing.status,
					lastSuccessfulPaymentAt: data.lastSuccessfulPaymentAt,
				},
			});
		}

		const created = await this.prisma.payerIdentity.create({ data });
		await this.createEvent({
			type: IdentityVaultEventType.IDENTITY_CREATED,
			identityId: created.id,
			details: {
				hasTaxNumberHash: Boolean(created.taxNumberHash),
				hasEuidHash: Boolean(created.euidHash),
			},
		});
		return created;
	}

	private async upsertMerchantContact(input: {
		merchantId: string;
		identityId: string;
		displayName: string;
		taxNumberMasked?: string | null;
		taxNumber?: string;
		transactionId?: string;
	}) {
		const existing = await this.prisma.merchantContact.findUnique({
			where: {
				merchantId_identityId: {
					merchantId: input.merchantId,
					identityId: input.identityId,
				},
			},
		});

		const data = {
			displayName: input.displayName.trim(),
			searchName: normalizeSearchName(input.displayName),
			taxNumberMasked: input.taxNumberMasked,
			taxNumberSearchTokens: buildTaxNumberSearchTokens(input.taxNumber),
			lastTransactionId: input.transactionId,
			lastSuccessfulPaymentAt: new Date(),
			deletedAt: null,
			status: PayerIdentityStatus.VERIFIED,
		};

		if (existing) {
			return this.prisma.merchantContact.update({
				where: { id: existing.id },
				data: {
					...data,
					taxNumberMasked: data.taxNumberMasked || existing.taxNumberMasked,
					taxNumberSearchTokens:
						data.taxNumberSearchTokens.length > 0
							? data.taxNumberSearchTokens
							: existing.taxNumberSearchTokens,
					paymentCount: { increment: 1 },
				},
			});
		}

		return this.prisma.merchantContact.create({
			data: {
				merchantId: input.merchantId,
				identityId: input.identityId,
				...data,
				paymentCount: 1,
			},
		});
	}

	private async updateTransactionIdentity(
		transactionId: string | undefined,
		data: Record<string, any>,
	) {
		if (!transactionId) return;
		await this.prisma.transaction.update({
			where: { id: transactionId },
			data,
		});
	}

	private async createEvent(input: {
		type: IdentityVaultEventType;
		identityId?: string;
		merchantId?: string;
		contactId?: string;
		transactionId?: string;
		details?: Record<string, any>;
	}) {
		try {
			await this.prisma.identityVaultEvent.create({ data: input });
		} catch (error) {
			this.logger.warn(`Failed to create identity vault event: ${error.message}`);
		}
	}
}
