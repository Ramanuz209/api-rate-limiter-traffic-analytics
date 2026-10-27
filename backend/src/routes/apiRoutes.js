const express = require('express');
const router = express.Router();
const { createRateLimiter } = require('../middleware/rateLimiter');

// Standard dynamic rate limiter applies to all /api/v1/* routes
router.use(createRateLimiter());

// Mock target endpoints
router.get('/data', (req, res) => {
  res.json({
    success: true,
    message: 'Data retrieved successfully.',
    client: req.rateLimit?.clientName || 'Anonymous',
    tier: req.rateLimit?.policyName,
    remaining: req.rateLimit?.remaining,
    timestamp: new Date().toISOString(),
    payload: [
      { id: 101, name: 'Cloud Compute Instance A', status: 'online', cpuUsage: '42%' },
      { id: 102, name: 'Managed Redis Cache', status: 'online', memoryUsage: '68%' },
      { id: 103, name: 'PostgreSQL Primary Replica', status: 'healthy', latency: '2.4ms' }
    ]
  });
});

router.get('/search', (req, res) => {
  const query = req.query.q || 'default';
  res.json({
    success: true,
    query,
    resultsCount: 3,
    client: req.rateLimit?.clientName,
    results: [
      { id: 1, title: `Search result 1 for '${query}'`, score: 0.98 },
      { id: 2, title: `Search result 2 for '${query}'`, score: 0.85 },
      { id: 3, title: `Search result 3 for '${query}'`, score: 0.72 }
    ]
  });
});

router.post('/transactions', (req, res) => {
  const { amount = 100, currency = 'USD' } = req.body || {};
  res.status(201).json({
    success: true,
    transactionId: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    amount,
    currency,
    status: 'completed',
    processedBy: req.rateLimit?.clientName,
    createdAt: new Date().toISOString()
  });
});

router.get('/reports', (req, res) => {
  res.json({
    success: true,
    reportName: 'Monthly API Traffic & SLA Compliance',
    generatedFor: req.rateLimit?.clientName,
    generatedAt: new Date().toISOString(),
    metrics: {
      uptime: '99.99%',
      averageResponseTime: '32ms',
      errorRate: '0.04%'
    }
  });
});

router.get('/ping', (req, res) => {
  res.json({
    pong: true,
    time: Date.now(),
    client: req.rateLimit?.clientName,
    remainingQuota: req.rateLimit?.remaining
  });
});

module.exports = router;
