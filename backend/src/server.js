const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./config/database');
const { initializeRedis, getRedisStatus } = require('./config/redis');
const { trafficLogger } = require('./middleware/trafficLogger');
const { seedInitialData } = require('./services/seedService');

const apiRoutes = require('./routes/apiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const policyRoutes = require('./routes/policyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts/styles for React dashboard if served statically
}));
app.use(cors({
  origin: '*',
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-RateLimit-Policy', 'X-RateLimit-Engine', 'Retry-After']
}));
app.use(express.json());
app.use(morgan('dev'));

// Traffic Logger & Latency Tracker (applied to all requests)
app.use(trafficLogger);

// System Health & Engine Info
app.get('/api/health', (req, res) => {
  const redisInfo = getRedisStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: sequelize.getDialect(),
    rateLimitingEngine: redisInfo.engine,
    redisConnected: redisInfo.connected
  });
});

// API Routes
app.use('/api/v1', apiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', policyRoutes);

// Serve Frontend Static Assets if built
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <h1>API Rate Limiting Platform Backend Running</h1>
        <p>Backend API is active on port ${PORT}.</p>
        <p>To view the dashboard, run the frontend Vite dev server or run <code>npm run build</code> in the frontend folder.</p>
        <p><a href="/api/health">Check /api/health</a></p>
      `);
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Server and Database Sync
let initPromise = null;

async function startServer() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 1. Initialize Redis connection
      initializeRedis();

      // 2. Connect and Sync Database Models
      await sequelize.authenticate();
      console.log(`✅ [Database] Connection established successfully (${sequelize.getDialect()}).`);
      
      await sequelize.sync({ alter: true });
      console.log('✅ [Database] Models synchronized with schema.');

      // 3. Seed baseline policies and demo clients
      await seedInitialData();

      // 4. Start HTTP Server if running standalone
      if (process.env.NODE_ENV !== 'test') {
        const server = app.listen(PORT, () => {
          console.log(`\n🚀 ========================================================`);
          console.log(`🚀 API Rate Limiter & Traffic Analytics Platform`);
          console.log(`🚀 Server listening on http://localhost:${PORT}`);
          console.log(`🚀 Database: ${sequelize.getDialect()}`);
          console.log(`🚀 Redis Status: ${getRedisStatus().engine}`);
          console.log(`🚀 Health Check: http://localhost:${PORT}/api/health`);
          console.log(`🚀 ========================================================\n`);
        });
        return server;
      }
    } catch (error) {
      console.error('❌ [Server] Startup failed:', error);
      throw error;
    }
  })();

  return initPromise;
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
