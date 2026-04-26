/**
 * Redis-Based Distributed Rate Limiting
 * 
 * Provides distributed rate limiting using Redis for multi-instance deployments.
 * Falls back to in-memory rate limiting if Redis is unavailable.
 * 
 * Usage:
 * 1. Set REDIS_URL environment variable to enable Redis-based rate limiting
 * 2. Falls back to in-memory rate limiting if REDIS_URL is not set
 */

import { RateLimitConfig, RateLimitResult } from './rate-limit';

// Redis client (lazy initialized)
let redisClient: import('ioredis').Redis | null = null;

// Check if Redis is configured
const REDIS_URL = process.env.REDIS_URL;
const USE_REDIS = !!REDIS_URL;

/**
 * Initialize Redis connection
 */
async function getRedisClient() {
  if (!USE_REDIS) return null;
  
  if (!redisClient) {
    try {
      const { default: Redis } = await import('ioredis');
      redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 3000);
        },
        enableOfflineQueue: false,
      });
      
      redisClient.on('error', (err: Error) => {
        console.error('[Redis RateLimit] Connection error:', err.message);
        redisClient = null;
      });
      
      console.log('[Redis RateLimit] Connected successfully');
    } catch (error) {
      console.error('[Redis RateLimit] Failed to import ioredis:', error);
      return null;
    }
  }
  
  return redisClient;
}

/**
 * Sliding window rate limit check using Redis
 */
async function checkRedisRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  
  const key = `ratelimit:${identifier}`;
  const windowSeconds = Math.floor(config.windowMs / 1000);
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  try {
    // Use Redis transaction for atomic operations
    const pipeline = redis.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry on the key
    pipeline.expire(key, windowSeconds + 1);
    
    const results = await pipeline.exec();
    
    if (!results) return null;
    
    const currentCount = (results[1]?.[1] as number) || 0;
    
    // Check if limit exceeded
    if (currentCount >= config.maxRequests) {
      // Get the oldest entry to calculate reset time
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldest.length >= 2 
        ? Math.ceil((parseInt(oldest[1]) + config.windowMs - now) / 1000)
        : windowSeconds;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        limit: config.maxRequests,
      };
    }
    
    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetTime: windowSeconds,
      limit: config.maxRequests,
    };
  } catch (error) {
    console.error('[Redis RateLimit] Error:', error);
    return null;
  }
}

/**
 * Token bucket rate limit check using Redis (alternative algorithm)
 */
async function checkRedisTokenBucket(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  
  const key = `ratelimit:bucket:${identifier}`;
  const windowSeconds = Math.floor(config.windowMs / 1000);
  const now = Date.now();
  
  try {
    // Lua script for atomic token bucket operations
    const luaScript = `
      local key = KEYS[1]
      local max_requests = tonumber(ARGV[1])
      local window_ms = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local refill_rate = max_requests / (window_ms / 1000)
      
      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(bucket[1]) or max_requests
      local last_refill = tonumber(bucket[2]) or now
      
      -- Calculate token refill
      local elapsed = (now - last_refill) / 1000
      local new_tokens = math.min(max_requests, tokens + (elapsed * refill_rate))
      
      if new_tokens >= 1 then
        new_tokens = new_tokens - 1
        redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
        redis.call('EXPIRE', key, windowSeconds)
        return {1, new_tokens}
      else
        redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
        redis.call('EXPIRE', key, windowSeconds)
        local wait_time = (1 - new_tokens) / refill_rate
        return {0, wait_time}
      end
    `;
    
    const result = await redis.eval(
      luaScript, 
      1, 
      key, 
      config.maxRequests, 
      config.windowMs, 
      now
    ) as number[];
    
    if (result[0] === 1) {
      return {
        allowed: true,
        remaining: Math.floor(result[1]),
        resetTime: Math.ceil(config.windowMs / 1000),
        limit: config.maxRequests,
      };
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.ceil(result[1]),
      limit: config.maxRequests,
    };
  } catch (error) {
    console.error('[Redis RateLimit] Token bucket error:', error);
    return null;
  }
}

/**
 * Create a Redis-aware rate limit middleware
 * Uses Redis for distributed rate limiting when available,
 * falls back to in-memory rate limiting otherwise.
 */
export function createRedisRateLimitMiddleware(config: RateLimitConfig) {
  return async (
    request: Request, 
    identifier?: string,
    getIP?: (request: Request) => string
  ): Promise<RateLimitResult> => {
    // Import the in-memory rate limiter
    const { checkRateLimit, getClientIP } = await import('./rate-limit');
    
    const ip = identifier || (getIP ? getIP(request) : getClientIP(request));
    
    // Try Redis first if configured
    if (USE_REDIS) {
      try {
        const result = await checkRedisRateLimit(ip, config);
        if (result) {
          console.log(`[Redis RateLimit] ${ip}: ${result.allowed ? 'allowed' : 'blocked'} (${result.remaining}/${result.limit})`);
          return result;
        }
      } catch (error) {
        console.error('[Redis RateLimit] Fallback due to error:', error);
      }
    }
    
    // Fall back to in-memory
    return checkRateLimit(ip, config);
  };
}

/**
 * Get rate limit statistics for monitoring
 */
export async function getRateLimitStats() {
  const stats = {
    mode: USE_REDIS ? 'redis' : 'in-memory',
    redisConnected: false,
  };
  
  if (USE_REDIS) {
    try {
      const redis = await getRedisClient();
      if (redis) {
        await redis.ping();
        stats.redisConnected = true;
      }
    } catch {
      // Ignore errors
    }
  }
  
  return stats;
}

/**
 * Clear rate limit data (for testing/admin)
 */
export async function clearRateLimitData() {
  if (USE_REDIS) {
    const redis = await getRedisClient();
    if (redis) {
      const keys = await redis.keys('ratelimit:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        return keys.length;
      }
    }
  }
  return 0;
}
