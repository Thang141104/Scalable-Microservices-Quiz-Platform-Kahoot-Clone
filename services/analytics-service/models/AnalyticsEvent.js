const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: [
      // User events
      'user_registered',
      'user_login',
      'profile_updated',
      'avatar_uploaded',
      
      // Quiz events
      'quiz_created',
      'quiz_updated',
      'quiz_deleted',
      'quiz_viewed',
      
      // Game events
      'game_created',
      'game_started',
      'game_ended',
      'game_joined',        // NEW: Player joined game
      'game_completed',     // NEW: Player completed game
      'player_joined',
      'player_left',
      'question_answered',
      
      // Achievement events
      'achievement_unlocked',
      'achievement_earned',  // NEW: Achievement earned
      
      // Social events
      'user_followed',
      'user_unfollowed',
      
      // Test/Other events
      'test_event'
    ],
    required: true
  },
  
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  relatedEntityType: {
    type: String,
    enum: ['user', 'quiz', 'game', 'achievement', null],
    default: null
  },
  
  relatedEntityId: {
    type: String,
    default: null
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes for efficient queries
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ userId: 1, timestamp: -1 });
analyticsEventSchema.index({ eventType: 1, userId: 1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
