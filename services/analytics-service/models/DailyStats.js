const mongoose = require('mongoose');

const dailyStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // User stats
  newUsers: {
    type: Number,
    default: 0
  },
  activeUsers: {
    type: Number,
    default: 0
  },
  totalUsers: {
    type: Number,
    default: 0
  },
  
  // Quiz stats
  quizzesCreated: {
    type: Number,
    default: 0
  },
  totalQuizzes: {
    type: Number,
    default: 0
  },
  
  // Game stats
  gamesPlayed: {
    type: Number,
    default: 0
  },
  totalGames: {
    type: Number,
    default: 0
  },
  totalPlayers: {
    type: Number,
    default: 0
  },
  avgPlayersPerGame: {
    type: Number,
    default: 0
  },
  
  // Achievement stats
  achievementsUnlocked: {
    type: Number,
    default: 0
  },
  
  // Engagement metrics
  avgSessionDuration: {
    type: Number,
    default: 0
  },
  totalQuestionsAnswered: {
    type: Number,
    default: 0
  },
  avgAccuracy: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for date queries
dailyStatsSchema.index({ date: -1 });

module.exports = mongoose.model('DailyStats', dailyStatsSchema);
