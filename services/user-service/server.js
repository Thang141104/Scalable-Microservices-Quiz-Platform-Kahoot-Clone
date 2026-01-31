// 🧪 PIPELINE TEST: Full build all services
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { metricsMiddleware, register } = require('./utils/metrics');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3004;

// Metrics middleware
app.use(metricsMiddleware);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads/avatars', express.static(uploadsDir));

// Import routes
const profileRoutes = require('./routes/profile.routes');
const statsRoutes = require('./routes/stats.routes');
const achievementsRoutes = require('./routes/achievements.routes');
const preferencesRoutes = require('./routes/preferences.routes');
const statsWebhookRoutes = require('./routes/stats-webhook.routes');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log(' Connected to MongoDB (User Service)');
  
  // Initialize achievements in database
  initializeAchievements();
})
.catch(err => {
  console.error(' MongoDB connection error:', err);
  process.exit(1);
});

// Initialize achievements from config file
async function initializeAchievements() {
  try {
    const Achievement = require('./models/Achievement');
    const achievementsData = require('./config/achievements.json');
    
    const count = await Achievement.countDocuments();
    
    if (count === 0) {
      console.log(' Seeding achievements...');
      await Achievement.insertMany(achievementsData);
      console.log(` Seeded ${achievementsData.length} achievements`);
    } else {
      console.log(` Achievements already initialized (${count} achievements)`);
    }
  } catch (error) {
    console.error(' Error initializing achievements:', error);
  }
}

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes (without /api prefix - Gateway handles that)
app.use('/users', profileRoutes);
app.use('/users', statsRoutes);
app.use('/users', achievementsRoutes);
app.use('/users', preferencesRoutes);
app.use('/webhook', statsWebhookRoutes); // For stats updates from other services

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'User Service API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      profile: '/api/users/:userId/profile',
      avatar: '/api/users/:userId/avatar',
      stats: '/api/users/:userId/stats',
      activity: '/api/users/:userId/activity',
      achievements: '/api/users/:userId/achievements',
      preferences: '/api/users/:userId/preferences',
      catalog: '/api/users/achievements/catalog'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server - bind to 0.0.0.0 for container access
app.listen(PORT, '0.0.0.0', () => {
  console.log(` User Service running on 0.0.0.0:${PORT}`);
  console.log(` Avatars directory: ${uploadsDir}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n Shutting down gracefully...');
  await mongoose.connection.close();
  console.log(' MongoDB connection closed');
  process.exit(0);
});

module.exports = app;
