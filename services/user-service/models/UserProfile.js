const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  // Reference to auth-service User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  
  // Profile Information
  displayName: {
    type: String,
    trim: true,
    default: function() { return this.username; }
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  avatarUrl: {
    type: String,
    default: null
  },
  coverImageUrl: {
    type: String,
    default: null
  },
  
  // Statistics
  stats: {
    // As Quiz Creator
    quizzesCreated: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    
    // As Host
    gamesHosted: {
      type: Number,
      default: 0
    },
    totalPlayersHosted: {
      type: Number,
      default: 0
    },
    avgPlayersPerGame: {
      type: Number,
      default: 0
    },
    
    // As Player
    gamesPlayed: {
      type: Number,
      default: 0
    },
    wins: {
      type: Number,
      default: 0
    },
    totalPoints: {
      type: Number,
      default: 0
    },
    avgPoints: {
      type: Number,
      default: 0
    },
    avgAccuracy: {
      type: Number,
      default: 0
    },
    
    // Engagement
    bestScore: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    
    // Topics
    favoriteTopics: [{
      type: String
    }]
  },
  
  // User Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'public'
      },
      showStats: {
        type: Boolean,
        default: true
      },
      showActivity: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Achievements
  achievements: [{
    achievementId: {
      type: String,
      required: true
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 100
    }
  }],
  
  // Recent Activity (cached for quick access)
  recentActivity: [{
    type: {
      type: String,
      enum: ['created_quiz', 'hosted_game', 'played_game', 'achievement_unlocked', 'won_game'],
      required: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Social Features (Optional)
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProfile'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProfile'
  }],
  
  // Metadata
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  level: {
    type: Number,
    default: 1
  },
  experience: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
userProfileSchema.index({ username: 'text', displayName: 'text' });
userProfileSchema.index({ 'stats.totalPoints': -1 }); // For leaderboard
userProfileSchema.index({ lastActiveAt: -1 });

// Virtual for follower/following counts
userProfileSchema.virtual('followerCount').get(function() {
  return this.followers.length;
});

userProfileSchema.virtual('followingCount').get(function() {
  return this.following.length;
});

// Method to add activity
userProfileSchema.methods.addActivity = function(type, data) {
  this.recentActivity.unshift({ type, data, timestamp: new Date() });
  
  // Keep only last 50 activities
  if (this.recentActivity.length > 50) {
    this.recentActivity = this.recentActivity.slice(0, 50);
  }
  
  return this.save();
};

// Method to unlock achievement
userProfileSchema.methods.unlockAchievement = function(achievementId) {
  const existing = this.achievements.find(a => a.achievementId === achievementId);
  
  if (!existing) {
    this.achievements.push({
      achievementId,
      unlockedAt: new Date(),
      progress: 100
    });
    
    // Add to activity
    this.addActivity('achievement_unlocked', { achievementId });
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to update stats
userProfileSchema.methods.updateStats = function(updates) {
  Object.keys(updates).forEach(key => {
    if (this.stats[key] !== undefined) {
      this.stats[key] = updates[key];
    }
  });
  
  return this.save();
};

// Method to calculate level from experience
userProfileSchema.methods.calculateLevel = function() {
  // Simple formula: level = floor(sqrt(experience / 100))
  this.level = Math.floor(Math.sqrt(this.experience / 100)) + 1;
  return this.level;
};

// Ensure virtuals are included in JSON
userProfileSchema.set('toJSON', { virtuals: true });
userProfileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('UserProfile', userProfileSchema);
