/**
 * Rate Limiting Utility
 * 
 * Enhanced in-memory rate limiting for API endpoints.
 * For production, consider using Redis or a distributed cache.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
  lastRequest: number;
}

// In-memory store for rate limit records
// Key: identifier (IP, user ID, etc.)
// Value: { count, resetTime, lastRequest }
const rateLimitStore = new Map<string, RateLimitRecord>();

// Track rate limit hits for monitoring
const rateLimitHits = new Map<string, { count: number; firstHit: number }>();

// Maximum entries in store to prevent memory issues
const MAX_STORE_ENTRIES = 50000;

// Cleanup old entries every 5 minutes (reduced from 10)
setInterval(() => {
  const now = Date.now();
  let deleted = 0;
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
      deleted++;
    }
  }
  // If store is getting too large, clear old entries regardless of expiry
  if (rateLimitStore.size > MAX_STORE_ENTRIES) {
    const entries = Array.from(rateLimitStore.entries());
    entries.sort((a, b) => a[1].lastRequest - b[1].lastRequest);
    const toDelete = entries.slice(0, Math.floor(MAX_STORE_ENTRIES * 0.2));
    for (const [key] of toDelete) {
      rateLimitStore.delete(key);
      deleted++;
    }
  }
  if (deleted > 0) {
    console.log(`[RateLimit] Cleanup: removed ${deleted} expired entries, ${rateLimitStore.size} remaining`);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Custom key generator function
   * Default: uses IP address or user ID
   */
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Number of requests remaining in the current window
   */
  remaining: number;

  /**
   * Time in seconds until the window resets
   */
  resetTime: number;

  /**
   * Total requests allowed per window
   */
  limit: number;
}

/**
 * Check rate limit for a given identifier
 * 
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 * 
 * @example
 * const result = checkRateLimit('user-123', { maxRequests: 100, windowMs: 60000 });
 * if (!result.allowed) {
 *   return errors.rateLimit(result.resetTime);
 * }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;

  const record = rateLimitStore.get(key);

  // If no record or window has expired, create new record
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
      lastRequest: now,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: Math.ceil(config.windowMs / 1000),
      limit: config.maxRequests,
    };
  }

  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.ceil((record.resetTime - now) / 1000),
      limit: config.maxRequests,
    };
  }

  // Increment count and update last request time
  record.count++;
  record.lastRequest = now;
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: Math.ceil((record.resetTime - now) / 1000),
    limit: config.maxRequests,
  };
}

/**
 * Preset rate limit configurations - ENHANCED for high traffic
 */
export const rateLimitPresets = {
  /**
   * Authentication endpoints (sign in, sign up)
   * 20 requests per minute (increased from 10)
   */
  auth: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },

  /**
   * Password reset
   * 10 requests per hour (increased from 5)
   */
  passwordReset: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  /**
   * API endpoints (general) - INCREASED for production
   * 500 requests per minute (increased from 200)
   */
  api: {
    maxRequests: 500,
    windowMs: 60 * 1000, // 1 minute
  },

  /**
   * Export endpoints (expensive operations)
   * 30 requests per minute (increased from 20)
   */
  export: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },

  /**
   * File upload endpoints
   * 50 requests per minute (increased from 30)
   */
  upload: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
  },

  /**
   * Search endpoints
   * 120 requests per minute (increased from 60)
   */
  search: {
    maxRequests: 120,
    windowMs: 60 * 1000, // 1 minute
  },

  /**
   * Chat/AI endpoints (expensive LLM calls)
   * 30 requests per minute (NEW - higher than original 10)
   */
  chat: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Get client IP from request headers
 * Works with various proxy configurations
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwarded) {
    // x-forwarded-for may contain multiple IPs, first is the client
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback for development
  return 'unknown';
}

/**
 * Create a rate limit middleware for specific endpoints
 * 
 * @example
 * const authRateLimit = createRateLimitMiddleware(rateLimitPresets.auth);
 * 
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = authRateLimit(request);
 *   if (!rateLimitResult.allowed) {
 *     return errors.rateLimit(rateLimitResult.resetTime);
 *   }
 *   // ... rest of handler
 * }
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (request: Request, identifier?: string): RateLimitResult => {
    const ip = identifier || getClientIP(request);
    return checkRateLimit(ip, config);
  };
}

/**
 * Add rate limit headers to response
 * Should be called even when request is allowed
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): void {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetTime));
}
