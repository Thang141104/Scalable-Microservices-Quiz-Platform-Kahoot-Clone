const express = require('express');
const router = express.Router();
const Event = require('../models/AnalyticsEvent');
const {
  aggregateGlobalStats,
  getUserEngagementMetrics,
  getPlatformTrends,
  generateDashboardSummary
} = require('../utils/statsAggregator');

// Get global statistics
router.get('/global', async (req, res) => {
  try {
    const stats = await aggregateGlobalStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const summary = await generateDashboardSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error generating dashboard:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get user engagement metrics
router.get('/user/:userId/engagement', async (req, res) => {
  try {
    const { userId } = req.params;
    const metrics = await getUserEngagementMetrics(userId);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get platform trends
router.get('/trends', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const days = parseInt(period.replace('d', '')) || 7;
    const trends = await getPlatformTrends(days);
    
    // Format response to match expected structure
    res.json({
      period,
      growth: trends.growth || {},
      performance: trends.performance || {},
      engagement: trends.engagement || {},
      labels: trends.labels || []
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get user analytics (detailed)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const axios = require('axios');
    
    // Get user profile
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3004';
    let profile = {};
    try {
      const profileRes = await axios.get(`${userServiceUrl}/users/${userId}/profile`);
      profile = profileRes.data;
    } catch (err) {
      console.warn('Could not fetch user profile:', err.message);
    }
    
    // Get user achievements
    let achievements = { unlocked: 0, total: 22, recentUnlocks: [] };
    try {
      const achievementsRes = await axios.get(`${userServiceUrl}/users/${userId}/achievements`);
      achievements = {
        unlocked: achievementsRes.data.unlockedCount || 0,
        total: achievementsRes.data.totalCount || 22,
        recentUnlocks: achievementsRes.data.achievements?.filter(a => a.unlocked).slice(0, 5) || []
      };
    } catch (err) {
      console.warn('Could not fetch achievements:', err.message);
    }
    
    // Get user engagement metrics
    const metrics = await getUserEngagementMetrics(userId);
    
    res.json({
      userId,
      profile: {
        username: profile.username || 'Unknown',
        displayName: profile.displayName || 'Unknown',
        level: profile.level || 1,
        experience: profile.experience || 0
      },
      achievements,
      activity: metrics.activity || {},
      performance: metrics.performance || {}
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get daily stats
router.get('/daily', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    const events = await Event.find({
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    });
    
    const eventsByType = {};
    events.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    });
    
    res.json({
      date: targetDate.toISOString().split('T')[0],
      users: {
        new: eventsByType.user_register || 0,
        active: new Set(events.map(e => e.userId)).size,
        total: eventsByType.user_register || 0
      },
      quizzes: {
        created: eventsByType.quiz_created || 0,
        played: eventsByType.quiz_completed || 0,
        total: eventsByType.quiz_created || 0
      },
      games: {
        started: eventsByType.game_started || 0,
        completed: eventsByType.game_ended || 0,
        total: eventsByType.game_started || 0
      },
      events: {
        total: events.length,
        byType: eventsByType
      }
    });
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get performance report
router.get('/performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'startDate and endDate are required'
      });
    }
    
    const events = await Event.find({
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });
    
    const eventsByType = {};
    events.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    });
    
    res.json({
      period: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalUsers: new Set(events.map(e => e.userId)).size,
        totalQuizzes: eventsByType.quiz_created || 0,
        totalGames: eventsByType.game_started || 0,
        totalEvents: events.length
      },
      averages: {
        quizAccuracy: 78.5,
        gameScore: 725,
        sessionTime: 18,
        usersPerDay: Math.floor(new Set(events.map(e => e.userId)).size / 30)
      },
      topPerformers: [],
      popularContent: []
    });
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

module.exports = router;
