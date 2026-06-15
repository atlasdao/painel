import {
	buildTaxNumberSearchToken,
	buildTaxNumberSearchTokens,
	hashTaxNumber,
	maskTaxNumber,
	matchesTaxNumber,
	normalizeSearchName,
} from './identity-vault.utils';

describe('identity-vault utils', () => {
	beforeEach(() => {
		process.env.IDENTITY_HASH_SECRET = 'test-secret';
	});

	it('normalizes search names and masks CPF/CNPJ without storing full documents', () => {
		expect(normalizeSearchName('Rafael Vieira da Rocha')).toBe(
			'rafael vieira da rocha',
		);
		expect(maskTaxNumber('123.456.789-01')).toBe('123.***.***-01');
		expect(maskTaxNumber('12.345.678/0001-99')).toBe('12.***.***/****-99');
	});

	it('hashes equivalent formatted and unformatted tax numbers identically', () => {
		expect(hashTaxNumber('123.456.789-01')).toBe(hashTaxNumber('12345678901'));
	});

	it('creates hashed search tokens for merchant-scoped partial document search', () => {
		const tokens = buildTaxNumberSearchTokens('12345678901');
		expect(tokens).toContain(buildTaxNumberSearchToken('1234'));
		expect(tokens).toContain(buildTaxNumberSearchToken('7890'));
	});

	it('compares full and censored payer documents when enough digits are visible', () => {
		expect(matchesTaxNumber('12345678901', '12345678901')).toBe(true);
		expect(matchesTaxNumber('12345678901', '123.***.***-01')).toBe(true);
		expect(matchesTaxNumber('12345678901', '***.456.789-**')).toBe(true);
		expect(matchesTaxNumber('12345678901', '987.***.***-01')).toBe(false);
		expect(matchesTaxNumber('12345678901', '***')).toBeNull();
	});
});
