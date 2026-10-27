const { RequestLog, Client, Policy, ApiKey, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getRecentLogsInMemory } = require('../middleware/trafficLogger');
const { getRedisStatus } = require('../config/redis');

async function getOverviewMetrics(timeframeMinutes = 60) {
  const since = new Date(Date.now() - timeframeMinutes * 60 * 1000);

  // 1. Basic counts
  const totalRequests = await RequestLog.count({
    where: { createdAt: { [Op.gte]: since } }
  });

  const blockedRequests = await RequestLog.count({
    where: {
      createdAt: { [Op.gte]: since },
      isBlocked: true
    }
  });

  const allowedRequests = totalRequests - blockedRequests;
  const blockedRate = totalRequests > 0 ? ((blockedRequests / totalRequests) * 100).toFixed(1) : 0;

  // 2. Latency metrics
  const avgLatencyResult = await RequestLog.findOne({
    attributes: [
      [sequelize.fn('AVG', sequelize.col('responseTimeMs')), 'avgLatency'],
      [sequelize.fn('MIN', sequelize.col('responseTimeMs')), 'minLatency'],
      [sequelize.fn('MAX', sequelize.col('responseTimeMs')), 'maxLatency']
    ],
    where: { createdAt: { [Op.gte]: since } },
    raw: true
  });

  const avgLatency = avgLatencyResult?.avgLatency ? parseFloat(Number(avgLatencyResult.avgLatency).toFixed(1)) : 0;
  const minLatency = avgLatencyResult?.minLatency ? parseFloat(Number(avgLatencyResult.minLatency).toFixed(1)) : 0;
  const maxLatency = avgLatencyResult?.maxLatency ? parseFloat(Number(avgLatencyResult.maxLatency).toFixed(1)) : 0;

  // 3. Client & Key Counts
  const totalClients = await Client.count();
  const totalApiKeys = await ApiKey.count({ where: { isActive: true } });
  const totalPolicies = await Policy.count();

  // 4. Redis Engine Status
  const redisInfo = getRedisStatus();

  return {
    totalRequests,
    allowedRequests,
    blockedRequests,
    blockedRate: Number(blockedRate),
    avgLatency,
    minLatency,
    maxLatency,
    totalClients,
    totalApiKeys,
    totalPolicies,
    storageEngine: redisInfo.engine,
    isRedisConnected: redisInfo.connected,
    timeframeMinutes
  };
}

async function getTimeSeriesTraffic(minutes = 30) {
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const logs = await RequestLog.findAll({
    where: { createdAt: { [Op.gte]: since } },
    attributes: ['createdAt', 'statusCode', 'isBlocked', 'responseTimeMs'],
    order: [['createdAt', 'ASC']],
    raw: true
  });

  // Group by minute buckets
  const bucketMap = new Map();
  const now = Date.now();

  for (let i = minutes - 1; i >= 0; i--) {
    const bucketDate = new Date(now - i * 60 * 1000);
    const minuteStr = bucketDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    bucketMap.set(minuteStr, {
      time: minuteStr,
      allowed: 0,
      blocked: 0,
      total: 0,
      avgLatency: 0,
      latencySum: 0
    });
  }

  logs.forEach(log => {
    const d = new Date(log.createdAt);
    const minuteStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let bucket = bucketMap.get(minuteStr);
    if (!bucket) {
      bucket = { time: minuteStr, allowed: 0, blocked: 0, total: 0, avgLatency: 0, latencySum: 0 };
      bucketMap.set(minuteStr, bucket);
    }
    bucket.total += 1;
    if (log.isBlocked) {
      bucket.blocked += 1;
    } else {
      bucket.allowed += 1;
    }
    bucket.latencySum += (log.responseTimeMs || 0);
  });

  const series = Array.from(bucketMap.values()).map(b => ({
    time: b.time,
    allowed: b.allowed,
    blocked: b.blocked,
    total: b.total,
    avgLatency: b.total > 0 ? Math.round(b.latencySum / b.total) : 0
  }));

  return series;
}

async function getStatusCodeDistribution(minutes = 60) {
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const stats = await RequestLog.findAll({
    attributes: [
      'statusCode',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: { createdAt: { [Op.gte]: since } },
    group: ['statusCode'],
    raw: true
  });

  return stats.map(s => ({
    status: s.statusCode,
    count: parseInt(s.count, 10),
    name: s.statusCode === 200 ? '200 OK' :
          s.statusCode === 429 ? '429 Rate Limited' :
          s.statusCode === 401 ? '401 Unauthorized' :
          s.statusCode === 500 ? '500 Server Error' : `${s.statusCode}`
  }));
}

async function getClientUsageBreakdown(limit = 6) {
  const breakdown = await RequestLog.findAll({
    attributes: [
      'clientName',
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalRequests'],
      [sequelize.literal('SUM(CASE WHEN isBlocked = 1 THEN 1 ELSE 0 END)'), 'blockedRequests'],
      [sequelize.fn('AVG', sequelize.col('responseTimeMs')), 'avgLatency']
    ],
    group: ['clientName'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    limit,
    raw: true
  });

  return breakdown.map(item => ({
    clientName: item.clientName || 'Anonymous',
    totalRequests: parseInt(item.totalRequests, 10),
    blockedRequests: parseInt(item.blockedRequests || 0, 10),
    avgLatency: Math.round(item.avgLatency || 0)
  }));
}

async function getEndpointBreakdown(limit = 6) {
  const breakdown = await RequestLog.findAll({
    attributes: [
      'endpoint',
      'method',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('AVG', sequelize.col('responseTimeMs')), 'avgLatency']
    ],
    group: ['endpoint', 'method'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    limit,
    raw: true
  });

  return breakdown.map(item => ({
    endpoint: `${item.method} ${item.endpoint}`,
    count: parseInt(item.count, 10),
    avgLatency: Math.round(item.avgLatency || 0)
  }));
}

module.exports = {
  getOverviewMetrics,
  getTimeSeriesTraffic,
  getStatusCodeDistribution,
  getClientUsageBreakdown,
  getEndpointBreakdown
};

