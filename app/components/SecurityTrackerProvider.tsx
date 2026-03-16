'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { initSecurityTracker, trackPageVisit } from '../lib/security-tracker';

/**
 * Provider que inicializa o sistema de rastreamento de segurança.
 * Deve ser incluído no layout da aplicação.
 */
export function SecurityTrackerProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const initialized = useRef(false);
	const lastPathname = useRef<string | null>(null);

	// Inicializa na montagem
	useEffect(() => {
		if (!initialized.current) {
			initialized.current = true;
			initSecurityTracker();
		}
	}, []);

	// Rastreia mudanças de página
	useEffect(() => {
		if (lastPathname.current !== null && lastPathname.current !== pathname) {
			trackPageVisit();
		}
		lastPathname.current = pathname;
	}, [pathname]);

	return <>{children}</>;
}

export default SecurityTrackerProvider;
