'use client';

import { useState, useEffect } from 'react';
import { collaboratorService, CollaboratorInvite } from '@/app/lib/services';

export default function CollaboratorsPage() {
	const [collaborators, setCollaborators] = useState<CollaboratorInvite[]>([]);
	const [loading, setLoading] = useState(true);
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [lastInviteLink, setLastInviteLink] = useState('');
	const [inviteForm, setInviteForm] = useState<{ name: string; email: string; role: 'AUXILIAR' | 'GESTOR' }>({ name: '', email: '', role: 'AUXILIAR' });
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [copiedId, setCopiedId] = useState<string | null>(null);

	useEffect(() => {
		loadCollaborators();
	}, []);

	async function loadCollaborators() {
		try {
			const data = await collaboratorService.listCollaborators();
			setCollaborators(data);
		} catch (err) {
			console.error('Erro ao carregar colaboradores:', err);
		} finally {
			setLoading(false);
		}
	}

	async function handleInvite(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError('');

		try {
			const result = await collaboratorService.inviteCollaborator(inviteForm);
			setShowInviteModal(false);
			setInviteForm({ name: '', email: '', role: 'AUXILIAR' });
			loadCollaborators();

			// Mostrar modal de sucesso com o link
			if (result.inviteLink) {
				setLastInviteLink(result.inviteLink);
				setShowSuccessModal(true);
			} else {
				setSuccess('Convite enviado com sucesso!');
				setTimeout(() => setSuccess(''), 3000);
			}
		} catch (err: any) {
			setError(err.response?.data?.message || 'Erro ao enviar convite');
		} finally {
			setSubmitting(false);
		}
	}

	async function copyToClipboard(text: string, id?: string) {
		try {
			await navigator.clipboard.writeText(text);
			if (id) {
				setCopiedId(id);
				setTimeout(() => setCopiedId(null), 2000);
			}
			return true;
		} catch {
			return false;
		}
	}

	async function handleRevoke(id: string) {
		if (!confirm('Tem certeza que deseja revogar o acesso deste colaborador?')) return;

		try {
			await collaboratorService.revokeCollaborator(id);
			setSuccess('Acesso revogado com sucesso');
			loadCollaborators();
			setTimeout(() => setSuccess(''), 3000);
		} catch (err: any) {
			setError(err.response?.data?.message || 'Erro ao revogar acesso');
			setTimeout(() => setError(''), 3000);
		}
	}

	async function handleResend(id: string) {
		try {
			await collaboratorService.resendInvite(id);
			setSuccess('Convite reenviado com sucesso');
			loadCollaborators();
			setTimeout(() => setSuccess(''), 3000);
		} catch (err: any) {
			setError(err.response?.data?.message || 'Erro ao reenviar convite');
			setTimeout(() => setError(''), 3000);
		}
	}

	async function handleRoleChange(id: string, newRole: 'AUXILIAR' | 'GESTOR') {
		try {
			await collaboratorService.updateCollaboratorRole(id, newRole);
			setSuccess('Cargo atualizado com sucesso');
			loadCollaborators();
			setTimeout(() => setSuccess(''), 3000);
		} catch (err: any) {
			setError(err.response?.data?.message || 'Erro ao atualizar cargo');
			setTimeout(() => setError(''), 3000);
		}
	}

	const activeCollaborators = collaborators.filter((c) => c.status === 'ACTIVE');
	const pendingInvites = collaborators.filter((c) => c.status === 'PENDING');

	return (
		<div className="p-6 max-w-5xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-white">Colaboradores</h1>
					<p className="text-gray-400 text-sm mt-1">
						Gerencie quem tem acesso à sua conta
					</p>
				</div>
				<button
					onClick={() => setShowInviteModal(true)}
					className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
				>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
					Adicionar Colaborador
				</button>
			</div>

			{/* Alerts */}
			{success && (
				<div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
					{success}
				</div>
			)}
			{error && (
				<div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
					{error}
				</div>
			)}

			{loading ? (
				<div className="flex justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
				</div>
			) : (
				<>
					{/* Colaboradores Ativos */}
					{activeCollaborators.length > 0 && (
						<div className="mb-8">
							<h2 className="text-lg font-semibold text-white mb-4">
								Colaboradores Ativos ({activeCollaborators.length})
							</h2>
							<div className="space-y-3">
								{activeCollaborators.map((collab) => (
									<div
										key={collab.id}
										className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-4">
												<div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-400 font-semibold">
													{collab.collaborator?.username?.charAt(0).toUpperCase() || collab.invitedName.charAt(0).toUpperCase()}
												</div>
												<div>
													<p className="text-white font-medium">
														{collab.collaborator?.username || collab.invitedName}
													</p>
													<p className="text-gray-400 text-sm">{collab.invitedEmail}</p>
												</div>
											</div>
											<div className="flex items-center gap-4">
												<select
													value={collab.role}
													onChange={(e) => handleRoleChange(collab.id, e.target.value as 'AUXILIAR' | 'GESTOR')}
													className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
												>
													<option value="AUXILIAR">Auxiliar</option>
													<option value="GESTOR">Gestor</option>
												</select>
												<span className="text-xs text-gray-500">
													Desde {new Date(collab.acceptedAt || collab.createdAt).toLocaleDateString('pt-BR')}
												</span>
												<button
													onClick={() => handleRevoke(collab.id)}
													className="text-red-400 hover:text-red-300 text-sm"
												>
													Revogar
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Convites Pendentes */}
					{pendingInvites.length > 0 && (
						<div className="mb-8">
							<h2 className="text-lg font-semibold text-white mb-4">
								Convites Pendentes ({pendingInvites.length})
							</h2>
							<div className="space-y-3">
								{pendingInvites.map((invite) => (
									<div
										key={invite.id}
										className="bg-gray-800/50 border border-yellow-500/30 rounded-lg p-4"
									>
										<div className="flex items-center justify-between flex-wrap gap-3">
											<div className="flex items-center gap-4">
												<div className="w-10 h-10 rounded-full bg-yellow-600/30 flex items-center justify-center text-yellow-400">
													<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
												</div>
												<div>
													<p className="text-white font-medium">{invite.invitedName}</p>
													<p className="text-gray-400 text-sm">{invite.invitedEmail}</p>
												</div>
											</div>
											<div className="flex items-center gap-3 flex-wrap">
												<span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400">
													{invite.role === 'GESTOR' ? 'Gestor' : 'Auxiliar'}
												</span>
												<span className="text-xs text-gray-500">
													Expira em {new Date(invite.inviteExpires).toLocaleDateString('pt-BR')}
												</span>
												{invite.inviteLink && (
													<button
														onClick={() => copyToClipboard(invite.inviteLink!, invite.id)}
														className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
															copiedId === invite.id
																? 'bg-green-500/20 text-green-400'
																: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
														}`}
														title="Copiar link do convite"
													>
														{copiedId === invite.id ? (
															<>
																<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
																</svg>
																Copiado!
															</>
														) : (
															<>
																<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
																</svg>
																Copiar link
															</>
														)}
													</button>
												)}
												<button
													onClick={() => handleResend(invite.id)}
													className="text-purple-400 hover:text-purple-300 text-sm"
												>
													Reenviar
												</button>
												<button
													onClick={() => handleRevoke(invite.id)}
													className="text-red-400 hover:text-red-300 text-sm"
												>
													Cancelar
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Empty State */}
					{collaborators.length === 0 && (
						<div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/50">
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
								<svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
								</svg>
							</div>
							<h3 className="text-lg font-medium text-white mb-2">Nenhum colaborador</h3>
							<p className="text-gray-400 text-sm mb-4">
								Adicione colaboradores para que possam acessar sua conta
							</p>
							<button
								onClick={() => setShowInviteModal(true)}
								className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
							>
								Adicionar Colaborador
							</button>
						</div>
					)}

					{/* Info Box */}
					<div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
						<p className="text-blue-400 text-sm">
							<strong>Dica:</strong> Colaboradores podem acessar sua conta de acordo com o cargo atribuído.
							Você pode revogar o acesso a qualquer momento.
						</p>
					</div>
				</>
			)}

			{/* Modal de Convite */}
			{showInviteModal && (
				<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
					<div className="bg-gray-800 rounded-xl max-w-lg w-full p-6 border border-gray-700">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-semibold text-white">Adicionar Colaborador</h2>
							<button
								onClick={() => setShowInviteModal(false)}
								className="text-gray-400 hover:text-white"
							>
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<form onSubmit={handleInvite} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-2">
									Nome do colaborador
								</label>
								<input
									type="text"
									required
									value={inviteForm.name}
									onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
									className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
									placeholder="Ex: Maria Silva"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-300 mb-2">
									Email
								</label>
								<input
									type="email"
									required
									value={inviteForm.email}
									onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
									className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
									placeholder="colaborador@email.com"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-300 mb-2">
									Cargo
								</label>
								<div className="space-y-3">
									<label
										className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
											inviteForm.role === 'GESTOR'
												? 'border-purple-500 bg-purple-500/10'
												: 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
										}`}
									>
										<input
											type="radio"
											name="role"
											value="GESTOR"
											checked={inviteForm.role === 'GESTOR'}
											onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as 'AUXILIAR' | 'GESTOR' })}
											className="mt-1"
										/>
										<div>
											<p className="text-white font-medium">Gestor</p>
											<p className="text-gray-400 text-sm mt-1">
												Acesso completo às operações. Pode criar, editar e excluir links de pagamento,
												gerar QR codes com qualquer carteira, ver API key e configurar webhooks.
											</p>
										</div>
									</label>

									<label
										className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
											inviteForm.role === 'AUXILIAR'
												? 'border-purple-500 bg-purple-500/10'
												: 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
										}`}
									>
										<input
											type="radio"
											name="role"
											value="AUXILIAR"
											checked={inviteForm.role === 'AUXILIAR'}
											onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as 'AUXILIAR' | 'GESTOR' })}
											className="mt-1"
										/>
										<div>
											<p className="text-white font-medium">Auxiliar</p>
											<p className="text-gray-400 text-sm mt-1">
												Acesso para operações financeiras. Pode criar links e QR codes (carteira padrão),
												ver transações e métricas. Ideal para equipe de vendas.
											</p>
										</div>
									</label>
								</div>
							</div>

							{error && (
								<div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
									{error}
								</div>
							)}

							<div className="flex gap-3 pt-2">
								<button
									type="button"
									onClick={() => setShowInviteModal(false)}
									className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors"
								>
									{submitting ? 'Enviando...' : 'Enviar Convite'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Modal de Sucesso com Link */}
			{showSuccessModal && lastInviteLink && (
				<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
					<div className="bg-gray-800 rounded-xl max-w-lg w-full p-6 border border-gray-700">
						<div className="text-center mb-6">
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
								<svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<h2 className="text-xl font-semibold text-white mb-2">Convite Enviado!</h2>
							<p className="text-gray-400 text-sm">
								O convite foi enviado por email. Você também pode copiar o link abaixo e enviar manualmente.
							</p>
						</div>

						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-300 mb-2">
								Link do Convite
							</label>
							<div className="flex gap-2">
								<input
									type="text"
									readOnly
									value={lastInviteLink}
									className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm font-mono"
								/>
								<button
									onClick={async () => {
										const success = await copyToClipboard(lastInviteLink, 'success-modal');
										if (success) {
											setSuccess('Link copiado!');
											setTimeout(() => setSuccess(''), 2000);
										}
									}}
									className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
										copiedId === 'success-modal'
											? 'bg-green-600 text-white'
											: 'bg-purple-600 hover:bg-purple-700 text-white'
									}`}
								>
									{copiedId === 'success-modal' ? (
										<>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
											</svg>
											Copiado!
										</>
									) : (
										<>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
											</svg>
											Copiar
										</>
									)}
								</button>
							</div>
							<p className="text-xs text-gray-500 mt-2">
								Este link expira em 7 dias
							</p>
						</div>

						<button
							onClick={() => {
								setShowSuccessModal(false);
								setLastInviteLink('');
							}}
							className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
						>
							Fechar
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
