/**
 * Utilitários para validação de CPF e CNPJ
 */

/**
 * Valida um CPF
 * @param cpf - CPF a ser validado (apenas números)
 * @returns true se o CPF é válido, false caso contrário
 */
export function isValidCPF(cpf: string): boolean {
	// Remove caracteres não numéricos
	const cleanCpf = cpf.replace(/\D/g, '');

	// Verifica se tem 11 dígitos
	if (cleanCpf.length !== 11) return false;

	// Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
	if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

	// Validação do primeiro dígito verificador
	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += parseInt(cleanCpf[i]) * (10 - i);
	}
	let digit = 11 - (sum % 11);
	if (digit >= 10) digit = 0;
	if (digit !== parseInt(cleanCpf[9])) return false;

	// Validação do segundo dígito verificador
	sum = 0;
	for (let i = 0; i < 10; i++) {
		sum += parseInt(cleanCpf[i]) * (11 - i);
	}
	digit = 11 - (sum % 11);
	if (digit >= 10) digit = 0;
	if (digit !== parseInt(cleanCpf[10])) return false;

	return true;
}

/**
 * Valida um CNPJ
 * @param cnpj - CNPJ a ser validado (apenas números)
 * @returns true se o CNPJ é válido, false caso contrário
 */
export function isValidCNPJ(cnpj: string): boolean {
	// Remove caracteres não numéricos
	const cleanCnpj = cnpj.replace(/\D/g, '');

	// Verifica se tem 14 dígitos
	if (cleanCnpj.length !== 14) return false;

	// Verifica se todos os dígitos são iguais
	if (/^(\d)\1{13}$/.test(cleanCnpj)) return false;

	// Validação dos dígitos verificadores
	const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

	// Primeiro dígito verificador
	let sum = 0;
	for (let i = 0; i < 12; i++) {
		sum += parseInt(cleanCnpj[i]) * weights1[i];
	}
	let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
	if (digit !== parseInt(cleanCnpj[12])) return false;

	// Segundo dígito verificador
	sum = 0;
	for (let i = 0; i < 13; i++) {
		sum += parseInt(cleanCnpj[i]) * weights2[i];
	}
	digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
	if (digit !== parseInt(cleanCnpj[13])) return false;

	return true;
}

/**
 * Valida e identifica o tipo de documento (CPF ou CNPJ)
 * @param taxNumber - Número do documento fiscal
 * @returns Objeto com informações de validação
 */
export function validateTaxNumber(taxNumber: string): {
	isValid: boolean;
	type: 'CPF' | 'CNPJ' | null;
	formatted: string;
} {
	// Remove caracteres não numéricos
	const cleaned = taxNumber.replace(/\D/g, '');

	if (cleaned.length === 11) {
		// Validação de CPF
		return {
			isValid: isValidCPF(cleaned),
			type: 'CPF',
			formatted: cleaned,
		};
	} else if (cleaned.length === 14) {
		// Validação de CNPJ
		return {
			isValid: isValidCNPJ(cleaned),
			type: 'CNPJ',
			formatted: cleaned,
		};
	}

	return { isValid: false, type: null, formatted: '' };
}

/**
 * Formata um CPF
 * @param cpf - CPF a ser formatado (apenas números)
 * @returns CPF formatado (000.000.000-00)
 */
export function formatCPF(cpf: string): string {
	const cleaned = cpf.replace(/\D/g, '');
	if (cleaned.length !== 11) return cpf;

	return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata um CNPJ
 * @param cnpj - CNPJ a ser formatado (apenas números)
 * @returns CNPJ formatado (00.000.000/0000-00)
 */
export function formatCNPJ(cnpj: string): string {
	const cleaned = cnpj.replace(/\D/g, '');
	if (cleaned.length !== 14) return cnpj;

	return cleaned.replace(
		/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
		'$1.$2.$3/$4-$5',
	);
}

/**
 * Formata um CPF ou CNPJ automaticamente
 * @param taxNumber - Número do documento fiscal
 * @returns Documento formatado
 */
export function formatTaxNumber(taxNumber: string): string {
	const cleaned = taxNumber.replace(/\D/g, '');

	if (cleaned.length === 11) {
		return formatCPF(cleaned);
	} else if (cleaned.length === 14) {
		return formatCNPJ(cleaned);
	}

	return taxNumber;
}

/**
 * Mascara parcialmente um CPF ou CNPJ para exibição segura
 * @param taxNumber - Número do documento fiscal
 * @returns Documento mascarado (ex: ***.456.789-**)
 */
export function maskTaxNumber(taxNumber: string): string {
	const cleaned = taxNumber.replace(/\D/g, '');

	if (cleaned.length === 11) {
		// CPF: mostra apenas os 3 dígitos do meio
		return `***.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-**`;
	} else if (cleaned.length === 14) {
		// CNPJ: mostra apenas os 4 primeiros dígitos após a barra
		return `**.***.***/****-${cleaned.slice(12, 14)}`;
	}

	return '***';
}