export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export interface PixKeyValidation {
  isValid: boolean;
  type?: PixKeyType;
  error?: string;
}

export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  // Aceita números de telefone brasileiros (10 ou 11 dígitos com DDD)
  return cleaned.length === 10 || cleaned.length === 11;
}

export function validateRandomKey(key: string): boolean {
  // PIX random keys can have various formats:
  // - Standard UUID v4: 8-4-4-4-12 (hexadecimal)
  // - General format: 32-36 alphanumeric characters with optional hyphens
  // First try strict UUID v4 format
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidV4Regex.test(key)) {
    return true;
  }

  // Then try more flexible UUID-like format (any version)
  const uuidGeneralRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidGeneralRegex.test(key)) {
    return true;
  }

  // Finally, accept any alphanumeric key with hyphens that looks like a random PIX key
  // Must be 32-36 characters total (excluding hyphens), alphanumeric with optional hyphens
  const cleanKey = key.replace(/-/g, '');
  const randomKeyRegex = /^[0-9a-z]{32,36}$/i;

  // Check if it has the right length and format
  if (randomKeyRegex.test(cleanKey)) {
    // Must have at least some numbers and letters to be considered random
    const hasNumbers = /\d/.test(cleanKey);
    const hasLetters = /[a-z]/i.test(cleanKey);
    return hasNumbers && hasLetters;
  }

  return false;
}

export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');

  if (cleaned.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  // Validação do primeiro dígito verificador
  let length = cleaned.length - 2;
  let numbers = cleaned.substring(0, length);
  let digits = cleaned.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;

  // Validação do segundo dígito verificador
  length = length + 1;
  numbers = cleaned.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

export function detectPixKeyType(key: string): PixKeyType | null {
  const cleaned = key.trim();

  // Verifica se é CPF ou CNPJ
  const docCleaned = cleaned.replace(/\D/g, '');
  if (docCleaned.length === 11 && validateCPF(docCleaned)) {
    return 'cpf';
  }
  if (docCleaned.length === 14 && validateCNPJ(docCleaned)) {
    return 'cnpj';
  }

  // Verifica se é email
  if (cleaned.includes('@') && validateEmail(cleaned)) {
    return 'email';
  }

  // Verifica se é telefone
  const phoneCleaned = cleaned.replace(/\D/g, '');
  if ((phoneCleaned.length === 10 || phoneCleaned.length === 11) && validatePhone(phoneCleaned)) {
    return 'phone';
  }

  // Verifica se é chave aleatória (UUID)
  if (validateRandomKey(cleaned)) {
    return 'random';
  }

  return null;
}

export function validatePixKey(key: string): PixKeyValidation {
  if (!key || key.trim().length === 0) {
    return { isValid: false, error: 'Chave PIX é obrigatória' };
  }

  const cleaned = key.trim();
  const type = detectPixKeyType(cleaned);

  if (!type) {
    return {
      isValid: false,
      error: 'Formato de chave PIX inválido. Use CPF, email, telefone ou chave aleatória.'
    };
  }

  switch (type) {
    case 'cpf':
      if (!validateCPF(cleaned)) {
        return { isValid: false, error: 'CPF inválido' };
      }
      break;
    case 'cnpj':
      if (!validateCNPJ(cleaned)) {
        return { isValid: false, error: 'CNPJ inválido' };
      }
      break;
    case 'email':
      if (!validateEmail(cleaned)) {
        return { isValid: false, error: 'Email inválido' };
      }
      break;
    case 'phone':
      if (!validatePhone(cleaned)) {
        return { isValid: false, error: 'Telefone inválido. Use o formato com DDD' };
      }
      break;
    case 'random':
      if (!validateRandomKey(cleaned)) {
        return { isValid: false, error: 'Chave aleatória inválida. Use 32-36 caracteres alfanuméricos' };
      }
      break;
  }

  return { isValid: true, type };
}

export function getPixKeyTypeLabel(type: PixKeyType | string): string {
  const labels: Record<string, string> = {
    cpf: 'CPF',
    cnpj: 'CNPJ',
    email: 'E-mail',
    phone: 'Telefone',
    random: 'Chave Aleatória',
    CPF: 'CPF',
    CNPJ: 'CNPJ',
    EMAIL: 'E-mail',
    PHONE: 'Telefone',
    RANDOM_KEY: 'Chave Aleatória'
  };
  return labels[type] || type;
}

export function formatPixKey(key: string, type?: PixKeyType): string {
  if (!type) {
    const detectedType = detectPixKeyType(key);
    if (detectedType) {
      type = detectedType;
    }
  }

  if (!type) return key;

  switch (type) {
    case 'cpf':
      return formatCPF(key);
    case 'phone':
      return formatPhone(key);
    default:
      return key;
  }
}