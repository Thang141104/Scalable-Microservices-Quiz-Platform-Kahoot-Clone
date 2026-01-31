const AnalyticsEvent = require('../models/AnalyticsEvent');

/**
 * Track an analytics event
 */
async function trackEvent(eventData) {
  try {
    const event = new AnalyticsEvent(eventData);
    await event.save();
    console.log(`Event tracked: ${eventData.eventType}`);
    return event;
  } catch (error) {
    console.error('Error tracking event:', error);
    throw error;
  }
}

/**
 * Get events by type
 */
async function getEventsByType(eventType, limit = 100) {
  try {
    const events = await AnalyticsEvent
      .find({ eventType })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

/**
 * Get events by user
 */
async function getEventsByUser(userId, limit = 100) {
  try {
    const events = await AnalyticsEvent
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    return events;
  } catch (error) {
    console.error('Error fetching user events:', error);
    throw error;
  }
}

/**
 * Get events in date range
 */
async function getEventsByDateRange(startDate, endDate, eventType = null) {
  try {
    const query = {
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (eventType) {
      query.eventType = eventType;
    }
    
    const events = await AnalyticsEvent
      .find(query)
      .sort({ timestamp: -1 });
    
    return events;
  } catch (error) {
    console.error('Error fetching events by date:', error);
    throw error;
  }
}

/**
 * Get event count by type
 */
async function getEventCountByType(eventType, startDate = null, endDate = null) {
  try {
    const query = { eventType };
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const count = await AnalyticsEvent.countDocuments(query);
    return count;
  } catch (error) {
    console.error('Error counting events:', error);
    throw error;
  }
}

/**
 * Get aggregated events by hour/day/month
 */
async function getAggregatedEvents(groupBy = 'day', eventType = null, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00';
        break;
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }
    
    const matchQuery = {
      timestamp: { $gte: startDate }
    };
    
    if (eventType) {
      matchQuery.eventType = eventType;
    }
    
    const aggregation = await AnalyticsEvent.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: '$timestamp' } },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    return aggregation;
  } catch (error) {
    console.error('Error aggregating events:', error);
    throw error;
  }
}

/**
 * Get popular quizzes
 */
async function getPopularQuizzes(limit = 10, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const popularQuizzes = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: { $in: ['quiz_viewed', 'game_created'] },
          relatedEntityType: 'quiz',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$relatedEntityId',
          views: { $sum: 1 }
        }
      },
      { $sort: { views: -1 } },
      { $limit: limit }
    ]);
    
    return popularQuizzes;
  } catch (error) {
    console.error('Error fetching popular quizzes:', error);
    throw error;
  }
}

/**
 * Get active users count
 */
async function getActiveUsersCount(days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const activeUsers = await AnalyticsEvent.distinct('userId', {
      timestamp: { $gte: startDate }
    });
    
    return activeUsers.length;
  } catch (error) {
    console.error('Error counting active users:', error);
    throw error;
  }
}

module.exports = {
  trackEvent,
  getEventsByType,
  getEventsByUser,
  getEventsByDateRange,
  getEventCountByType,
  getAggregatedEvents,
  getPopularQuizzes,
  getActiveUsersCount
};
