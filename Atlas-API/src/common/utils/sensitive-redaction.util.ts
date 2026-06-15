const SENSITIVE_KEY_PATTERN =
	/(password|token|apikey|api_key|secret|authorization|creditcard|cvv|taxnumber|cpf|cnpj|payercpfcnpj|payertaxnumber|endusertaxnumber|euid|payereuid|merchantid)/i;

export function redactSensitiveData<T = any>(value: T): T {
	if (value === null || value === undefined) return value;

	if (Array.isArray(value)) {
		return value.map((item) => redactSensitiveData(item)) as T;
	}

	if (typeof value === 'object') {
		const output: Record<string, any> = {};
		for (const [key, nestedValue] of Object.entries(value as Record<string, any>)) {
			output[key] = SENSITIVE_KEY_PATTERN.test(key)
				? '[REDACTED]'
				: redactSensitiveData(nestedValue);
		}
		return output as T;
	}

	if (typeof value === 'string') {
		return value
			.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[REDACTED_CPF]')
			.replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[REDACTED_CNPJ]')
			.replace(/\bEU[A-Z0-9]{8,}\b/gi, '[REDACTED_EUID]') as T;
	}

	return value;
}
