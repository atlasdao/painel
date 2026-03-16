'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collaboratorService } from '@/app/lib/services';
import { authService } from '@/app/lib/auth';
import Cookies from 'js-cookie';

interface InviteData {
	invitedEmail: string;
	invitedName: string;
	role: 'AUXILIAR' | 'GESTOR';
	accountOwner: {
		username: string;
		profilePicture?: string;
	};
	hasExistingAccount: boolean;
	roleDescription: {
		title: string;
		description: string;
		permissions: string[];
	};
}

export default function AcceptInvitePage() {
	const params = useParams();
	const router = useRouter();
	const token = params.token as string;

	const [inviteData, setInviteData] = useState<InviteData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [step, setStep] = useState<'loading' | 'view' | 'login' | 'register'>('loading');

	// Form states
	const [registerForm, setRegisterForm] = useState({ username: '', password: '', confirmPassword: '' });
	const [loginForm, setLoginForm] = useState({ email: '', password: '' });
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		loadInvite();
	}, [token]);

	async function loadInvite() {
		try {
			const data = await collaboratorService.validateInviteToken(token);
			setInviteData(data);
			setStep('view');
		} catch (err: any) {
			setError(err.response?.data?.message || 'Convite inválido ou expirado');
		} finally {
			setLoading(false);
		}
	}

	async function handleAcceptLoggedIn() {
		setSubmitting(true);
		setError('');

		try {
			await collaboratorService.acceptInvite(token);
			router.push('/dash?invite=accepted');
		} catch (err: any) {
			setError(err.response?.data?.message || 'Erro ao aceitar convite');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError('');

		try {
			// Fazer login
			const result = await authService.login(loginForm.email, loginForm.password);

			if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
				// Salvar token e redirecionar para 2FA
				Cookies.set('pending_invite_token', token, { expires: 1 });
				router.push(`/verify-2fa?email=${encodeURIComponent(loginForm.email)}&redirect=/invite/${token}`);
				return;
			}

			// Login bem sucedido, aceitar convite
			await collaboratorService.acceptInvite(token);
			router.push('/dash?invite=accepted');
		} catch (err: any) {
			setError(err.response?.data?.message || 'Email ou senha incorretos');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleRegister(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError('');

		if (registerForm.password !== registerForm.confirmPassword) {
			setError('As senhas não coincidem');
			setSubmitting(false);
			return;
		}

		if (registerForm.password.length < 8) {
			setError('A senha deve ter pelo menos 8 caracteres');
			setSubmitting(false);
			return;
		}

		try {
			const result = await collaboratorService.acceptInviteWithRegistration({
				token,
				username: registerForm.username,
				password: registerForm.password,
			});

			// Salvar tokens
			Cookies.set('access_token', result.accessToken, { expires: 7 });
			Cookies.set('refresh_token', result.refreshToken);
			Cookies.set('user', JSON.stringify(result.user), { expires: 7 });

			router.push('/dash?invite=accepted&welcome=true');
		} catch (err: any) {
			setError(err.response?.data?.message || 'Erro ao criar conta');
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-900 flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
			</div>
		);
	}

	if (error && !inviteData) {
		return (
			<div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
				<div className="max-w-md w-full bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
						<svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<h1 className="text-xl font-bold text-white mb-2">Convite Inválido</h1>
					<p className="text-gray-400 mb-6">{error}</p>
					<Link
						href="/login"
						className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
					>
						Ir para Login
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
			<div className="max-w-md w-full">
				{/* Header */}
				<div className="text-center mb-8">
					<Link href="/" className="inline-block text-2xl font-bold text-purple-400 mb-2">
						ATLAS
					</Link>
				</div>

				{/* Card */}
				<div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
					{step === 'view' && inviteData && (
						<>
							{/* Avatar do dono */}
							<div className="text-center mb-6">
								<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-400 text-2xl font-bold">
									{inviteData.accountOwner.username.charAt(0).toUpperCase()}
								</div>
								<p className="text-gray-400">
									<span className="text-white font-semibold">{inviteData.accountOwner.username}</span>{' '}
									convidou você para colaborar
								</p>
							</div>

							{/* Info do convite */}
							<div className="bg-gray-700/50 rounded-lg p-4 mb-6">
								<div className="flex items-center justify-between mb-3">
									<span className="text-gray-400 text-sm">Cargo</span>
									<span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full">
										{inviteData.roleDescription.title}
									</span>
								</div>
								<p className="text-gray-300 text-sm mb-3">{inviteData.roleDescription.description}</p>
								<div className="border-t border-gray-600 pt-3">
									<p className="text-gray-400 text-xs mb-2">Permissões:</p>
									<ul className="space-y-1">
										{inviteData.roleDescription.permissions.map((perm, i) => (
											<li key={i} className="text-gray-300 text-sm flex items-center gap-2">
												<svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
												</svg>
												{perm}
											</li>
										))}
									</ul>
								</div>
							</div>

							{/* Ações */}
							{inviteData.hasExistingAccount ? (
								<>
									<p className="text-center text-gray-400 text-sm mb-4">
										Já existe uma conta com o email <strong className="text-white">{inviteData.invitedEmail}</strong>
									</p>
									{authService.isAuthenticated() ? (
										<button
											onClick={handleAcceptLoggedIn}
											disabled={submitting}
											className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg font-medium transition-colors"
										>
											{submitting ? 'Aceitando...' : 'Aceitar Convite'}
										</button>
									) : (
										<button
											onClick={() => setStep('login')}
											className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
										>
											Fazer Login para Aceitar
										</button>
									)}
								</>
							) : (
								<>
									<p className="text-center text-gray-400 text-sm mb-4">
										Crie uma conta para aceitar o convite
									</p>
									<button
										onClick={() => setStep('register')}
										className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
									>
										Criar Conta e Aceitar
									</button>
								</>
							)}
						</>
					)}

					{step === 'login' && inviteData && (
						<>
							<button
								onClick={() => setStep('view')}
								className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
							>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
								</svg>
								Voltar
							</button>

							<h2 className="text-xl font-semibold text-white mb-6">Faça login para aceitar</h2>

							<form onSubmit={handleLogin} className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
									<input
										type="email"
										required
										value={loginForm.email}
										onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
										className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
										placeholder="seu@email.com"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
									<input
										type="password"
										required
										value={loginForm.password}
										onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
										className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
										placeholder="••••••••"
									/>
								</div>

								{error && (
									<div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
										{error}
									</div>
								)}

								<button
									type="submit"
									disabled={submitting}
									className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg font-medium transition-colors"
								>
									{submitting ? 'Entrando...' : 'Entrar e Aceitar'}
								</button>
							</form>
						</>
					)}

					{step === 'register' && inviteData && (
						<>
							<button
								onClick={() => setStep('view')}
								className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
							>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
								</svg>
								Voltar
							</button>

							<h2 className="text-xl font-semibold text-white mb-2">Criar sua conta</h2>
							<p className="text-gray-400 text-sm mb-6">
								Conta será criada com o email: <strong className="text-white">{inviteData.invitedEmail}</strong>
							</p>

							<form onSubmit={handleRegister} className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-300 mb-2">Nome de usuário</label>
									<input
										type="text"
										required
										minLength={3}
										maxLength={30}
										value={registerForm.username}
										onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
										className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
										placeholder="seu_usuario"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
									<input
										type="password"
										required
										minLength={8}
										value={registerForm.password}
										onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
										className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
										placeholder="Mínimo 8 caracteres"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-300 mb-2">Confirmar senha</label>
									<input
										type="password"
										required
										value={registerForm.confirmPassword}
										onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
										className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
										placeholder="Digite novamente"
									/>
								</div>

								{error && (
									<div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
										{error}
									</div>
								)}

								<button
									type="submit"
									disabled={submitting}
									className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg font-medium transition-colors"
								>
									{submitting ? 'Criando...' : 'Criar Conta e Aceitar'}
								</button>
							</form>
						</>
					)}
				</div>

				{/* Footer */}
				<p className="text-center text-gray-500 text-sm mt-6">
					&copy; 2025 Conta Atlas. Todos os direitos reservados.
				</p>
			</div>
		</div>
	);
}
