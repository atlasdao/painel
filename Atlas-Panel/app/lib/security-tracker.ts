/**
 * Atlas Security Tracker
 *
 * Sistema de coleta de fingerprint e comportamento para detecção de fraudes.
 * Usa FingerprintJS Open Source (gratuito) para identificação de dispositivos.
 */

// Tipos
interface FingerprintComponents {
	visitorId: string;
	canvasHash?: string;
	webglHash?: string;
	audioHash?: string;
	screenResolution?: string;
	colorDepth?: number;
	timezone?: string;
	timezoneOffset?: number;
	language?: string;
	platform?: string;
	hardwareConcurrency?: number;
	deviceMemory?: number;
	isBot?: boolean;
	botScore?: number;
	isIncognito?: boolean;
	hasLiedBrowser?: boolean;
	hasLiedOs?: boolean;
	hasLiedResolution?: boolean;
	hasLiedLanguages?: boolean;
	webrtcLocalIps?: string[];
	webrtcPublicIp?: string;
	fontsHash?: string;
	pluginsHash?: string;
	userAgent?: string;
	browserName?: string;
	browserVersion?: string;
	osName?: string;
	osVersion?: string;
	deviceType?: string;
}

interface BehaviorMetrics {
	mouseMovements: number;
	keystrokes: number;
	scrollEvents: number;
	clickEvents: number;
	touchEvents: number;
	sessionDuration: number;
	pagesVisited: number;
	avgMouseSpeed?: number;
	avgKeystrokeDelay?: number;
}

interface SecuritySession {
	token: string;
	expiresAt: Date;
}

// Constantes
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const SESSION_STORAGE_KEY = 'atlas_security_session';
const BEHAVIOR_UPDATE_INTERVAL = 30000; // 30 segundos

// Estado global
let currentSession: SecuritySession | null = null;
let behaviorMetrics: BehaviorMetrics = {
	mouseMovements: 0,
	keystrokes: 0,
	scrollEvents: 0,
	clickEvents: 0,
	touchEvents: 0,
	sessionDuration: 0,
	pagesVisited: 1,
};
let sessionStartTime = Date.now();
let lastMouseTime = 0;
let mouseDistances: number[] = [];
let keystrokeDelays: number[] = [];
let lastKeystrokeTime = 0;
let behaviorInterval: NodeJS.Timeout | null = null;
let isInitialized = false;

// ==========================================
// FINGERPRINT COLLECTION (FingerprintJS OSS)
// ==========================================

/**
 * Gera hash simples de uma string
 */
function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(36);
}

/**
 * Coleta fingerprint do Canvas
 */
function getCanvasFingerprint(): string | undefined {
	try {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return undefined;

		canvas.width = 200;
		canvas.height = 50;

		ctx.textBaseline = 'top';
		ctx.font = "14px 'Arial'";
		ctx.fillStyle = '#f60';
		ctx.fillRect(125, 1, 62, 20);
		ctx.fillStyle = '#069';
		ctx.fillText('Atlas Security', 2, 15);
		ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
		ctx.fillText('Canvas FP', 4, 35);

		return simpleHash(canvas.toDataURL());
	} catch {
		return undefined;
	}
}

/**
 * Coleta fingerprint do WebGL
 */
function getWebGLFingerprint(): string | undefined {
	try {
		const canvas = document.createElement('canvas');
		const gl =
			canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
		if (!gl) return undefined;

		const debugInfo = (gl as WebGLRenderingContext).getExtension(
			'WEBGL_debug_renderer_info',
		);
		if (!debugInfo) return undefined;

		const vendor = (gl as WebGLRenderingContext).getParameter(
			debugInfo.UNMASKED_VENDOR_WEBGL,
		);
		const renderer = (gl as WebGLRenderingContext).getParameter(
			debugInfo.UNMASKED_RENDERER_WEBGL,
		);

		return simpleHash(`${vendor}|${renderer}`);
	} catch {
		return undefined;
	}
}

/**
 * Coleta fingerprint de áudio
 */
async function getAudioFingerprint(): Promise<string | undefined> {
	try {
		const audioContext = new (window.AudioContext ||
			(window as any).webkitAudioContext)();
		const oscillator = audioContext.createOscillator();
		const analyser = audioContext.createAnalyser();
		const gainNode = audioContext.createGain();
		const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

		gainNode.gain.value = 0;
		oscillator.type = 'triangle';
		oscillator.connect(analyser);
		analyser.connect(scriptProcessor);
		scriptProcessor.connect(gainNode);
		gainNode.connect(audioContext.destination);

		oscillator.start(0);

		const fingerprint = await new Promise<string>((resolve) => {
			scriptProcessor.onaudioprocess = (event) => {
				const data = event.inputBuffer.getChannelData(0);
				const sum = data.reduce((a, b) => a + Math.abs(b), 0);
				oscillator.stop();
				audioContext.close();
				resolve(simpleHash(sum.toString()));
			};
		});

		return fingerprint;
	} catch {
		return undefined;
	}
}

/**
 * Detecta IPs locais via WebRTC
 */
async function getWebRTCLocalIPs(): Promise<string[]> {
	const ips: string[] = [];

	try {
		const pc = new RTCPeerConnection({ iceServers: [] });
		pc.createDataChannel('');

		pc.onicecandidate = (event) => {
			if (event.candidate) {
				const parts = event.candidate.candidate.split(' ');
				const ip = parts[4];
				if (ip && !ips.includes(ip) && !ip.includes(':')) {
					ips.push(ip);
				}
			}
		};

		await pc.createOffer().then((offer) => pc.setLocalDescription(offer));

		// Aguarda um pouco para coletar candidatos
		await new Promise((resolve) => setTimeout(resolve, 500));
		pc.close();
	} catch {
		// WebRTC pode estar bloqueado
	}

	return ips;
}

/**
 * Detecta modo incógnito
 */
async function detectIncognito(): Promise<boolean> {
	try {
		// Chrome/Chromium
		if ('storage' in navigator && 'estimate' in navigator.storage) {
			const { quota } = await navigator.storage.estimate();
			if (quota && quota < 120000000) {
				return true;
			}
		}

		// Firefox
		const db = indexedDB.open('test');
		db.onerror = () => {
			return true;
		};

		return false;
	} catch {
		return false;
	}
}

/**
 * Detecta se é bot
 */
function detectBot(): { isBot: boolean; score: number } {
	let score = 0;
	const signals: string[] = [];

	// WebDriver
	if ((navigator as any).webdriver) {
		score += 0.8;
		signals.push('webdriver');
	}

	// Phantom
	if ((window as any).__phantomas || (window as any).callPhantom) {
		score += 0.9;
		signals.push('phantom');
	}

	// Selenium
	if ((document as any).__selenium_evaluate || (document as any).__selenium_unwrapped) {
		score += 0.9;
		signals.push('selenium');
	}

	// HeadlessChrome
	if (/HeadlessChrome/.test(navigator.userAgent)) {
		score += 0.8;
		signals.push('headless');
	}

	// Languages
	if (!navigator.languages || navigator.languages.length === 0) {
		score += 0.3;
		signals.push('no_languages');
	}

	// Plugins (muito poucos é suspeito em desktop)
	const plugins = navigator.plugins?.length || 0;
	if (plugins === 0 && !/Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
		score += 0.2;
		signals.push('no_plugins');
	}

	return {
		isBot: score > 0.5,
		score: Math.min(score, 1),
	};
}

/**
 * Detecta spoofing de browser/OS
 */
function detectSpoofing(): {
	hasLiedBrowser: boolean;
	hasLiedOs: boolean;
	hasLiedResolution: boolean;
	hasLiedLanguages: boolean;
} {
	const ua = navigator.userAgent;

	// Browser spoofing
	let hasLiedBrowser = false;
	if (/Chrome/.test(ua) && !(window as any).chrome) {
		hasLiedBrowser = true;
	}

	// OS spoofing
	let hasLiedOs = false;
	const platform = navigator.platform.toLowerCase();
	if (/Win/.test(ua) && !platform.includes('win')) {
		hasLiedOs = true;
	}
	if (/Mac/.test(ua) && !platform.includes('mac')) {
		hasLiedOs = true;
	}
	if (/Linux/.test(ua) && !platform.includes('linux') && !platform.includes('android')) {
		hasLiedOs = true;
	}

	// Resolution spoofing
	let hasLiedResolution = false;
	if (
		screen.width < screen.availWidth ||
		screen.height < screen.availHeight
	) {
		hasLiedResolution = true;
	}

	// Language spoofing
	let hasLiedLanguages = false;
	if (navigator.language && navigator.languages) {
		if (!navigator.languages.includes(navigator.language.split('-')[0])) {
			hasLiedLanguages = true;
		}
	}

	return { hasLiedBrowser, hasLiedOs, hasLiedResolution, hasLiedLanguages };
}

/**
 * Extrai informações do User Agent
 */
function parseUserAgent(): {
	browserName: string;
	browserVersion: string;
	osName: string;
	osVersion: string;
	deviceType: string;
} {
	const ua = navigator.userAgent;

	// Browser
	let browserName = 'Unknown';
	let browserVersion = '';
	if (/Firefox\/(\d+)/.test(ua)) {
		browserName = 'Firefox';
		browserVersion = RegExp.$1;
	} else if (/Chrome\/(\d+)/.test(ua)) {
		browserName = 'Chrome';
		browserVersion = RegExp.$1;
	} else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) {
		browserName = 'Safari';
		browserVersion = RegExp.$1;
	} else if (/Edge\/(\d+)/.test(ua)) {
		browserName = 'Edge';
		browserVersion = RegExp.$1;
	}

	// OS
	let osName = 'Unknown';
	let osVersion = '';
	if (/Windows NT (\d+\.\d+)/.test(ua)) {
		osName = 'Windows';
		const winVer = RegExp.$1;
		osVersion =
			winVer === '10.0'
				? '10/11'
				: winVer === '6.3'
					? '8.1'
					: winVer === '6.2'
						? '8'
						: winVer === '6.1'
							? '7'
							: winVer;
	} else if (/Mac OS X (\d+[._]\d+)/.test(ua)) {
		osName = 'macOS';
		osVersion = RegExp.$1.replace('_', '.');
	} else if (/Android (\d+\.\d+)/.test(ua)) {
		osName = 'Android';
		osVersion = RegExp.$1;
	} else if (/Linux/.test(ua)) {
		osName = 'Linux';
	} else if (/iPhone|iPad/.test(ua)) {
		osName = 'iOS';
		if (/OS (\d+_\d+)/.test(ua)) {
			osVersion = RegExp.$1.replace('_', '.');
		}
	}

	// Device type
	let deviceType = 'desktop';
	if (/Mobile|Android|iPhone/.test(ua)) {
		deviceType = 'mobile';
	} else if (/iPad|Tablet/.test(ua)) {
		deviceType = 'tablet';
	}

	return { browserName, browserVersion, osName, osVersion, deviceType };
}

/**
 * Coleta fingerprint completo do dispositivo
 */
async function collectFingerprint(): Promise<FingerprintComponents> {
	const [canvasHash, webglHash, audioHash, webrtcLocalIps, isIncognito] =
		await Promise.all([
			getCanvasFingerprint(),
			getWebGLFingerprint(),
			getAudioFingerprint(),
			getWebRTCLocalIPs(),
			detectIncognito(),
		]);

	const botDetection = detectBot();
	const spoofing = detectSpoofing();
	const uaInfo = parseUserAgent();

	// Gera visitorId único baseado em múltiplos fatores
	const factors = [
		canvasHash,
		webglHash,
		navigator.userAgent,
		screen.width + 'x' + screen.height,
		Intl.DateTimeFormat().resolvedOptions().timeZone,
		navigator.language,
		navigator.hardwareConcurrency,
	]
		.filter(Boolean)
		.join('|');

	const visitorId = simpleHash(factors);

	return {
		visitorId,
		canvasHash,
		webglHash,
		audioHash,
		screenResolution: `${screen.width}x${screen.height}`,
		colorDepth: screen.colorDepth,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		timezoneOffset: new Date().getTimezoneOffset(),
		language: navigator.language,
		platform: navigator.platform,
		hardwareConcurrency: navigator.hardwareConcurrency,
		deviceMemory: (navigator as any).deviceMemory,
		isBot: botDetection.isBot,
		botScore: botDetection.score,
		isIncognito,
		...spoofing,
		webrtcLocalIps,
		userAgent: navigator.userAgent,
		...uaInfo,
	};
}

// ==========================================
// SESSION MANAGEMENT
// ==========================================

/**
 * Carrega sessão do storage
 */
function loadSession(): SecuritySession | null {
	try {
		const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
		if (!stored) return null;

		const session = JSON.parse(stored);
		session.expiresAt = new Date(session.expiresAt);

		// Verifica se expirou
		if (session.expiresAt < new Date()) {
			sessionStorage.removeItem(SESSION_STORAGE_KEY);
			return null;
		}

		return session;
	} catch {
		return null;
	}
}

/**
 * Salva sessão no storage
 */
function saveSession(session: SecuritySession): void {
	try {
		sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
	} catch {
		// Storage pode estar cheio ou bloqueado
	}
}

/**
 * Inicia uma nova sessão de segurança
 */
async function startSession(): Promise<SecuritySession | null> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/v1/risk/session/start`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		});

		if (!response.ok) return null;

		const data = await response.json();
		const session: SecuritySession = {
			token: data.sessionToken,
			expiresAt: new Date(data.expiresAt),
		};

		saveSession(session);
		return session;
	} catch {
		return null;
	}
}

/**
 * Envia fingerprint para o backend
 */
async function sendFingerprint(
	sessionToken: string,
	fingerprint: FingerprintComponents,
): Promise<boolean> {
	try {
		const response = await fetch(
			`${API_BASE_URL}/api/v1/risk/collect/fingerprint`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionToken,
					fingerprint,
				}),
			},
		);

		return response.ok;
	} catch {
		return false;
	}
}

/**
 * Envia métricas de comportamento
 */
async function sendBehavior(
	sessionToken: string,
	behavior: BehaviorMetrics,
): Promise<boolean> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/v1/risk/collect/behavior`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				sessionToken,
				behavior,
			}),
		});

		return response.ok;
	} catch {
		return false;
	}
}

// ==========================================
// BEHAVIOR TRACKING
// ==========================================

let lastMouseX = 0;
let lastMouseY = 0;

function handleMouseMove(e: MouseEvent): void {
	behaviorMetrics.mouseMovements++;

	// Calcula distância do movimento
	const dx = e.clientX - lastMouseX;
	const dy = e.clientY - lastMouseY;
	const distance = Math.sqrt(dx * dx + dy * dy);

	// Calcula velocidade
	const now = Date.now();
	if (lastMouseTime > 0 && distance > 0) {
		const dt = now - lastMouseTime;
		if (dt > 0) {
			const speed = distance / dt * 1000; // pixels/segundo
			mouseDistances.push(speed);
			// Mantém apenas últimas 100 medições
			if (mouseDistances.length > 100) {
				mouseDistances.shift();
			}
		}
	}

	lastMouseX = e.clientX;
	lastMouseY = e.clientY;
	lastMouseTime = now;
}

function handleKeyDown(): void {
	behaviorMetrics.keystrokes++;

	const now = Date.now();
	if (lastKeystrokeTime > 0) {
		const delay = now - lastKeystrokeTime;
		keystrokeDelays.push(delay);
		// Mantém apenas últimas 100 medições
		if (keystrokeDelays.length > 100) {
			keystrokeDelays.shift();
		}
	}
	lastKeystrokeTime = now;
}

function handleScroll(): void {
	behaviorMetrics.scrollEvents++;
}

function handleClick(): void {
	behaviorMetrics.clickEvents++;
}

function handleTouch(): void {
	behaviorMetrics.touchEvents++;
}

/**
 * Calcula médias de velocidade e delay
 */
function calculateAverages(): void {
	if (mouseDistances.length > 0) {
		behaviorMetrics.avgMouseSpeed =
			mouseDistances.reduce((a, b) => a + b, 0) / mouseDistances.length;
	}

	if (keystrokeDelays.length > 0) {
		behaviorMetrics.avgKeystrokeDelay =
			keystrokeDelays.reduce((a, b) => a + b, 0) / keystrokeDelays.length;
	}

	behaviorMetrics.sessionDuration = Math.floor(
		(Date.now() - sessionStartTime) / 1000,
	);
}

/**
 * Inicia rastreamento de comportamento
 */
function startBehaviorTracking(): void {
	if (typeof window === 'undefined') return;

	document.addEventListener('mousemove', handleMouseMove, { passive: true });
	document.addEventListener('keydown', handleKeyDown, { passive: true });
	document.addEventListener('scroll', handleScroll, { passive: true });
	document.addEventListener('click', handleClick, { passive: true });
	document.addEventListener('touchstart', handleTouch, { passive: true });

	// Envia métricas periodicamente
	behaviorInterval = setInterval(async () => {
		if (currentSession) {
			calculateAverages();
			await sendBehavior(currentSession.token, behaviorMetrics);
		}
	}, BEHAVIOR_UPDATE_INTERVAL);
}

/**
 * Para rastreamento de comportamento
 */
function stopBehaviorTracking(): void {
	if (typeof window === 'undefined') return;

	document.removeEventListener('mousemove', handleMouseMove);
	document.removeEventListener('keydown', handleKeyDown);
	document.removeEventListener('scroll', handleScroll);
	document.removeEventListener('click', handleClick);
	document.removeEventListener('touchstart', handleTouch);

	if (behaviorInterval) {
		clearInterval(behaviorInterval);
		behaviorInterval = null;
	}
}

// ==========================================
// PUBLIC API
// ==========================================

/**
 * Inicializa o sistema de segurança
 * Deve ser chamado uma vez no carregamento da aplicação
 */
export async function initSecurityTracker(): Promise<void> {
	if (typeof window === 'undefined' || isInitialized) return;

	isInitialized = true;
	sessionStartTime = Date.now();

	// Tenta carregar sessão existente ou criar nova
	currentSession = loadSession();
	if (!currentSession) {
		currentSession = await startSession();
	}

	if (!currentSession) {
		console.warn('[Atlas Security] Failed to initialize session');
		return;
	}

	// Coleta e envia fingerprint
	try {
		const fingerprint = await collectFingerprint();
		await sendFingerprint(currentSession.token, fingerprint);
	} catch (error) {
		console.warn('[Atlas Security] Failed to collect fingerprint', error);
	}

	// Inicia rastreamento de comportamento
	startBehaviorTracking();

	// Envia métricas finais ao sair
	if (typeof window !== 'undefined') {
		window.addEventListener('beforeunload', () => {
			if (currentSession) {
				calculateAverages();
				// Usa sendBeacon para garantir envio
				navigator.sendBeacon(
					`${API_BASE_URL}/api/v1/risk/collect/behavior`,
					JSON.stringify({
						sessionToken: currentSession.token,
						behavior: behaviorMetrics,
					}),
				);
			}
		});
	}
}

/**
 * Retorna o token da sessão atual
 */
export function getSessionToken(): string | null {
	return currentSession?.token || null;
}

/**
 * Incrementa contador de páginas visitadas
 * Deve ser chamado em cada navegação
 */
export function trackPageVisit(): void {
	behaviorMetrics.pagesVisited++;
}

/**
 * Para o rastreamento (útil para logout ou mudança de página)
 */
export function stopSecurityTracker(): void {
	stopBehaviorTracking();
	isInitialized = false;
}

/**
 * Força envio de métricas imediatamente
 */
export async function flushMetrics(): Promise<void> {
	if (currentSession) {
		calculateAverages();
		await sendBehavior(currentSession.token, behaviorMetrics);
	}
}

export type { FingerprintComponents, BehaviorMetrics, SecuritySession };
