const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3004';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005';

/**
 * Track event to both Analytics and update User stats
 * @param {Object} eventData - Event data to track
 * @returns {Promise<void>}
 */
async function trackEventAndUpdateStats(eventData) {
  const { eventType, userId, relatedEntityType, relatedEntityId, metadata } = eventData;
  
  try {
    // 1. Track to Analytics Service
    await axios.post(`${ANALYTICS_SERVICE_URL}/events`, {
      eventType,
      userId,
      relatedEntityType,
      relatedEntityId,
      metadata
    });
    console.log(`Analytics: Tracked ${eventType} for user ${userId}`);
    
    // 2. Update User stats via webhook
    await axios.post(`${USER_SERVICE_URL}/webhook/update-stats`, {
      userId,
      eventType,
      metadata
    });
    console.log(`Stats: Updated for user ${userId}`);
    
  } catch (error) {
    console.error(`Failed to track event ${eventType}:`, error.message);
    // Don't throw - allow game to continue even if tracking fails
  }
}

module.exports = {
  trackEventAndUpdateStats
};
