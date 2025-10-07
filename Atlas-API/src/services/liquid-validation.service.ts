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
      if (!address || typeof address !== 'string') {
        return false;
      }

      // Check if it's a valid Liquid address (mainnet or testnet)
      // Liquid addresses can be standard or confidential
      
      // Try to decode as a standard address
      try {
        liquid.address.fromBech32(address);
        return true;
      } catch {
        // Not a valid bech32 address
      }

      // Try to decode as a confidential address
      try {
        liquid.address.fromConfidential(address);
        return true;
      } catch {
        // Not a valid confidential address
      }

      // Try legacy base58 format
      try {
        liquid.address.fromBase58Check(address);
        return true;
      } catch {
        // Not a valid base58 address
      }

      return false;
    } catch (error) {
      console.error('Error validating Liquid address:', error);
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