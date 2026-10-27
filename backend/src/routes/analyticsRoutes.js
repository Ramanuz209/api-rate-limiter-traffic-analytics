const express = require('express');
const router = express.Router();
const {
  getOverviewMetrics,
  getTimeSeriesTraffic,
  getStatusCodeDistribution,
  getClientUsageBreakdown,
  getEndpointBreakdown
} = require('../services/metricsService');
const { RequestLog } = require('../models');
const { getRecentLogsInMemory } = require('../middleware/trafficLogger');

// GET /api/analytics/overview
router.get('/overview', async (req, res) => {
  try {
    const timeframe = parseInt(req.query.timeframe || '60', 10);
    const data = await getOverviewMetrics(timeframe);
    res.json(data);
  } catch (error) {
    console.error('Error fetching overview metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve overview metrics', details: error.message });
  }
});

// GET /api/analytics/traffic
router.get('/traffic', async (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes || '30', 10);
    const data = await getTimeSeriesTraffic(minutes);
    res.json(data);
  } catch (error) {
    console.error('Error fetching traffic series:', error);
    res.status(500).json({ error: 'Failed to retrieve traffic series', details: error.message });
  }
});

// GET /api/analytics/status-distribution
router.get('/status-distribution', async (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes || '60', 10);
    const data = await getStatusCodeDistribution(minutes);
    res.json(data);
  } catch (error) {
    console.error('Error fetching status distribution:', error);
    res.status(500).json({ error: 'Failed to retrieve status distribution', details: error.message });
  }
});

// GET /api/analytics/clients
router.get('/clients', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '6', 10);
    const data = await getClientUsageBreakdown(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching client breakdown:', error);
    res.status(500).json({ error: 'Failed to retrieve client breakdown', details: error.message });
  }
});

// GET /api/analytics/endpoints
router.get('/endpoints', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '6', 10);
    const data = await getEndpointBreakdown(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching endpoint breakdown:', error);
    res.status(500).json({ error: 'Failed to retrieve endpoint breakdown', details: error.message });
  }
});

// GET /api/analytics/logs (recent traffic logs with filter/search)
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const isBlocked = req.query.blocked === 'true' ? true : req.query.blocked === 'false' ? false : null;
    const search = req.query.search || null;

    const whereClause = {};
    if (isBlocked !== null) {
      whereClause.isBlocked = isBlocked;
    }

    const logs = await RequestLog.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    // Fallback to in-memory buffer if DB fails
    res.json(getRecentLogsInMemory(50));
  }
});

module.exports = router;

