import { Injectable } from '@nestjs/common';
import * as liquid from 'liquidjs-lib';

@Injectable()
export class LiquidValidationService {
	/**
	 * Validates a Liquid Network address
	 * @param address The address to validate
	 * @returns true if valid, false otherwise
	 */
	validateLiquidAddress(address: string): boolean {
		try {
			console.log(`[LiquidValidation] Validating address: ${address}`);
			console.log(`[LiquidValidation] Address length: ${address?.length || 0}`);

			if (!address || typeof address !== 'string') {
				console.log(`[LiquidValidation] Invalid address type or empty`);
				return false;
			}

			// Check basic format requirements
			if (address.length < 26 || address.length > 110) {
				console.log(`[LiquidValidation] Length validation failed: ${address.length} (must be 26-110)`);
				return false;
			}

			console.log(`[LiquidValidation] Basic length check passed`);

			// Check if it's a valid Liquid address (mainnet or testnet)
			// Liquid addresses can be standard or confidential

			// Check for valid Liquid bech32 prefixes (including longer P2TR addresses)
			if (address.startsWith('lq1') || address.startsWith('tlq1')) {
				console.log(`[LiquidValidation] Found valid prefix: ${address.substring(0, 4)}`);

				// Validate bech32 format
				if (this.isValidBech32Format(address)) {
					console.log(`[LiquidValidation] ✅ Valid bech32 format - ACCEPTED`);
					return true;
				}

				// For longer addresses (like P2TR), be more permissive
				if (address.length >= 62 && address.length <= 110) {
					console.log(`[LiquidValidation] Checking long address (P2TR-style): ${address.length} chars`);
					const addressPart = address.slice(3); // Remove 'lq1' prefix
					if (/^[a-z0-9]+$/.test(addressPart)) {
						console.log(`[LiquidValidation] ✅ Long address format valid - ACCEPTED`);
						return true;
					}
				}
			}

			console.log(`[LiquidValidation] Trying liquidjs-lib validation...`);

			// Try to decode as a standard address using liquidjs-lib
			try {
				liquid.address.fromBech32(address);
				console.log(`[LiquidValidation] ✅ liquidjs-lib bech32 validation passed - ACCEPTED`);
				return true;
			} catch (bech32Error) {
				console.log(`[LiquidValidation] liquidjs-lib bech32 failed: ${bech32Error.message}`);
			}

			// Try to decode as a confidential address
			try {
				liquid.address.fromConfidential(address);
				console.log(`[LiquidValidation] ✅ Confidential address validation passed - ACCEPTED`);
				return true;
			} catch (confError) {
				console.log(`[LiquidValidation] Confidential address failed: ${confError.message}`);
			}

			// Try legacy base58 format
			try {
				liquid.address.fromBase58Check(address);
				console.log(`[LiquidValidation] ✅ Base58 validation passed - ACCEPTED`);
				return true;
			} catch (base58Error) {
				console.log(`[LiquidValidation] Base58 validation failed: ${base58Error.message}`);
			}

			console.log(`[LiquidValidation] ❌ ALL VALIDATIONS FAILED - REJECTED`);
			return false;
		} catch (error) {
			console.error('Error validating Liquid address:', error);
			return false;
		}
	}

	/**
	 * Check if address has valid bech32 format structure
	 * @param address The address to check
	 * @returns true if valid bech32 format
	 */
	private isValidBech32Format(address: string): boolean {
		try {
			console.log(`[LiquidValidation] isValidBech32Format check for: ${address}`);

			// Basic bech32 validation without using liquidjs-lib
			const parts = address.split('1');
			console.log(`[LiquidValidation] Split parts: ${JSON.stringify(parts)}`);

			if (parts.length !== 2) {
				console.log(`[LiquidValidation] Wrong number of parts: ${parts.length}`);
				return false;
			}

			const prefix = parts[0];
			const data = parts[1];
			console.log(`[LiquidValidation] Prefix: ${prefix}, Data length: ${data.length}`);

			// Check valid prefixes
			if (!['lq', 'tlq'].includes(prefix)) {
				console.log(`[LiquidValidation] Invalid prefix: ${prefix}`);
				return false;
			}

			// Check data part contains only valid bech32 characters
			if (!/^[02-9ac-hj-np-z]+$/.test(data)) {
				console.log(`[LiquidValidation] Invalid bech32 characters in data part`);
				return false;
			}

			// Check minimum length
			if (data.length < 6) {
				console.log(`[LiquidValidation] Data part too short: ${data.length}`);
				return false;
			}

			console.log(`[LiquidValidation] ✅ Bech32 format validation passed`);
			return true;
		} catch (error) {
			console.log(`[LiquidValidation] Bech32 format error: ${error.message}`);
			return false;
		}
	}

	/**
	 * Get address type
	 * @param address The address to check
	 * @returns Address type or null if invalid
	 */
	getAddressType(address: string): string | null {
		try {
			// Check Bech32
			try {
				const decoded = liquid.address.fromBech32(address);
				return 'bech32';
			} catch {}

			// Check Confidential
			try {
				const decoded = liquid.address.fromConfidential(address);
				return 'confidential';
			} catch {}

			// Check Base58
			try {
				const decoded = liquid.address.fromBase58Check(address);
				return 'base58';
			} catch {}

			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Validate if address is Liquid mainnet
	 * @param address The address to check
	 * @returns true if mainnet, false otherwise
	 */
	isMainnetAddress(address: string): boolean {
		try {
			// Liquid mainnet addresses start with 'lq' for bech32
			if (address.startsWith('lq1')) {
				return true;
			}

			// Check confidential addresses (start with VJL for mainnet)
			if (address.startsWith('VJL')) {
				return true;
			}

			// Legacy P2PKH addresses start with 'Q' or 'G'
			if (address.startsWith('Q') || address.startsWith('G')) {
				return true;
			}

			// Legacy P2SH addresses start with 'H'
			if (address.startsWith('H')) {
				return true;
			}

			return false;
		} catch {
			return false;
		}
	}
}
