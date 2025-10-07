/**
 * Error message translator for Portuguese localization
 */

export class ErrorTranslator {
	private static readonly translations: Record<string, string> = {
		// Authentication errors
		'User not found': 'Usuário não encontrado',
		'Invalid credentials': 'Credenciais inválidas',
		Unauthorized: 'Não autorizado',
		'Access denied': 'Acesso negado',
		'Invalid token': 'Token inválido',
		'Token expired': 'Token expirado',
		'Session expired': 'Sessão expirada',

		// Validation errors
		'Validation failed': 'Validação falhou',
		'Invalid input': 'Entrada inválida',
		'Required field missing': 'Campo obrigatório ausente',
		'Invalid email format': 'Formato de email inválido',
		'Password too weak': 'Senha muito fraca',
		'Passwords do not match': 'As senhas não coincidem',
		'Current password is incorrect': 'Senha atual está incorreta',
		'New password must be different from current password':
			'Nova senha deve ser diferente da senha atual',
		'Wrong password': 'Senha incorreta',

		// Profile errors
		'Profile not found': 'Perfil não encontrado',
		'Failed to update profile': 'Falha ao atualizar perfil',
		'Failed to upload avatar': 'Falha ao enviar foto',
		'Failed to save avatar': 'Falha ao salvar foto',
		'Avatar deleted successfully': 'Foto removida com sucesso',
		'Avatar uploaded successfully': 'Foto enviada com sucesso',
		'Failed to process avatar image': 'Falha ao processar imagem',
		'Image file too large (max 20MB)':
			'Arquivo de imagem muito grande (máximo 20MB)',
		'Image still too large after compression. Please use a smaller image.':
			'Imagem ainda muito grande após compressão. Use uma imagem menor.',
		'Invalid image format': 'Formato de imagem inválido',

		// 2FA errors
		'2FA is already enabled': '2FA já está ativado',
		'2FA is not enabled': '2FA não está ativado',
		'2FA setup not initiated': 'Configuração do 2FA não iniciada',
		'Invalid 2FA token': 'Token 2FA inválido',
		'2FA enabled successfully': '2FA ativado com sucesso',
		'2FA disabled successfully': '2FA desativado com sucesso',

		// Wallet errors
		'Wallet not found': 'Carteira não encontrada',
		'Invalid wallet address': 'Endereço de carteira inválido',
		'Wallet updated successfully': 'Carteira atualizada com sucesso',

		// Password errors
		'Password changed successfully': 'Senha alterada com sucesso',
		'Invalid current password': 'Senha atual inválida',
		'Password must be at least 8 characters':
			'Senha deve ter pelo menos 8 caracteres',

		// Transaction errors
		'Transaction not found': 'Transação não encontrada',
		'Transaction failed': 'Transação falhou',
		'Insufficient balance': 'Saldo insuficiente',
		'Invalid amount': 'Valor inválido',
		'Minimum amount not met': 'Valor mínimo não atingido',
		'Maximum amount exceeded': 'Valor máximo excedido',

		// General errors
		'Internal server error': 'Erro interno do servidor',
		'Bad request': 'Requisição inválida',
		'Not found': 'Não encontrado',
		'Method not allowed': 'Método não permitido',
		'Too many requests': 'Muitas requisições',
		'Service unavailable': 'Serviço indisponível',
		'Network error': 'Erro de rede',
		'Database error': 'Erro no banco de dados',
		'File not found': 'Arquivo não encontrado',
		'File too large': 'Arquivo muito grande',
		'Invalid file type': 'Tipo de arquivo inválido',
		'Operation failed': 'Operação falhou',
		'Operation successful': 'Operação bem-sucedida',
		'Please try again': 'Por favor, tente novamente',
		'Please try again later': 'Por favor, tente novamente mais tarde',

		// Rate limiting
		'Too many requests, please try again later':
			'Muitas requisições, tente novamente mais tarde',
		'Rate limit exceeded': 'Limite de requisições excedido',

		// API specific
		'API key required': 'Chave API necessária',
		'Invalid API key': 'Chave API inválida',
		'API key expired': 'Chave API expirada',

		// Admin specific
		'Admin access required': 'Acesso de administrador necessário',
		'Insufficient permissions': 'Permissões insuficientes',
	};

	/**
	 * Translate an error message to Portuguese
	 * @param message The original error message in English
	 * @returns The translated message in Portuguese, or the original if no translation exists
	 */
	public static translate(message: string): string {
		// First try exact match
		if (this.translations[message]) {
			return this.translations[message];
		}

		// Try case-insensitive match
		const lowerMessage = message.toLowerCase();
		for (const [key, value] of Object.entries(this.translations)) {
			if (key.toLowerCase() === lowerMessage) {
				return value;
			}
		}

		// Try partial match for common patterns
		if (message.includes('not found')) {
			return message.replace('not found', 'não encontrado');
		}
		if (message.includes('failed')) {
			return message.replace('failed', 'falhou');
		}
		if (message.includes('invalid')) {
			return message.replace('invalid', 'inválido');
		}
		if (message.includes('required')) {
			return message.replace('required', 'obrigatório');
		}
		if (message.includes('successfully')) {
			return message.replace('successfully', 'com sucesso');
		}

		// Return original if no translation found
		return message;
	}

	/**
	 * Translate validation error messages
	 * @param errors Array of validation errors
	 * @returns Translated validation errors
	 */
	public static translateValidationErrors(errors: any[]): any[] {
		return errors.map((error) => {
			if (typeof error === 'string') {
				return this.translate(error);
			}
			if (error.message) {
				return {
					...error,
					message: this.translate(error.message),
				};
			}
			return error;
		});
	}
}
