import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/Logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  totalHits: number;
  totalHitsPerWindow: number;
  resetTime: Date;
}

export class RateLimiter {
  private logger: Logger;
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes default
      maxRequests: 100, // 100 requests per window default
      message: 'Too many requests, please try again later',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };
    this.logger = new Logger('RateLimiter');
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = this.generateKey(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create request history for this key
    let requestTimes = this.requests.get(key) || [];
    
    // Remove requests outside the current window
    requestTimes = requestTimes.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (requestTimes.length >= this.config.maxRequests) {
      this.logger.warn(`Rate limit exceeded for ${key}`, {
        requests: requestTimes.length,
        limit: this.config.maxRequests,
        windowMs: this.config.windowMs
      });

      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: this.config.message,
        retryAfter: Math.ceil((requestTimes[0] + this.config.windowMs - now) / 1000),
        limit: this.config.maxRequests,
        windowMs: this.config.windowMs,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Add current request
    requestTimes.push(now);
    this.requests.set(key, requestTimes);

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': (this.config.maxRequests - requestTimes.length).toString(),
      'X-RateLimit-Reset': new Date(now + this.config.windowMs).toISOString(),
      'X-RateLimit-Window': this.config.windowMs.toString()
    });

    next();
  };

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(req: Request): string {
    // Use IP address as default key
    const ip = req.ip || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress || 
               'unknown';
    
    // Could also include user ID if authenticated
    return `ip:${ip}`;
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    let cleanedCount = 0;

    for (const [key, requestTimes] of this.requests.entries()) {
      const validRequests = requestTimes.filter(time => time > windowStart);
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
        cleanedCount++;
      } else if (validRequests.length < requestTimes.length) {
        this.requests.set(key, validRequests);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }

  /**
   * Get current rate limit info for a request
   */
  getInfo(req: Request): RateLimitInfo {
    const key = this.generateKey(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const requestTimes = this.requests.get(key) || [];
    const validRequests = requestTimes.filter(time => time > windowStart);

    return {
      totalHits: validRequests.length,
      totalHitsPerWindow: this.config.maxRequests,
      resetTime: new Date(now + this.config.windowMs)
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(req: Request): void {
    const key = this.generateKey(req);
    this.requests.delete(key);
    this.logger.info(`Rate limit reset for ${key}`);
  }

  /**
   * Get current statistics
   */
  getStats(): { totalKeys: number; totalRequests: number } {
    let totalRequests = 0;
    for (const requestTimes of this.requests.values()) {
      totalRequests += requestTimes.length;
    }

    return {
      totalKeys: this.requests.size,
      totalRequests
    };
  }
}

// Pre-configured rate limiters for different use cases
export const createStrictRateLimiter = () => new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50, // 50 requests per 15 minutes
  message: 'Too many requests. Please wait before trying again.'
});

export const createStandardRateLimiter = () => new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Rate limit exceeded. Please try again later.'
});

export const createLenientRateLimiter = () => new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 200, // 200 requests per 15 minutes
  message: 'Too many requests. Please slow down.'
});

export const createAPIRateLimiter = () => new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'API rate limit exceeded. Maximum 60 requests per minute.'
}); 