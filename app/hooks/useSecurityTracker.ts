'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
	initSecurityTracker,
	trackPageVisit,
	getSessionToken,
	flushMetrics,
} from '../lib/security-tracker';

/**
 * Hook para inicializar e gerenciar o rastreamento de segurança
 *
 * Uso:
 * ```tsx
 * function MyApp({ children }) {
 *   useSecurityTracker();
 *   return children;
 * }
 * ```
 */
export function useSecurityTracker(): {
	sessionToken: string | null;
	flushMetrics: () => Promise<void>;
} {
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

	return {
		sessionToken: getSessionToken(),
		flushMetrics,
	};
}

export default useSecurityTracker;
