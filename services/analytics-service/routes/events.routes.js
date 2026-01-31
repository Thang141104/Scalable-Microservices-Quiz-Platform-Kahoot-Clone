const express = require('express');
const router = express.Router();
const Event = require('../models/AnalyticsEvent');
const {
  trackEvent,
  getEventsByType,
  getEventsByUser,
  getEventsByDateRange,
  getEventCountByType,
  getAggregatedEvents,
  getPopularQuizzes,
  getActiveUsersCount
} = require('../utils/eventTracker');

// Track a new event
router.post('/', async (req, res) => {
  try {
    const { eventType, userId, relatedEntityType, relatedEntityId, metadata } = req.body;
    
    if (!eventType || !userId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'eventType and userId are required'
      });
    }
    
    const eventData = {
      eventType,
      userId,
      relatedEntityType,
      relatedEntityId,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    };
    
    const event = await trackEvent(eventData);
    
    res.status(201).json({
      success: true,
      message: 'Event tracked successfully',
      eventId: event._id
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get all events with filters (supports userId query param)
router.get('/', async (req, res) => {
  try {
    const { userId, eventType, limit = 100 } = req.query;
    
    let events;
    if (userId) {
      events = await getEventsByUser(userId, parseInt(limit));
    } else if (eventType) {
      events = await getEventsByType(eventType, parseInt(limit));
    } else {
      // Get all events with limit
      events = await Event.find()
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .lean();
    }
    
    res.json({
      events,
      total: events.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get event summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await Event.aggregate([
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const summaryObj = {};
    let totalEvents = 0;
    
    summary.forEach(item => {
      summaryObj[item._id] = item.count;
      totalEvents += item.count;
    });
    
    res.json({
      summary: summaryObj,
      totalEvents
    });
  } catch (error) {
    console.error('Error getting event summary:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get events by type
router.get('/type/:eventType', async (req, res) => {
  try {
    const { eventType } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const events = await getEventsByType(eventType, limit);
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get events by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const events = await getEventsByUser(userId, limit);
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get events by date range
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate, eventType } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'startDate and endDate are required'
      });
    }
    
    const events = await getEventsByDateRange(startDate, endDate, eventType);
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching events by range:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get event count by type
router.get('/count/:eventType', async (req, res) => {
  try {
    const { eventType } = req.params;
    const { startDate, endDate } = req.query;
    
    const count = await getEventCountByType(eventType, startDate, endDate);
    
    res.json({ eventType, count });
  } catch (error) {
    console.error('Error counting events:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get aggregated events
router.get('/aggregated', async (req, res) => {
  try {
    const { groupBy = 'day', eventType, days = 30 } = req.query;
    
    const aggregation = await getAggregatedEvents(groupBy, eventType, parseInt(days));
    
    res.json(aggregation);
  } catch (error) {
    console.error('Error aggregating events:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get popular quizzes
router.get('/popular/quizzes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 30;
    
    const popularQuizzes = await getPopularQuizzes(limit, days);
    
    res.json(popularQuizzes);
  } catch (error) {
    console.error('Error fetching popular quizzes:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get active users count
router.get('/users/active', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    
    const activeCount = await getActiveUsersCount(days);
    
    res.json({
      period: `${days} days`,
      activeUsers: activeCount
    });
  } catch (error) {
    console.error('Error counting active users:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

module.exports = router;
