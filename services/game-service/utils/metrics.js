const promClient = require('prom-client');

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register, prefix: 'nodejs_' });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const gamesCreated = new promClient.Counter({
  name: 'kahoot_games_created_total',
  help: 'Total number of games created'
});

const activeGames = new promClient.Gauge({
  name: 'kahoot_active_games',
  help: 'Number of currently active games'
});

const websocketConnections = new promClient.Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(gamesCreated);
register.registerMetric(activeGames);
register.registerMetric(websocketConnections);

function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();
  
  const start = Date.now();
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
    originalEnd.apply(res, args);
  };
  
  next();
}

module.exports = { metricsMiddleware, register, gamesCreated, activeGames, websocketConnections };
