// 🧪 PIPELINE TEST: Full build all services
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { metricsMiddleware, register } = require('./utils/metrics');
require('dotenv').config();

const app = express();

// Metrics middleware
app.use(metricsMiddleware);

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log(' MongoDB connected'))
.catch(err => console.error(' MongoDB connection error:', err));

// Routes
const quizRoutes = require('./routes/quiz.routes');
const uploadRoutes = require('./routes/upload.routes');
app.use('/quizzes', quizRoutes);
app.use('/upload', uploadRoutes);

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
  res.json({ 
    status: 'OK', 
    service: 'quiz-service',
    timestamp: new Date().toISOString() 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(` Quiz Service running on port ${PORT}`);
});
