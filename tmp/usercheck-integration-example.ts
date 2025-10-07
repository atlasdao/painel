// UserCheck.com Email Validation Service Implementation Example
// For Atlas Panel - Temporary Email Blocking System

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from './redis.service';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

interface UserCheckResponse {
  email: string;
  valid: boolean;
  disposable: boolean;
  domain: string;
  reason?: string;
  risk_score?: number;
  deliverable?: boolean;
}

interface EmailValidationResult {
  email: string;
  isValid: boolean;
  isDisposable: boolean;
  domain: string;
  reason?: string;
  source: 'api' | 'cache' | 'local';
  riskScore?: number;
}

@Injectable()
export class EmailValidationService {
  private readonly userCheckClient: AxiosInstance;
  private readonly cachePrefix = 'email:validation:';
  private readonly cacheTTL = 86400; // 24 hours in seconds
  private localBlocklist: Set<string> = new Set();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    // Initialize UserCheck API client
    this.userCheckClient = axios.create({
      baseURL: 'https://api.usercheck.com',
      timeout: 5000, // 5 second timeout
      headers: {
        'Authorization': `Bearer ${this.configService.get('USERCHECK_API_KEY')}`,
        'Content-Type': 'application/json',
      },
    });

    // Load local blocklist on startup
    this.loadLocalBlocklist();
  }

  /**
   * Main validation method - checks if email is disposable/temporary
   */
  async validateEmail(email: string): Promise<EmailValidationResult> {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check cache first
    const cachedResult = await this.checkCache(normalizedEmail);
    if (cachedResult) {
      return { ...cachedResult, source: 'cache' };
    }

    // 2. Check local blocklist
    const domain = normalizedEmail.split('@')[1];
    if (this.localBlocklist.has(domain)) {
      const result: EmailValidationResult = {
        email: normalizedEmail,
        isValid: false,
        isDisposable: true,
        domain,
        reason: 'Domain está na lista de bloqueio local',
        source: 'local',
      };
      await this.cacheResult(normalizedEmail, result);
      return result;
    }

    // 3. Call UserCheck API
    try {
      const response = await this.userCheckClient.get<UserCheckResponse>(
        `/email/${encodeURIComponent(normalizedEmail)}`
      );

      const result: EmailValidationResult = {
        email: normalizedEmail,
        isValid: response.data.valid && !response.data.disposable,
        isDisposable: response.data.disposable,
        domain: response.data.domain,
        reason: response.data.disposable ? 'Email temporário detectado' : undefined,
        source: 'api',
        riskScore: response.data.risk_score,
      };

      // Cache the result
      await this.cacheResult(normalizedEmail, result);

      // Log validation for audit
      await this.logValidation(normalizedEmail, result);

      return result;
    } catch (error) {
      // If API fails, fall back to local validation
      return this.fallbackValidation(normalizedEmail);
    }
  }

  /**
   * Check if email is disposable (simplified method)
   */
  async isDisposable(email: string): Promise<boolean> {
    const result = await this.validateEmail(email);
    return result.isDisposable;
  }

  /**
   * Add domain to local blocklist
   */
  async addToBlocklist(domain: string, reason: string): Promise<void> {
    await this.prisma.blockedEmailDomain.create({
      data: {
        domain: domain.toLowerCase(),
        type: 'custom',
        reason,
        active: true,
      },
    });
    this.localBlocklist.add(domain.toLowerCase());
  }

  /**
   * Remove domain from local blocklist
   */
  async removeFromBlocklist(domain: string): Promise<void> {
    await this.prisma.blockedEmailDomain.update({
      where: { domain: domain.toLowerCase() },
      data: { active: false },
    });
    this.localBlocklist.delete(domain.toLowerCase());
  }

  /**
   * Load local blocklist from database
   */
  private async loadLocalBlocklist(): Promise<void> {
    try {
      const blockedDomains = await this.prisma.blockedEmailDomain.findMany({
        where: { active: true },
        select: { domain: true },
      });

      this.localBlocklist = new Set(blockedDomains.map(d => d.domain));

      // Also load common disposable domains
      const commonDisposableDomains = [
        'tempmail.com', 'guerrillamail.com', '10minutemail.com',
        'mailinator.com', 'yopmail.com', 'throwaway.email',
        'maildrop.cc', 'mailnesia.com', 'temp-mail.org',
        'getnada.com', 'trashmail.com', 'fakeinbox.com',
      ];

      commonDisposableDomains.forEach(domain => this.localBlocklist.add(domain));
    } catch (error) {
      console.error('Failed to load local blocklist:', error);
    }
  }

  /**
   * Check Redis cache for validation result
   */
  private async checkCache(email: string): Promise<EmailValidationResult | null> {
    try {
      const cacheKey = this.getCacheKey(email);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache check failed:', error);
    }
    return null;
  }

  /**
   * Cache validation result in Redis
   */
  private async cacheResult(email: string, result: EmailValidationResult): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(email);
      await this.redis.setex(
        cacheKey,
        this.cacheTTL,
        JSON.stringify(result)
      );
    } catch (error) {
      console.error('Failed to cache result:', error);
    }
  }

  /**
   * Generate cache key for email
   */
  private getCacheKey(email: string): string {
    const hash = crypto.createHash('sha256').update(email).digest('hex');
    return `${this.cachePrefix}${hash}`;
  }

  /**
   * Fallback validation when API is unavailable
   */
  private async fallbackValidation(email: string): Promise<EmailValidationResult> {
    const domain = email.split('@')[1];

    // Basic regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        email,
        isValid: false,
        isDisposable: false,
        domain,
        reason: 'Formato de email inválido',
        source: 'local',
      };
    }

    // Check local blocklist
    const isBlocked = this.localBlocklist.has(domain);

    return {
      email,
      isValid: !isBlocked,
      isDisposable: isBlocked,
      domain,
      reason: isBlocked ? 'Domínio bloqueado localmente' : undefined,
      source: 'local',
    };
  }

  /**
   * Log validation for audit purposes
   */
  private async logValidation(email: string, result: EmailValidationResult): Promise<void> {
    try {
      await this.prisma.emailValidationLog.create({
        data: {
          email,
          result: result.isDisposable ? 'disposable' : 'valid',
          source: result.source,
          responseTime: 0, // You can implement actual timing
        },
      });
    } catch (error) {
      console.error('Failed to log validation:', error);
    }
  }

  /**
   * Get validation statistics
   */
  async getValidationStats(): Promise<any> {
    const [totalValidations, disposableBlocked, validEmails] = await Promise.all([
      this.prisma.emailValidationLog.count(),
      this.prisma.emailValidationLog.count({
        where: { result: 'disposable' },
      }),
      this.prisma.emailValidationLog.count({
        where: { result: 'valid' },
      }),
    ]);

    return {
      totalValidations,
      disposableBlocked,
      validEmails,
      blockRate: totalValidations > 0
        ? ((disposableBlocked / totalValidations) * 100).toFixed(2) + '%'
        : '0%',
    };
  }
}

// Usage in AuthService
export class AuthService {
  constructor(
    private readonly emailValidationService: EmailValidationService,
    // ... other dependencies
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Validate email for disposable/temporary
    const validation = await this.emailValidationService.validateEmail(email);

    if (validation.isDisposable) {
      throw new HttpException(
        'Email temporário não permitido. Por favor, use um email válido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Continue with normal registration flow
    // ... rest of registration logic
  }
}