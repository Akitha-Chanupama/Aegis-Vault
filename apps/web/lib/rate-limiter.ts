/**
 * In-memory sliding-window rate limiter for sensitive authentication and vault operations.
 * Protects against brute-force attacks on login, registration, and key operations.
 */

interface RateLimitRecord {
  timestamps: number[];
}

export class RateLimiter {
  private limits = new Map<string, RateLimitRecord>();

  constructor(
    public readonly maxRequests: number,
    public readonly windowMs: number
  ) {}

  public isAllowed(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.limits.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.limits.set(key, record);
    }

    // Clean old timestamps outside the window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0];
      const resetMs = oldest + this.windowMs - now;
      return { allowed: false, remaining: 0, resetMs };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - record.timestamps.length,
      resetMs: this.windowMs,
    };
  }

  public reset(key: string): void {
    this.limits.delete(key);
  }
}

// Global pre-configured rate limiters
export const authRateLimiter = new RateLimiter(5, 60 * 1000); // 5 attempts per minute
export const keyRateLimiter = new RateLimiter(10, 60 * 1000); // 10 attempts per minute
export const uploadRateLimiter = new RateLimiter(30, 60 * 1000); // 30 requests per minute
