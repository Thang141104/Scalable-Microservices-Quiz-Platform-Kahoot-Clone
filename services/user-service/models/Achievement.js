const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🏆'
  },
  category: {
    type: String,
    enum: ['quiz_creator', 'game_host', 'player', 'special', 'social'],
    required: true
  },
  criteria: {
    type: {
      type: String,
      enum: [
        'quizzes_created',
        'games_hosted',
        'games_won',
        'games_played',
        'points_earned',
        'perfect_score',
        'streak',
        'players_hosted'
      ],
      required: true
    },
    threshold: {
      type: Number,
      required: true
    }
  },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  points: {
    type: Number,
    default: 100
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for category queries
achievementSchema.index({ category: 1, order: 1 });

module.exports = mongoose.model('Achievement', achievementSchema);
