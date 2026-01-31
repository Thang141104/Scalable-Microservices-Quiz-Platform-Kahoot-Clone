const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  pin: {
    type: String,
    required: true,
    unique: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  players: [{
    id: { type: mongoose.Schema.Types.Mixed, required: true }, // Can be number or string
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Real user ID if authenticated
    isAuthenticated: { type: Boolean, default: false }, // Flag for authenticated users
    nickname: String,
    avatar: String,
    score: { type: Number, default: 0 },
    answers: [{
      questionId: Number,
      answer: mongoose.Schema.Types.Mixed,
      isCorrect: Boolean,
      points: Number,
      timeSpent: Number
    }],
    joinedAt: Date
  }],
  status: {
    type: String,
    enum: ['waiting', 'active', 'finished', 'ended'],
    default: 'waiting'
  },
  startedAt: Date,
  finishedAt: Date,
  endedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('GameSession', gameSessionSchema);
