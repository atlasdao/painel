'use client';

import { useState, useEffect } from 'react';
import { collaboratorService, CollaboratorInvite } from '@/app/lib/services';
import { Users, UserPlus, Clock, X, Check, Copy, Send, Trash2 } from 'lucide-react';

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
		<div className="max-w-5xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-[var(--text-primary)]">Colaboradores</h1>
					<p className="text-[var(--text-muted)] text-sm mt-1">
						Gerencie quem tem acesso a sua conta
					</p>
				</div>
				<button
					onClick={() => setShowInviteModal(true)}
					className="atlas-btn flex items-center gap-2"
				>
					<UserPlus className="w-4 h-4" />
					Adicionar
				</button>
			</div>

			{/* Alerts */}
			{success && (
				<div className="mb-4 atlas-badge-success p-3 rounded-lg text-sm">
					{success}
				</div>
			)}
			{error && (
				<div className="mb-4 atlas-badge-error p-3 rounded-lg text-sm">
					{error}
				</div>
			)}

			{loading ? (
				<div className="flex justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--border-default)] border-t-[var(--accent)]"></div>
				</div>
			) : (
				<>
					{/* Colaboradores Ativos */}
					{activeCollaborators.length > 0 && (
						<div className="mb-8">
							<h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
								Colaboradores Ativos ({activeCollaborators.length})
							</h2>
							<div className="space-y-3">
								{activeCollaborators.map((collab) => (
									<div
										key={collab.id}
										className="atlas-card"
									>
										<div className="flex items-center justify-between flex-wrap gap-3">
											<div className="flex items-center gap-4">
												<div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] font-semibold">
													{collab.collaborator?.username?.charAt(0).toUpperCase() || collab.invitedName.charAt(0).toUpperCase()}
												</div>
												<div>
													<p className="text-[var(--text-primary)] font-medium">
														{collab.collaborator?.username || collab.invitedName}
													</p>
													<p className="text-[var(--text-muted)] text-sm">{collab.invitedEmail}</p>
												</div>
											</div>
											<div className="flex items-center gap-4">
												<select
													value={collab.role}
													onChange={(e) => handleRoleChange(collab.id, e.target.value as 'AUXILIAR' | 'GESTOR')}
													className="atlas-input text-sm px-3 py-1.5"
												>
													<option value="AUXILIAR">Auxiliar</option>
													<option value="GESTOR">Gestor</option>
												</select>
												<span className="text-xs text-[var(--text-muted)]">
													Desde {new Date(collab.acceptedAt || collab.createdAt).toLocaleDateString('pt-BR')}
												</span>
												<button
													onClick={() => handleRevoke(collab.id)}
													className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 text-sm flex items-center gap-1"
												>
													<Trash2 className="w-3.5 h-3.5" />
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
							<h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
								Convites Pendentes ({pendingInvites.length})
							</h2>
							<div className="space-y-3">
								{pendingInvites.map((invite) => (
									<div
										key={invite.id}
										className="atlas-card border-yellow-500/30"
									>
										<div className="flex items-center justify-between flex-wrap gap-3">
											<div className="flex items-center gap-4">
												<div className="atlas-icon-warning">
													<Clock className="w-5 h-5" />
												</div>
												<div>
													<p className="text-[var(--text-primary)] font-medium">{invite.invitedName}</p>
													<p className="text-[var(--text-muted)] text-sm">{invite.invitedEmail}</p>
												</div>
											</div>
											<div className="flex items-center gap-3 flex-wrap">
												<span className="atlas-badge-warning text-xs px-2 py-1 rounded-full">
													{invite.role === 'GESTOR' ? 'Gestor' : 'Auxiliar'}
												</span>
												<span className="text-xs text-[var(--text-muted)]">
													Expira em {new Date(invite.inviteExpires).toLocaleDateString('pt-BR')}
												</span>
												{invite.inviteLink && (
													<button
														onClick={() => copyToClipboard(invite.inviteLink!, invite.id)}
														className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
															copiedId === invite.id
																? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500'
																: 'bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)]/20'
														}`}
														title="Copiar link do convite"
													>
														{copiedId === invite.id ? (
															<><Check className="w-3.5 h-3.5" /> Copiado!</>
														) : (
															<><Copy className="w-3.5 h-3.5" /> Copiar link</>
														)}
													</button>
												)}
												<button
													onClick={() => handleResend(invite.id)}
													className="text-[var(--accent)] hover:opacity-80 text-sm flex items-center gap-1"
												>
													<Send className="w-3.5 h-3.5" />
													Reenviar
												</button>
												<button
													onClick={() => handleRevoke(invite.id)}
													className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 text-sm flex items-center gap-1"
												>
													<X className="w-3.5 h-3.5" />
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
						<div className="atlas-card text-center py-12">
							<div className="atlas-icon mx-auto mb-4" style={{ width: '4rem', height: '4rem', borderRadius: '1rem' }}>
								<Users className="w-8 h-8" />
							</div>
							<h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Nenhum colaborador</h3>
							<p className="text-[var(--text-muted)] text-sm mb-4">
								Adicione colaboradores para que possam acessar sua conta
							</p>
							<button
								onClick={() => setShowInviteModal(true)}
								className="atlas-btn"
							>
								Adicionar Colaborador
							</button>
						</div>
					)}

					{/* Info Box */}
					<div className="mt-6 atlas-card border-[var(--accent)]/20 bg-[var(--accent-soft)]">
						<p className="text-[var(--accent)] text-sm">
							<strong>Dica:</strong> Colaboradores podem acessar sua conta de acordo com o cargo atribuido.
							Voce pode revogar o acesso a qualquer momento.
						</p>
					</div>
				</>
			)}

			{/* Modal de Convite */}
			{showInviteModal && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-[var(--bg-card)] rounded-xl max-w-lg w-full p-6 border border-[var(--border-default)] shadow-xl">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-semibold text-[var(--text-primary)]">Adicionar Colaborador</h2>
							<button
								onClick={() => setShowInviteModal(false)}
								className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
							>
								<X className="w-6 h-6" />
							</button>
						</div>

						<form onSubmit={handleInvite} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
									Nome do colaborador
								</label>
								<input
									type="text"
									required
									value={inviteForm.name}
									onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
									className="atlas-input w-full"
									placeholder="Ex: Maria Silva"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
									Email
								</label>
								<input
									type="email"
									required
									value={inviteForm.email}
									onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
									className="atlas-input w-full"
									placeholder="colaborador@email.com"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
									Cargo
								</label>
								<div className="space-y-3">
									<label
										className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
											inviteForm.role === 'GESTOR'
												? 'border-[var(--accent)] bg-[var(--accent-soft)]'
												: 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--border-hover)]'
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
											<p className="text-[var(--text-primary)] font-medium">Gestor</p>
											<p className="text-[var(--text-muted)] text-sm mt-1">
												Acesso completo as operacoes. Pode criar, editar e excluir links de pagamento,
												gerar QR codes com qualquer carteira, ver API key e configurar webhooks.
											</p>
										</div>
									</label>

									<label
										className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
											inviteForm.role === 'AUXILIAR'
												? 'border-[var(--accent)] bg-[var(--accent-soft)]'
												: 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--border-hover)]'
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
											<p className="text-[var(--text-primary)] font-medium">Auxiliar</p>
											<p className="text-[var(--text-muted)] text-sm mt-1">
												Acesso para operacoes financeiras. Pode criar links e QR codes (carteira padrao),
												ver transacoes e metricas. Ideal para equipe de vendas.
											</p>
										</div>
									</label>
								</div>
							</div>

							{error && (
								<div className="atlas-badge-error p-3 rounded-lg text-sm">
									{error}
								</div>
							)}

							<div className="flex gap-3 pt-2">
								<button
									type="button"
									onClick={() => setShowInviteModal(false)}
									className="flex-1 px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] text-[var(--text-primary)] rounded-lg transition-colors"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="atlas-btn flex-1 disabled:opacity-50"
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
				<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-[var(--bg-card)] rounded-xl max-w-lg w-full p-6 border border-[var(--border-default)] shadow-xl">
						<div className="text-center mb-6">
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
								<Check className="w-8 h-8 text-green-600 dark:text-green-500" />
							</div>
							<h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Convite Enviado!</h2>
							<p className="text-[var(--text-muted)] text-sm">
								O convite foi enviado por email. Voce tambem pode copiar o link abaixo e enviar manualmente.
							</p>
						</div>

						<div className="mb-6">
							<label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
								Link do Convite
							</label>
							<div className="flex gap-2">
								<input
									type="text"
									readOnly
									value={lastInviteLink}
									className="atlas-input flex-1 text-sm font-mono"
								/>
								<button
									onClick={async () => {
										const ok = await copyToClipboard(lastInviteLink, 'success-modal');
										if (ok) {
											setSuccess('Link copiado!');
											setTimeout(() => setSuccess(''), 2000);
										}
									}}
									className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
										copiedId === 'success-modal'
											? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500'
											: 'atlas-btn'
									}`}
								>
									{copiedId === 'success-modal' ? (
										<><Check className="w-4 h-4" /> Copiado!</>
									) : (
										<><Copy className="w-4 h-4" /> Copiar</>
									)}
								</button>
							</div>
							<p className="text-xs text-[var(--text-muted)] mt-2">
								Este link expira em 7 dias
							</p>
						</div>

						<button
							onClick={() => {
								setShowSuccessModal(false);
								setLastInviteLink('');
							}}
							className="w-full px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] text-[var(--text-primary)] rounded-lg transition-colors"
						>
							Fechar
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
