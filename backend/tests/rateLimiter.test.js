const request = require('supertest');
const app = require('../src/server');
const { startServer } = require('../src/server');
const { sequelize } = require('../src/config/database');
const { _memoryStore } = require('../src/config/redis');

describe('API Rate Limiter & Concurrency Test Suite', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await startServer();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(() => {
    // Clear in-memory rate limiter cache between tests
    _memoryStore.clear();
  });

  describe('1. Health and Status Endpoint', () => {
    it('should return health status and storage engine info', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('rateLimitingEngine');
      expect(res.body).toHaveProperty('database');
    });
  });

  describe('2. Rate Limiting Headers & Enforcement', () => {
    it('should allow requests under the limit and set proper rate limit headers', async () => {
      const res = await request(app)
        .get('/api/v1/ping')
        .set('X-API-KEY', 'key_enterprise_live_9999');

      expect(res.status).toBe(200);
      expect(res.headers).toHaveProperty('x-ratelimit-limit');
      expect(res.headers).toHaveProperty('x-ratelimit-remaining');
      expect(res.headers).toHaveProperty('x-ratelimit-reset');
      expect(res.headers).toHaveProperty('x-ratelimit-policy');
      expect(parseInt(res.headers['x-ratelimit-limit'], 10)).toBe(200);
    });

    it('should reject invalid or unknown API keys with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/data')
        .set('X-API-KEY', 'invalid_fake_key_999');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should strictly enforce limits and return 429 Too Many Requests when quota exceeded', async () => {
      const strictKey = 'key_strict_live_0005'; // Policy: 5 reqs per 10s

      // First 5 requests should pass
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .get('/api/v1/ping')
          .set('X-API-KEY', strictKey);
        expect(res.status).toBe(200);
      }

      // 6th request must be blocked
      const blockedRes = await request(app)
        .get('/api/v1/ping')
        .set('X-API-KEY', strictKey);

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers).toHaveProperty('retry-after');
      expect(blockedRes.body.error).toBe('Too Many Requests');
      expect(blockedRes.body.remaining).toBe(0);
      expect(blockedRes.body.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('3. High Concurrency Race Condition Test', () => {
    it('should correctly handle concurrent requests without race conditions', async () => {
      const strictKey = 'key_strict_live_0005'; // Limit: 5 requests
      const concurrentRequestCount = 20;

      // Fire 20 requests simultaneously
      const promises = Array.from({ length: concurrentRequestCount }, () =>
        request(app)
          .get('/api/v1/data')
          .set('X-API-KEY', strictKey)
      );

      const responses = await Promise.all(promises);

      const passed = responses.filter(r => r.status === 200);
      const blocked = responses.filter(r => r.status === 429);

      // Exactly 5 should pass and 15 should be rate-limited
      expect(passed.length).toBe(5);
      expect(blocked.length).toBe(15);

      blocked.forEach(b => {
        expect(b.body.error).toBe('Too Many Requests');
        expect(b.headers).toHaveProperty('retry-after');
      });
    });
  });

  describe('4. Analytics and Management Endpoints', () => {
    it('should return overview metrics with expected data structure', async () => {
      const res = await request(app).get('/api/analytics/overview');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalRequests');
      expect(res.body).toHaveProperty('blockedRequests');
      expect(res.body).toHaveProperty('avgLatency');
      expect(res.body).toHaveProperty('storageEngine');
    });

    it('should list all rate limit policies', async () => {
      const res = await request(app).get('/api/policies');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
    });
  });
});

