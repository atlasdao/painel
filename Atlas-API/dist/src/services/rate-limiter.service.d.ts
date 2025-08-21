export declare class RateLimiterService {
    private readonly limits;
    private requestQueues;
    constructor();
    private getNextDayReset;
    executeWithRateLimit<T>(endpoint: string, fn: () => Promise<T>): Promise<T>;
    private sleep;
    getEndpointStatus(endpoint: string): {
        remaining: number;
        resetTime: number;
        dailyRemaining: number;
    } | null;
}
