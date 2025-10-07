/**
 * Liquid Network Wallet Address Validator
 * Supports all valid Liquid address formats
 */

export class LiquidWalletValidator {
  // Confidential addresses (most common on Liquid)
  // Start with VJL, VTp, or VTq followed by 80+ base58 characters
  private static readonly CONFIDENTIAL_REGEX = /^(VJL|VTp|VTq)[1-9A-HJ-NP-Za-km-z]{80,}$/;

  // Unconfidential addresses (Bech32 format)
  // Start with ex1, ert1, el1, or lq1 (taproot) followed by lowercase alphanumeric
  private static readonly UNCONFIDENTIAL_REGEX = /^(ex1|ert1|el1|lq1)[0-9a-z]{39,}$/;

  // Legacy P2PKH/P2SH addresses
  // Start with 2 or Q followed by base58 characters
  private static readonly LEGACY_REGEX = /^[2Q][1-9A-HJ-NP-Za-km-z]{33}$/;

  /**
   * Validate a Liquid Network address
   * @param address The address to validate
   * @returns Object with valid flag and optional error message
   */
  static validate(address: string): { valid: boolean; error?: string } {
    if (!address) {
      return {
        valid: false,
        error: 'Endereço não pode estar vazio'
      };
    }

    // Remove whitespace
    const trimmed = address.trim();

    // Check minimum length
    if (trimmed.length < 34) {
      return {
        valid: false,
        error: 'Endereço muito curto para ser válido'
      };
    }

    // Check maximum length
    if (trimmed.length > 120) {
      return {
        valid: false,
        error: 'Endereço muito longo para ser válido'
      };
    }

    // Test against all valid patterns
    const isValid =
      this.CONFIDENTIAL_REGEX.test(trimmed) ||
      this.UNCONFIDENTIAL_REGEX.test(trimmed) ||
      this.LEGACY_REGEX.test(trimmed);

    if (!isValid) {
      // Provide helpful error based on prefix
      if (trimmed.startsWith('1') || trimmed.startsWith('3')) {
        return {
          valid: false,
          error: 'Este parece ser um endereço Bitcoin. Por favor, insira um endereço Liquid válido.'
        };
      }

      if (trimmed.startsWith('bc1') || trimmed.startsWith('tb1')) {
        return {
          valid: false,
          error: 'Este é um endereço Bitcoin SegWit. Por favor, insira um endereço Liquid válido.'
        };
      }

      if (trimmed.toLowerCase().startsWith('0x')) {
        return {
          valid: false,
          error: 'Este é um endereço Ethereum. Por favor, insira um endereço Liquid válido.'
        };
      }

      return {
        valid: false,
        error: 'Endereço Liquid inválido. Endereços válidos começam com lq1, VJL, VTp, VTq, ex1, ert1, el1, 2 ou Q.'
      };
    }

    return { valid: true };
  }

  /**
   * Get the type of a Liquid address
   * @param address The address to check
   * @returns The address type or 'Unknown'
   */
  static getAddressType(address: string): string {
    const trimmed = address.trim();

    if (this.CONFIDENTIAL_REGEX.test(trimmed)) {
      return 'Confidential';
    }
    if (this.UNCONFIDENTIAL_REGEX.test(trimmed)) {
      return 'Unconfidential';
    }
    if (this.LEGACY_REGEX.test(trimmed)) {
      return 'Legacy';
    }

    return 'Unknown';
  }

  /**
   * Format an address for display (truncate middle)
   * @param address The address to format
   * @param visibleChars Number of characters to show at start and end
   * @returns Formatted address
   */
  static formatForDisplay(address: string, visibleChars: number = 6): string {
    if (!address || address.length <= visibleChars * 2) {
      return address;
    }

    const start = address.slice(0, visibleChars);
    const end = address.slice(-visibleChars);
    return `${start}...${end}`;
  }

  /**
   * Check if an address is likely a testnet address
   * @param address The address to check
   * @returns true if likely testnet
   */
  static isTestnet(address: string): boolean {
    const trimmed = address.trim();

    // Testnet unconfidential addresses
    if (trimmed.startsWith('ert1') || trimmed.startsWith('el1')) {
      return true;
    }

    // Testnet confidential addresses (VTq is commonly used for testnet)
    if (trimmed.startsWith('VTq')) {
      return true;
    }

    return false;
  }

  /**
   * Validate multiple addresses at once
   * @param addresses Array of addresses to validate
   * @returns Object with results for each address
   */
  static validateBatch(addresses: string[]): Map<string, { valid: boolean; error?: string; type?: string }> {
    const results = new Map();

    for (const address of addresses) {
      const validation = this.validate(address);
      if (validation.valid) {
        results.set(address, {
          valid: true,
          type: this.getAddressType(address)
        });
      } else {
        results.set(address, validation);
      }
    }

    return results;
  }
}

// Export for convenience
export const validateLiquidAddress = (address: string) => LiquidWalletValidator.validate(address);
export const getLiquidAddressType = (address: string) => LiquidWalletValidator.getAddressType(address);
export const formatLiquidAddress = (address: string, chars?: number) => LiquidWalletValidator.formatForDisplay(address, chars);