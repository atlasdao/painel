"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiterService = void 0;
const common_1 = require("@nestjs/common");
let RateLimiterService = class RateLimiterService {
    limits = [
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
    requestQueues = new Map();
    constructor() {
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
    getNextDayReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime();
    }
    async executeWithRateLimit(endpoint, fn) {
        const limit = this.limits.find(l => l.endpoint === endpoint);
        if (!limit) {
            return fn();
        }
        const queue = this.requestQueues.get(endpoint);
        if (!queue) {
            return fn();
        }
        const now = Date.now();
        if (now >= queue.dailyResetTime) {
            queue.dailyCount = 0;
            queue.dailyResetTime = this.getNextDayReset();
        }
        if (queue.dailyCount >= limit.dailyLimit) {
            throw new Error(`Daily rate limit exceeded for ${endpoint}. Limit: ${limit.dailyLimit}`);
        }
        const minTimeBetweenRequests = 60000 / limit.rateLimit;
        const timeSinceLastRequest = now - queue.lastRequestTime;
        let delay = 0;
        if (timeSinceLastRequest < minTimeBetweenRequests) {
            delay = minTimeBetweenRequests - timeSinceLastRequest;
        }
        if (queue.requestCount >= limit.burstLimit) {
            if (timeSinceLastRequest >= 60000) {
                queue.requestCount = 0;
            }
            else {
                delay = Math.max(delay, 60000 - timeSinceLastRequest);
            }
        }
        if (delay > 0) {
            await this.sleep(delay);
        }
        queue.lastRequestTime = Date.now();
        queue.requestCount++;
        queue.dailyCount++;
        try {
            return await fn();
        }
        catch (error) {
            queue.requestCount--;
            queue.dailyCount--;
            throw error;
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getEndpointStatus(endpoint) {
        const limit = this.limits.find(l => l.endpoint === endpoint);
        const queue = this.requestQueues.get(endpoint);
        if (!limit || !queue) {
            return null;
        }
        const now = Date.now();
        const timeSinceLastRequest = now - queue.lastRequestTime;
        let remaining = limit.burstLimit - queue.requestCount;
        if (timeSinceLastRequest >= 60000) {
            remaining = limit.burstLimit;
        }
        return {
            remaining,
            resetTime: queue.lastRequestTime + 60000,
            dailyRemaining: limit.dailyLimit - queue.dailyCount,
        };
    }
};
exports.RateLimiterService = RateLimiterService;
exports.RateLimiterService = RateLimiterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RateLimiterService);
//# sourceMappingURL=rate-limiter.service.js.map