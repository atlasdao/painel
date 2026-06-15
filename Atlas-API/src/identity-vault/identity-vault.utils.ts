import { createHmac } from 'crypto';

const DEFAULT_HASH_SECRET = 'zapix-development-identity-hash-secret';

export function getIdentityHashSecret(): string {
	return (
		process.env.IDENTITY_HASH_SECRET ||
		process.env.JWT_SECRET ||
		process.env.ENCRYPTION_KEY ||
		DEFAULT_HASH_SECRET
	);
}

export function normalizeTaxNumber(value?: string | null): string {
	return (value || '').replace(/\D/g, '');
}

export function normalizeEuid(value?: string | null): string | null {
	const trimmed = (value || '').trim();
	return trimmed ? trimmed.toUpperCase() : null;
}

export function normalizeSearchName(value?: string | null): string {
	return (value || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

export function hashIdentityValue(value?: string | null): string | null {
	const normalized = (value || '').trim();
	if (!normalized) return null;

	return createHmac('sha256', getIdentityHashSecret())
		.update(normalized)
		.digest('hex');
}

export function hashTaxNumber(value?: string | null): string | null {
	const normalized = normalizeTaxNumber(value);
	return normalized ? hashIdentityValue(normalized) : null;
}

export function hashEuid(value?: string | null): string | null {
	const normalized = normalizeEuid(value);
	return normalized ? hashIdentityValue(normalized) : null;
}

export function maskTaxNumber(value?: string | null): string | null {
	const digits = normalizeTaxNumber(value);
	if (digits.length === 11) {
		return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
	}
	if (digits.length === 14) {
		return `${digits.slice(0, 2)}.***.***/****-${digits.slice(12, 14)}`;
	}
	return null;
}

export function buildTaxNumberSearchTokens(value?: string | null): string[] {
	const digits = normalizeTaxNumber(value);
	if (digits.length < 3) return [];

	const tokens = new Set<string>();
	for (let length = 3; length <= Math.min(digits.length, 11); length++) {
		for (let start = 0; start + length <= digits.length; start++) {
			const hash = hashIdentityValue(digits.slice(start, start + length));
			if (hash) tokens.add(hash);
		}
	}

	return Array.from(tokens);
}

export function buildTaxNumberSearchToken(query?: string | null): string | null {
	const digits = normalizeTaxNumber(query);
	if (digits.length < 3) return null;
	return hashIdentityValue(digits);
}

export function matchesTaxNumber(expected?: string | null, actual?: string | null): boolean | null {
	const expectedDigits = normalizeTaxNumber(expected);
	if (expectedDigits.length !== 11 && expectedDigits.length !== 14) return null;

	const actualRaw = actual || '';
	const actualDigits = normalizeTaxNumber(actualRaw);
	if (actualDigits.length === expectedDigits.length) {
		return actualDigits === expectedDigits;
	}

	if (actualRaw.includes('*')) {
		const expectedMasked = maskTaxNumber(expectedDigits);
		if (expectedMasked && expectedMasked === actualRaw) return true;

		// Eulen may return censored documents with only the visible digits.
		if (actualDigits.length >= 4) {
			return expectedDigits.includes(actualDigits);
		}

		return null;
	}

	return null;
}
