import { Injectable } from '@nestjs/common';

interface RateLimitConfig {
  endpoint: string;
  rateLimit: number; // requests per minute
  burstLimit: number; // max burst requests
  dailyLimit: number; // requests per day
}

interface RequestQueue {
  endpoint: string;
  lastRequestTime: number;
  requestCount: number;
  dailyCount: number;
  dailyResetTime: number;
  queue: Array<() => Promise<any>>;
}

@Injectable()
export class RateLimiterService {
  private readonly limits: RateLimitConfig[] = [
    {
      endpoint: 'ping',
      rateLimit: 1,
      burstLimit: 1,
      dailyLimit: 1440,
    },
    {
      endpoint: 'deposit',
      rateLimit: 2,
      burstLimit: 30,
      dailyLimit: 2880,
    },
    {
      endpoint: 'deposit-status',
      rateLimit: 60,
      burstLimit: 20,
      dailyLimit: 86400,
    },
  ];

  private requestQueues: Map<string, RequestQueue> = new Map();

  constructor() {
    // Initialize queues for each endpoint
    this.limits.forEach(limit => {
      this.requestQueues.set(limit.endpoint, {
        endpoint: limit.endpoint,
        lastRequestTime: 0,
        requestCount: 0,
        dailyCount: 0,
        dailyResetTime: this.getNextDayReset(),
        queue: [],
      });
    });
  }

  private getNextDayReset(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  async executeWithRateLimit<T>(
    endpoint: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const limit = this.limits.find(l => l.endpoint === endpoint);
    if (!limit) {
      // No rate limit defined, execute immediately
      return fn();
    }

    const queue = this.requestQueues.get(endpoint);
    if (!queue) {
      return fn();
    }

    // Check daily limit reset
    const now = Date.now();
    if (now >= queue.dailyResetTime) {
      queue.dailyCount = 0;
      queue.dailyResetTime = this.getNextDayReset();
    }

    // Check if daily limit exceeded
    if (queue.dailyCount >= limit.dailyLimit) {
      throw new Error(`Daily rate limit exceeded for ${endpoint}. Limit: ${limit.dailyLimit}`);
    }

    // Calculate minimum time between requests (in milliseconds)
    const minTimeBetweenRequests = 60000 / limit.rateLimit;
    const timeSinceLastRequest = now - queue.lastRequestTime;

    // If we need to wait, calculate delay
    let delay = 0;
    if (timeSinceLastRequest < minTimeBetweenRequests) {
      delay = minTimeBetweenRequests - timeSinceLastRequest;
    }

    // For burst limit control
    if (queue.requestCount >= limit.burstLimit) {
      // Reset count after rate limit period
      if (timeSinceLastRequest >= 60000) {
        queue.requestCount = 0;
      } else {
        // Need to wait for rate limit reset
        delay = Math.max(delay, 60000 - timeSinceLastRequest);
      }
    }

    // Wait if necessary
    if (delay > 0) {
      await this.sleep(delay);
    }

    // Execute the request
    queue.lastRequestTime = Date.now();
    queue.requestCount++;
    queue.dailyCount++;

    try {
      return await fn();
    } catch (error) {
      // If request fails, don't count it against limits
      queue.requestCount--;
      queue.dailyCount--;
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getEndpointStatus(endpoint: string): {
    remaining: number;
    resetTime: number;
    dailyRemaining: number;
  } | null {
    const limit = this.limits.find(l => l.endpoint === endpoint);
    const queue = this.requestQueues.get(endpoint);
    
    if (!limit || !queue) {
      return null;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - queue.lastRequestTime;
    let remaining = limit.burstLimit - queue.requestCount;

    // Reset count if rate limit period passed
    if (timeSinceLastRequest >= 60000) {
      remaining = limit.burstLimit;
    }

    return {
      remaining,
      resetTime: queue.lastRequestTime + 60000,
      dailyRemaining: limit.dailyLimit - queue.dailyCount,
    };
  }
}