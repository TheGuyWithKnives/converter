interface RateLimitConfig {
  maxRequests: number;
  timeWindowMs: number;
  penaltyMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  penaltyUntil?: number;
}

export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      timeWindowMs: config.timeWindowMs,
      penaltyMs: config.penaltyMs || config.timeWindowMs * 2,
    };

    setInterval(() => this.cleanup(), 60000);
  }

  check(key: string): { allowed: boolean; retryAfter?: number; remaining?: number } {
    const now = Date.now();
    const entry = this.requests.get(key);

    if (entry?.penaltyUntil && entry.penaltyUntil > now) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.penaltyUntil - now) / 1000),
      };
    }

    if (!entry || entry.resetTime < now) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.config.timeWindowMs,
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
      };
    }

    if (entry.count >= this.config.maxRequests) {
      entry.penaltyUntil = now + this.config.penaltyMs;
      this.requests.set(key, entry);

      return {
        allowed: false,
        retryAfter: Math.ceil(this.config.penaltyMs / 1000),
      };
    }

    entry.count++;
    this.requests.set(key, entry);

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
    };
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  resetAll(): void {
    this.requests.clear();
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.requests.entries()) {
      if (entry.resetTime < now && (!entry.penaltyUntil || entry.penaltyUntil < now)) {
        this.requests.delete(key);
      }
    }
  }

  getStatus(key: string): { count: number; limit: number; resetAt: number } | null {
    const entry = this.requests.get(key);

    if (!entry) {
      return null;
    }

    return {
      count: entry.count,
      limit: this.config.maxRequests,
      resetAt: entry.resetTime,
    };
  }
}

export const apiRateLimiter = new RateLimiter({
  maxRequests: 5,
  timeWindowMs: 60000,
  penaltyMs: 120000,
});

export const uploadRateLimiter = new RateLimiter({
  maxRequests: 10,
  timeWindowMs: 60000,
});

export const exportRateLimiter = new RateLimiter({
  maxRequests: 20,
  timeWindowMs: 60000,
});

export function createUserKey(identifier?: string): string {
  if (identifier) {
    return `user:${identifier}`;
  }

  const fingerprint =
    navigator.userAgent +
    navigator.language +
    screen.width +
    screen.height +
    new Date().getTimezoneOffset();

  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return `anonymous:${hash}`;
}

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private capacity: number;
  private refillRate: number;

  constructor(capacity: number, refillPerSecond: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillPerSecond;
    this.lastRefill = Date.now();
  }

  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

export const modelGenerationBucket = new TokenBucket(3, 0.5);

export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  rateLimiter: RateLimiter,
  keyGenerator: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    const check = rateLimiter.check(key);

    if (!check.allowed) {
      throw new Error(
        `Rate limit exceeded. Please try again in ${check.retryAfter} seconds.`
      );
    }

    try {
      return await fn(...args);
    } catch (error) {
      throw error;
    }
  }) as T;
}
