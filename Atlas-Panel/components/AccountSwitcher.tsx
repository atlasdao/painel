'use client';

import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { collaboratorService, CollaboratorAccount } from '@/app/lib/services';
import Cookies from 'js-cookie';

interface AccountSwitcherProps {
	currentUser: {
		id: string;
		username: string;
	};
	onAccountSwitch?: () => void;
}

interface AccountContext {
	type: 'OWNER' | 'COLLABORATOR';
	accountId: string;
	accountName: string;
	collaboratorId?: string;
	role: 'OWNER' | 'AUXILIAR' | 'GESTOR';
}

export default function AccountSwitcher({ currentUser, onAccountSwitch }: AccountSwitcherProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [accounts, setAccounts] = useState<{
		ownAccount: { id: string; username: string; email: string; role: 'OWNER' };
		collaborations: CollaboratorAccount[];
	} | null>(null);
	const [context, setContext] = useState<AccountContext | null>(null);
	const [loading, setLoading] = useState(true);
	const [switching, setSwitching] = useState(false);

	const buttonRef = useRef<HTMLButtonElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		loadAccounts();
		loadContext();
	}, []);

	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node) &&
				buttonRef.current &&
				!buttonRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isOpen]);

	async function loadAccounts() {
		try {
			const data = await collaboratorService.getMyAccounts();
			setAccounts(data);
		} catch (err) {
			console.error('Erro ao carregar contas:', err);
		} finally {
			setLoading(false);
		}
	}

	function loadContext() {
		const savedContext = Cookies.get('account_context');
		if (savedContext) {
			try {
				setContext(JSON.parse(savedContext));
			} catch {
				// Contexto inválido, usar padrão
			}
		}
	}

	async function switchAccount(collaboratorId: string) {
		setSwitching(true);
		try {
			const result = await collaboratorService.switchToAccount(collaboratorId);
			Cookies.set('account_context', JSON.stringify(result.context), { expires: 1 });
			setContext(result.context);
			setIsOpen(false);
			onAccountSwitch?.();
			// Recarregar a página para aplicar novo contexto
			window.location.reload();
		} catch (err) {
			console.error('Erro ao trocar conta:', err);
		} finally {
			setSwitching(false);
		}
	}

	async function switchToOwn() {
		setSwitching(true);
		try {
			const result = await collaboratorService.switchToOwnAccount();
			Cookies.set('account_context', JSON.stringify(result.context), { expires: 1 });
			setContext(result.context);
			setIsOpen(false);
			onAccountSwitch?.();
			window.location.reload();
		} catch (err) {
			console.error('Erro ao voltar para conta própria:', err);
		} finally {
			setSwitching(false);
		}
	}

	// Se não tiver colaborações, não mostrar o switcher
	if (!loading && (!accounts?.collaborations || accounts.collaborations.length === 0)) {
		return null;
	}

	const isCollaborating = context?.type === 'COLLABORATOR';
	const currentAccountName = isCollaborating ? context.accountName : currentUser.username;
	const currentRole = isCollaborating ? context.role : 'OWNER';

	const getRoleLabel = (role: string) => {
		switch (role) {
			case 'GESTOR':
				return 'Gestor';
			case 'AUXILIAR':
				return 'Auxiliar';
			default:
				return '';
		}
	};

	return (
		<>
			<button
				ref={buttonRef}
				onClick={() => setIsOpen(!isOpen)}
				disabled={loading || switching}
				className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
					isCollaborating
						? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30'
						: 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-700'
				}`}
			>
				{loading ? (
					<span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
				) : (
					<>
						{isCollaborating ? (
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
							</svg>
						) : (
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						)}
						<span className="max-w-[120px] truncate">{currentAccountName}</span>
						{isCollaborating && (
							<span className="text-xs opacity-75">({getRoleLabel(currentRole)})</span>
						)}
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</>
				)}
			</button>

			{isOpen &&
				ReactDOM.createPortal(
					<div
						ref={dropdownRef}
						className="fixed bg-gray-800/95 backdrop-blur-xl rounded-lg shadow-2xl border border-gray-700/50 py-2 w-64"
						style={{
							top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 0,
							left: buttonRef.current ? buttonRef.current.getBoundingClientRect().left : 0,
							zIndex: 2147483647,
						}}
					>
						<div className="px-3 py-2 border-b border-gray-700/50">
							<p className="text-xs text-gray-400 uppercase tracking-wider">Trocar conta</p>
						</div>

						{/* Conta própria */}
						{accounts && (
							<button
								onClick={() => isCollaborating ? switchToOwn() : setIsOpen(false)}
								disabled={switching}
								className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
									!isCollaborating
										? 'bg-purple-500/20 text-purple-400'
										: 'text-gray-300 hover:bg-gray-700/50'
								}`}
							>
								<div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-400 text-sm font-semibold">
									{accounts.ownAccount.username.charAt(0).toUpperCase()}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium truncate">{accounts.ownAccount.username}</p>
									<p className="text-xs text-gray-500">Minha conta</p>
								</div>
								{!isCollaborating && (
									<svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
									</svg>
								)}
							</button>
						)}

						{/* Colaborações */}
						{accounts?.collaborations && accounts.collaborations.length > 0 && (
							<>
								<div className="px-3 py-2 border-t border-gray-700/50 mt-1">
									<p className="text-xs text-gray-500">Contas que tenho acesso</p>
								</div>
								{accounts.collaborations.map((collab) => (
									<button
										key={collab.collaboratorId}
										onClick={() => switchAccount(collab.collaboratorId)}
										disabled={switching}
										className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
											context?.collaboratorId === collab.collaboratorId
												? 'bg-yellow-500/20 text-yellow-400'
												: 'text-gray-300 hover:bg-gray-700/50'
										}`}
									>
										<div className="w-8 h-8 rounded-full bg-gray-600/50 flex items-center justify-center text-gray-400 text-sm font-semibold">
											{collab.username.charAt(0).toUpperCase()}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">{collab.username}</p>
											<p className="text-xs text-gray-500">{getRoleLabel(collab.role)}</p>
										</div>
										{context?.collaboratorId === collab.collaboratorId && (
											<svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
											</svg>
										)}
									</button>
								))}
							</>
						)}

						{switching && (
							<div className="absolute inset-0 bg-gray-800/80 flex items-center justify-center rounded-lg">
								<div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
							</div>
						)}
					</div>,
					document.body
				)}
		</>
	);
}
