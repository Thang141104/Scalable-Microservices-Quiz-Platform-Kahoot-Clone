/**
 * Simple Auth Service
 * 🧪 PIPELINE TEST: Full build all services
 */

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
const { metricsMiddleware, register } = require('./utils/metrics');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable Prometheus metrics collection
app.use(metricsMiddleware);

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'auth-service' });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Import routes
const authRoutes = require('./routes/auth.routes');
app.use('/', authRoutes); // Gateway already strips /api/auth prefix

// Basic error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log(' Connected to MongoDB');
    // Start server only after DB connection
    app.listen(PORT, '0.0.0.0', () => {
      console.log(` Auth Service listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(' Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');  
  process.exit(0);
});

module.exports = app;
