import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface IpAnalysisResult {
	ip: string;
	country?: string;
	countryCode?: string;
	region?: string;
	city?: string;
	zip?: string;
	lat?: number;
	lon?: number;
	timezone?: string;
	isp?: string;
	org?: string;
	as?: string;
	asn?: number;
	mobile?: boolean;
	proxy?: boolean;
	hosting?: boolean;
	isVpn: boolean;
	isTor: boolean;
	isProxy: boolean;
	isDatacenter: boolean;
	isMobile: boolean;
	riskScore: number;
	riskReasons: string[];
}

@Injectable()
export class IpAnalysisService {
	private readonly logger = new Logger(IpAnalysisService.name);

	// Cache de resultados para evitar chamadas repetidas
	private readonly ipCache = new Map<
		string,
		{ result: IpAnalysisResult; timestamp: number }
	>();
	private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hora

	// Lista de TOR exit nodes (atualizada periodicamente)
	private torExitNodes = new Set<string>();
	private torLastUpdate = 0;

	// ASNs conhecidos de datacenters/hosting
	private readonly datacenterAsns = new Set([
		// Major cloud providers
		16509, // Amazon AWS
		14618, // Amazon
		15169, // Google
		8075, // Microsoft
		396982, // Google Cloud
		19527, // Google
		13335, // Cloudflare
		20940, // Akamai
		16276, // OVH
		24940, // Hetzner
		51167, // Contabo
		20473, // Vultr
		14061, // DigitalOcean
		63949, // Linode
		9009, // M247
		// Known VPN/Hosting providers
		209, // CenturyLink
		60068, // CDN77
		29802, // HVC
		46606, // Unified Layer
		32097, // WholeSale
		30633, // Leaseweb
		60781, // LeaseWeb
		61317, // Digital Energy
		197540, // Netcup
		203020, // HostRoyale (Cyprus - usado pelo fraudador identificado)
		206264, // Amarutu Technology
		206898, // Serverius
		35916, // Multacom
		46562, // Performive
		394380, // Leaseweb
		136787, // TEFINCOM (NordVPN)
		9009, // M247 (VPN providers)
		202425, // IP Volume
		51852, // Private Layer
		34549, // meerfarbig
		200019, // Alexhost
		62563, // GTHost
		398324, // Censys
		213230, // Hetzner
		200651, // FlokiNET
		44592, // SkyLink Data Center
		41378, // Kirino
		58065, // Packet Exchange
	]);

	// ASNs conhecidos de VPNs comerciais
	private readonly vpnAsns = new Set([
		136787, // TEFINCOM (NordVPN)
		212238, // Datacamp
		9009, // M247 (ExpressVPN, etc)
		200019, // Alexhost
		51852, // Private Layer
		206092, // Secure Hosting
		213035, // Cambrium
		39572, // DataWeb
		51167, // Contabo (usado por VPNs)
		209854, // Ipxo
	]);

	constructor() {
		// Atualiza lista de TOR exit nodes na inicialização
		this.updateTorExitNodes();
	}

	/**
	 * Atualiza a lista de TOR exit nodes (diariamente)
	 */
	@Cron(CronExpression.EVERY_DAY_AT_3AM)
	async updateTorExitNodes(): Promise<void> {
		try {
			// Lista oficial de TOR exit nodes
			const response = await fetch(
				'https://check.torproject.org/torbulkexitlist',
			);
			if (response.ok) {
				const text = await response.text();
				const ips = text.split('\n').filter((ip) => ip.trim() && !ip.startsWith('#'));
				this.torExitNodes = new Set(ips);
				this.torLastUpdate = Date.now();
				this.logger.log(`TOR exit nodes updated: ${this.torExitNodes.size} IPs`);
			}
		} catch (error) {
			this.logger.warn('Failed to update TOR exit nodes list', error);
		}
	}

	/**
	 * Analisa um endereço IP
	 */
	async analyzeIp(ip: string): Promise<IpAnalysisResult> {
		// Verifica cache
		const cached = this.ipCache.get(ip);
		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return cached.result;
		}

		const result = await this.performAnalysis(ip);

		// Salva no cache
		this.ipCache.set(ip, { result, timestamp: Date.now() });

		// Limpa cache antigo (mantém máximo de 10000 entradas)
		if (this.ipCache.size > 10000) {
			const oldestKey = this.ipCache.keys().next().value;
			if (oldestKey) this.ipCache.delete(oldestKey);
		}

		return result;
	}

	/**
	 * Realiza a análise completa do IP
	 */
	private async performAnalysis(ip: string): Promise<IpAnalysisResult> {
		const riskReasons: string[] = [];
		let riskScore = 0;

		// Verifica se é TOR exit node
		const isTor = this.torExitNodes.has(ip);
		if (isTor) {
			riskScore += 40; // TOR = alto risco, mas não máximo (pode ter uso legítimo)
			riskReasons.push('TOR exit node');
		}

		// Consulta ip-api.com (gratuito, 45 req/min)
		let ipInfo: any = null;
		try {
			const response = await fetch(
				`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asn,mobile,proxy,hosting`,
			);
			if (response.ok) {
				ipInfo = await response.json();
			}
		} catch (error) {
			this.logger.warn(`Failed to fetch IP info for ${ip}`, error);
		}

		// Extrai ASN do resultado
		let asn: number | undefined;
		if (ipInfo?.asn) {
			asn = ipInfo.asn;
		} else if (ipInfo?.as) {
			// Extrai ASN do formato "AS12345 Organization Name"
			const match = ipInfo.as.match(/^AS(\d+)/);
			if (match) {
				asn = parseInt(match[1], 10);
			}
		}

		// Verifica se é datacenter conhecido
		const isDatacenter = asn ? this.datacenterAsns.has(asn) : false;
		if (isDatacenter) {
			riskScore += 30; // Datacenter = risco moderado-alto
			riskReasons.push(`Datacenter IP (ASN ${asn})`);
		}

		// Verifica se é VPN conhecida
		const isKnownVpn = asn ? this.vpnAsns.has(asn) : false;
		if (isKnownVpn) {
			riskScore += 8; // VPN comercial = risco baixo (público gosta de privacidade)
			riskReasons.push(`Known VPN provider (ASN ${asn})`);
		}

		// Verifica flags do ip-api.com
		const isProxy = ipInfo?.proxy === true;
		const isHosting = ipInfo?.hosting === true;
		const isMobile = ipInfo?.mobile === true;

		if (isProxy && !isKnownVpn) {
			riskScore += 15;
			riskReasons.push('Proxy detected by ip-api');
		}

		if (isHosting && !isDatacenter) {
			riskScore += 20;
			riskReasons.push('Hosting provider detected');
		}

		// Mobile é geralmente positivo (usuário real)
		if (isMobile) {
			riskScore -= 5; // Diminui risco
		}

		// País fora do Brasil pode indicar risco (mas não muito - muitos usam VPN)
		if (ipInfo?.countryCode && ipInfo.countryCode !== 'BR') {
			riskScore += 5;
			riskReasons.push(`Foreign IP (${ipInfo.countryCode})`);
		}

		// Determina se é VPN (seja por ASN ou por proxy flag)
		const isVpn = isKnownVpn || (isProxy && !isDatacenter && !isTor);

		// Garante que score está entre 0-100
		riskScore = Math.max(0, Math.min(100, riskScore));

		return {
			ip,
			country: ipInfo?.country,
			countryCode: ipInfo?.countryCode,
			region: ipInfo?.regionName,
			city: ipInfo?.city,
			zip: ipInfo?.zip,
			lat: ipInfo?.lat,
			lon: ipInfo?.lon,
			timezone: ipInfo?.timezone,
			isp: ipInfo?.isp,
			org: ipInfo?.org,
			as: ipInfo?.as,
			asn,
			mobile: isMobile,
			proxy: isProxy,
			hosting: isHosting,
			isVpn,
			isTor,
			isProxy,
			isDatacenter,
			isMobile,
			riskScore,
			riskReasons,
		};
	}

	/**
	 * Verifica se um IP está em uma lista de IPs bloqueados
	 */
	isIpInRange(ip: string, range: string): boolean {
		// Suporta formato CIDR (ex: 192.168.1.0/24)
		if (range.includes('/')) {
			return this.isIpInCidr(ip, range);
		}
		return ip === range;
	}

	/**
	 * Verifica se IP está em um range CIDR
	 */
	private isIpInCidr(ip: string, cidr: string): boolean {
		const [rangeIp, bits] = cidr.split('/');
		const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

		const ipNum = this.ipToNumber(ip);
		const rangeNum = this.ipToNumber(rangeIp);

		return (ipNum & mask) === (rangeNum & mask);
	}

	/**
	 * Converte IP para número
	 */
	private ipToNumber(ip: string): number {
		return ip
			.split('.')
			.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
	}

	/**
	 * Verifica se dois IPs são do mesmo /24 (mesma rede)
	 */
	isSameNetwork(ip1: string, ip2: string, prefixLength = 24): boolean {
		const mask = ~(2 ** (32 - prefixLength) - 1);
		const num1 = this.ipToNumber(ip1);
		const num2 = this.ipToNumber(ip2);
		return (num1 & mask) === (num2 & mask);
	}

	/**
	 * Retorna estatísticas do cache
	 */
	getCacheStats(): { size: number; torNodes: number; lastTorUpdate: Date | null } {
		return {
			size: this.ipCache.size,
			torNodes: this.torExitNodes.size,
			lastTorUpdate: this.torLastUpdate ? new Date(this.torLastUpdate) : null,
		};
	}

	/**
	 * Limpa o cache de IPs
	 */
	clearCache(): void {
		this.ipCache.clear();
		this.logger.log('IP cache cleared');
	}
}
