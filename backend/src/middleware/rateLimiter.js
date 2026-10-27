const { ApiKey, Policy, Client } = require('../models');
const { checkSlidingWindow } = require('../config/redis');

// In-memory cache for API key lookups to optimize latency
const keyCache = new Map();
const CACHE_TTL_MS = 30000; // 30 seconds

async function resolveApiKeyDetails(keyString) {
  const cached = keyCache.get(keyString);
  const now = Date.now();
  if (cached && (now - cached.cachedAt) < CACHE_TTL_MS) {
    return cached.data;
  }

  const apiKeyRecord = await ApiKey.findOne({
    where: { key: keyString, isActive: true },
    include: [
      { model: Policy, as: 'policy' },
      { model: Client, as: 'client' }
    ]
  });

  if (!apiKeyRecord) {
    keyCache.set(keyString, { data: null, cachedAt: now });
    return null;
  }

  const data = {
    key: apiKeyRecord.key,
    clientId: apiKeyRecord.clientId,
    clientName: apiKeyRecord.client ? apiKeyRecord.client.name : 'Unknown Client',
    policy: apiKeyRecord.policy || {
      name: 'Default Policy',
      windowSec: 60,
      maxRequests: 60,
      burstLimit: 60
    }
  };

  keyCache.set(keyString, { data, cachedAt: now });
  return data;
}

// Invalidate cache when policies/keys are modified
function clearKeyCache() {
  keyCache.clear();
}

/**
 * Dynamic Rate Limiter Middleware
 * @param {Object} overridePolicy Optional manual override { windowSec, maxRequests, name }
 */
function createRateLimiter(overridePolicy = null) {
  return async function rateLimiterMiddleware(req, res, next) {
    const startTime = Date.now();
    const apiKeyHeader = req.headers['x-api-key'] || req.query.apiKey || req.query.api_key;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';

    let rateLimitKey;
    let policy;
    let clientId = null;
    let clientName = 'Anonymous IP';

    if (overridePolicy) {
      policy = overridePolicy;
      rateLimitKey = `ratelimit:custom:${apiKeyHeader || clientIp}:${policy.windowSec}`;
    } else if (apiKeyHeader) {
      const keyDetails = await resolveApiKeyDetails(apiKeyHeader);
      if (!keyDetails) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or deactivated API Key provided in X-API-KEY header.'
        });
      }

      policy = keyDetails.policy;
      clientId = keyDetails.clientId;
      clientName = keyDetails.clientName;
      rateLimitKey = `ratelimit:client:${clientId}:${policy.windowSec}`;
    } else {
      // Anonymous IP fallback
      policy = {
        name: 'Anonymous IP Policy',
        windowSec: 60,
        maxRequests: 30
      };
      rateLimitKey = `ratelimit:ip:${clientIp}:${policy.windowSec}`;
    }

    // Call sliding window evaluator (Redis Lua or memory fallback)
    const result = await checkSlidingWindow({
      key: rateLimitKey,
      windowSec: policy.windowSec,
      maxRequests: policy.maxRequests
    });

    // Attach standard rate limit headers
    res.setHeader('X-RateLimit-Limit', policy.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime);
    res.setHeader('X-RateLimit-Policy', policy.name);
    res.setHeader('X-RateLimit-Engine', result.engine);

    req.rateLimit = {
      apiKey: apiKeyHeader || null,
      clientId,
      clientName,
      policyName: policy.name,
      limit: policy.maxRequests,
      remaining: result.remaining,
      resetTime: result.resetTime,
      windowSec: policy.windowSec,
      isAllowed: result.allowed
    };

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterSec);

      // Store blocked request in audit logs
      req.rateLimit.blockedReason = `Exceeded ${policy.maxRequests} requests per ${policy.windowSec}s`;

      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded for policy '${policy.name}'. Please retry after ${result.retryAfterSec} seconds.`,
        limit: policy.maxRequests,
        remaining: 0,
        retryAfter: result.retryAfterSec,
        resetTime: result.resetTime,
        policy: policy.name,
        engine: result.engine
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  clearKeyCache
};

