const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Single Choice', 'Multiple Choice', 'True/False'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  timeLimit: {
    type: Number,
    default: 20
  },
  points: {
    type: Number,
    default: 1000
  },
  options: [{
    type: String,
    required: true
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed, // Can be Number or Array of Numbers
    required: true
  },
  media: {
    type: String,
    default: null
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: null
  },
  visibility: {
    type: String,
    enum: ['Public', 'Private'],
    default: 'Public'
  },
  language: {
    type: String,
    default: 'English'
  },
  questions: [questionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // Back to required - now using real user ID
  },
  stats: {
    totalPlays: { type: Number, default: 0 },
    avgAccuracy: { type: Number, default: 0 }
  },
  starred: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Quiz', quizSchema);
