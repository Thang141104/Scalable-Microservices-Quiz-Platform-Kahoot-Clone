// 🧪 PIPELINE TEST: Full build all services
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { metricsMiddleware, register } = require('./utils/metrics');
require('dotenv').config();

const app = express();

// Metrics middleware (must be first)
app.use(metricsMiddleware);

// Middleware
app.use(helmet());
app.use(cors());
// DO NOT parse body in gateway - let target services handle it
// app.use(express.json());

// Rate limiting - More generous for development and real-time games
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 200, // 200 requests per minute per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health'
});
app.use('/api', limiter); // Only apply to API routes, not health check

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Detailed health check for all services
app.get('/health/services', async (req, res) => {
  const axios = require('axios');
  const serviceHealth = {};
  
  for (const [name, config] of Object.entries(services)) {
    try {
      const response = await axios.get(`${config.target}/health`, { timeout: 5000 });
      serviceHealth[name] = {
        status: 'OK',
        statusCode: response.status,
        url: config.target
      };
    } catch (error) {
      serviceHealth[name] = {
        status: 'DOWN',
        error: error.message,
        url: config.target
      };
    }
  }
  
  const allHealthy = Object.values(serviceHealth).every(s => s.status === 'OK');
  
  res.status(allHealthy ? 200 : 503).json({
    gateway: 'OK',
    services: serviceHealth,
    timestamp: new Date().toISOString()
  });
});

// Proxy configurations
const services = {
  auth: {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: { '^/api/auth': '' }
  },
  quiz: {
    target: process.env.QUIZ_SERVICE_URL || 'http://localhost:3002',
    pathRewrite: { '^/api/quiz': '' }
  },
  game: {
    target: process.env.GAME_SERVICE_URL || 'http://localhost:3003',
    pathRewrite: { '^/api/game': '' }
  },
  user: {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3004',
    pathRewrite: { '^/api/user': '' }
  },
  analytics: {
    target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005',
    pathRewrite: { '^/api/analytics': '' }
  }
};

// Setup proxies with better timeout and error handling
Object.keys(services).forEach(service => {
  app.use(
    `/api/${service}`,
    createProxyMiddleware({
      target: services[service].target,
      changeOrigin: true,
      pathRewrite: services[service].pathRewrite,
      timeout: 30000, // 30 second timeout
      proxyTimeout: 30000, // 30 second proxy timeout
      // Keep connections alive
      agent: undefined, // Use default agent with keep-alive
      onError: (err, req, res) => {
        console.error(`❌ Proxy error for ${service}:`, err.message);
        console.error(`   Request: ${req.method} ${req.url}`);
        console.error(`   Target: ${services[service].target}`);
        
        if (!res.headersSent) {
          res.status(503).json({
            error: 'Service Unavailable',
            service: service,
            message: `${service} service is currently unavailable`,
            timestamp: new Date().toISOString()
          });
        }
      },
      onProxyReq: (proxyReq, req, res) => {
        // Log requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`➡️  ${req.method} ${req.url} → ${services[service].target}${req.url}`);
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        // Log responses in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`⬅️  ${proxyRes.statusCode} ${req.method} ${req.url}`);
        }
      }
    })
  );
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;  // Keep at 3000 for gateway
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Rate limit: 200 requests/minute per IP`);
  console.log(`⏱️  Timeout: 30 seconds`);
  console.log(`\n📋 Available routes:`);
  console.log(`   GET  /health - Gateway health check`);
  console.log(`   GET  /health/services - All services health check`);
  Object.keys(services).forEach(service => {
    console.log(`   *    /api/${service} → ${services[service].target}`);
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    console.log('👋 Gateway shutdown complete');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Log unhandled errors
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection in development
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('unhandledRejection');
  }
});
