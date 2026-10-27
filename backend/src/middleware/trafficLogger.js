const { RequestLog } = require('../models');

// Circular buffer in memory for the most recent 100 requests (instant latency for dashboard)
const RECENT_LOGS_MAX = 100;
const recentLogsBuffer = [];

// Log persistence queue to batch write logs and minimize DB overhead
let logQueue = [];
const BATCH_INTERVAL_MS = 1500;

const batchLoggerInterval = setInterval(async () => {
  if (logQueue.length === 0) return;
  const toInsert = [...logQueue];
  logQueue = [];

  try {
    await RequestLog.bulkCreate(toInsert);
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('⚠️ [TrafficLogger] Failed to bulk insert request logs:', err.message);
    }
  }
}, BATCH_INTERVAL_MS);

if (batchLoggerInterval.unref) {
  batchLoggerInterval.unref();
}

function trafficLogger(req, res, next) {
  const startTime = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    originalEnd.apply(res, args);

    const responseTimeMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const isBlocked = statusCode === 429;
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';

    // Skip internal analytics endpoints from polluting rate limit analytics charts
    if (req.originalUrl.startsWith('/api/analytics') || req.originalUrl.startsWith('/api/health')) {
      return;
    }

    const logEntry = {
      apiKey: req.rateLimit?.apiKey || null,
      clientId: req.rateLimit?.clientId || null,
      clientName: req.rateLimit?.clientName || (req.rateLimit?.apiKey ? 'Unknown Client' : 'Anonymous IP'),
      ip,
      endpoint: req.baseUrl + req.path || req.originalUrl,
      method: req.method,
      statusCode,
      responseTimeMs,
      isBlocked,
      policyName: req.rateLimit?.policyName || 'Standard',
      blockedReason: req.rateLimit?.blockedReason || (isBlocked ? 'Rate limit exceeded' : null),
      createdAt: new Date()
    };

    // Update in-memory ring buffer
    recentLogsBuffer.unshift({ ...logEntry, id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` });
    if (recentLogsBuffer.length > RECENT_LOGS_MAX) {
      recentLogsBuffer.pop();
    }

    // Queue for database bulk persistence
    logQueue.push(logEntry);
  };

  next();
}

function getRecentLogsInMemory(limit = 50) {
  return recentLogsBuffer.slice(0, limit);
}

module.exports = {
  trafficLogger,
  getRecentLogsInMemory
};

