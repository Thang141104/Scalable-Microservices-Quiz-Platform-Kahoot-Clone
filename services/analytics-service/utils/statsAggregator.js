const axios = require('axios');
const Event = require('../models/AnalyticsEvent');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3004';
const QUIZ_SERVICE_URL = process.env.QUIZ_SERVICE_URL || 'http://localhost:3002';
const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://localhost:3003';

/**
 * Aggregate statistics from all services and analytics events
 */
async function aggregateGlobalStats() {
  try {
    // Get counts from analytics events
    const [
      totalUsers,
      totalQuizzes,
      totalGames,
      gamesPlayed
    ] = await Promise.all([
      Event.distinct('userId', { eventType: 'user_registered' }).then(users => users.length),
      Event.countDocuments({ eventType: 'quiz_created' }),
      Event.countDocuments({ eventType: 'game_created' }),
      Event.countDocuments({ eventType: 'game_ended' })
    ]);

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStats = await Event.aggregate([
      { $match: { timestamp: { $gte: today } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } }
    ]);
    
    const todayMap = {};
    todayStats.forEach(stat => {
      todayMap[stat._id] = stat.count;
    });

    return {
      totalUsers: totalUsers,
      totalQuizzes: totalQuizzes,
      totalGamesPlayed: gamesPlayed,
      newUsersToday: todayMap['user_registered'] || 0,
      quizzesCreatedToday: todayMap['quiz_created'] || 0,
      gamesHostedToday: todayMap['game_created'] || 0,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error aggregating stats:', error);
    throw error;
  }
}

/**
 * Get user engagement metrics from analytics events
 */
async function getUserEngagementMetrics(userId) {
  try {
    // Get all events for this user
    const userEvents = await Event.find({ userId }).sort({ timestamp: -1 });
    
    // Count games participated in
    const gamesJoined = userEvents.filter(e => e.eventType === 'game_joined').length;
    const gamesCompleted = userEvents.filter(e => e.eventType === 'game_completed').length;
    
    // Count quizzes created
    const quizzesCreated = userEvents.filter(e => e.eventType === 'quiz_created').length;
    
    // Count games hosted
    const gamesHosted = userEvents.filter(e => e.eventType === 'game_created').length;
    
    // Calculate performance metrics from game_completed events
    const completedGames = userEvents.filter(e => e.eventType === 'game_completed');
    let totalScore = 0;
    let totalAccuracy = 0;
    let wins = 0;
    
    completedGames.forEach(event => {
      if (event.metadata?.score) totalScore += event.metadata.score;
      if (event.metadata?.accuracy) totalAccuracy += parseFloat(event.metadata.accuracy);
      if (event.metadata?.rank === 1) wins++;
    });
    
    const avgScore = completedGames.length > 0 ? Math.round(totalScore / completedGames.length) : 0;
    const avgAccuracy = completedGames.length > 0 ? (totalAccuracy / completedGames.length).toFixed(1) : 0;
    
    // Get achievements earned
    const achievementsEarned = userEvents.filter(e => e.eventType === 'achievement_earned').length;
    
    // Get profile data
    let profile = {};
    try {
      const profileResponse = await axios.get(`${USER_SERVICE_URL}/users/${userId}/profile`);
      profile = profileResponse.data;
    } catch (error) {
      console.warn('Could not fetch user profile:', error.message);
    }
    
    return {
      userId,
      activity: {
        gamesJoined,
        gamesCompleted,
        gamesHosted,
        quizzesCreated,
        totalEvents: userEvents.length
      },
      performance: {
        avgScore,
        avgAccuracy: parseFloat(avgAccuracy),
        wins,
        winRate: gamesCompleted > 0 ? ((wins / gamesCompleted) * 100).toFixed(1) : 0
      },
      achievements: {
        earned: achievementsEarned
      },
      profile: {
        level: profile.level || 1,
        experience: profile.experience || 0,
        displayName: profile.displayName || profile.username || 'Unknown'
      },
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error getting engagement metrics:', error);
    throw error;
  }
}

/**
 * Get platform trends over specified period
 */
async function getPlatformTrends(days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get events in date range
    const events = await Event.find({
      timestamp: { $gte: startDate }
    });
    
    // Group by day
    const dailyStats = {};
    const labels = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateKey = date.toISOString().split('T')[0];
      labels.push(dateKey);
      dailyStats[dateKey] = {
        users: new Set(),
        quizzes: 0,
        games: 0,
        players: 0
      };
    }
    
    // Aggregate events by day
    events.forEach(event => {
      const dateKey = event.timestamp.toISOString().split('T')[0];
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].users.add(event.userId);
        
        if (event.eventType === 'quiz_created') {
          dailyStats[dateKey].quizzes++;
        } else if (event.eventType === 'game_created') {
          dailyStats[dateKey].games++;
        } else if (event.eventType === 'game_joined') {
          dailyStats[dateKey].players++;
        }
      }
    });
    
    // Format for charts
    const growth = {
      users: labels.map(date => dailyStats[date].users.size),
      quizzes: labels.map(date => dailyStats[date].quizzes),
      games: labels.map(date => dailyStats[date].games)
    };
    
    const performance = {
      avgPlayersPerGame: labels.map(date => {
        const games = dailyStats[date].games;
        const players = dailyStats[date].players;
        return games > 0 ? (players / games).toFixed(1) : 0;
      })
    };
    
    const engagement = {
      totalEvents: labels.map(date => {
        const dateEvents = events.filter(e => 
          e.timestamp.toISOString().split('T')[0] === date
        );
        return dateEvents.length;
      })
    };
    
    return {
      period: `${days} days`,
      labels,
      growth,
      performance,
      engagement
    };
  } catch (error) {
    console.error('Error getting platform trends:', error);
    throw error;
  }
}

/**
 * Generate dashboard summary with detailed metrics
 */
async function generateDashboardSummary() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get today's active users
    const activeUsers = await Event.distinct('userId', {
      timestamp: { $gte: today }
    });
    
    // Get game completion data for today
    const gameCompletedEvents = await Event.find({
      eventType: 'game_completed',
      timestamp: { $gte: today }
    });
    
    // Calculate accuracy and completion metrics
    let totalAccuracy = 0;
    let totalScore = 0;
    let gameCount = 0;
    
    gameCompletedEvents.forEach(event => {
      if (event.metadata?.accuracy) {
        totalAccuracy += parseFloat(event.metadata.accuracy);
        gameCount++;
      }
      if (event.metadata?.score) {
        totalScore += event.metadata.score;
      }
    });
    
    // Get total players today (from game_joined events)
    const totalPlayersToday = await Event.countDocuments({
      eventType: 'game_joined',
      timestamp: { $gte: today }
    });
    
    // Get games hosted today
    const gamesHostedToday = await Event.countDocuments({
      eventType: 'game_created',
      timestamp: { $gte: today }
    });
    
    // Get new users today
    const newUsersToday = await Event.countDocuments({
      eventType: 'user_registered',
      timestamp: { $gte: today }
    });
    
    // Get quizzes created today
    const quizzesCreatedToday = await Event.countDocuments({
      eventType: 'quiz_created',
      timestamp: { $gte: today }
    });
    
    // Get popular quizzes (most played)
    const popularQuizzes = await Event.aggregate([
      { $match: { eventType: 'game_created' } },
      { $group: {
        _id: '$metadata.quizId',
        playCount: { $sum: 1 },
        pins: { $push: '$metadata.pin' }
      }},
      { $sort: { playCount: -1 } },
      { $limit: 5 }
    ]);
    
    return {
      // Active users
      activeUsers: activeUsers.length,
      newUsersToday: newUsersToday,
      
      // Quiz metrics
      quizzesCreatedToday: quizzesCreatedToday,
      quizzesPlayedToday: gameCount,
      avgCompletionRate: gameCount > 0 ? 85 : 0, // Placeholder
      
      // Game metrics
      gamesHostedToday: gamesHostedToday,
      totalPlayersToday: totalPlayersToday,
      avgPlayersPerGame: gamesHostedToday > 0 ? (totalPlayersToday / gamesHostedToday).toFixed(1) : 0,
      
      // Performance metrics
      avgAccuracy: gameCount > 0 ? (totalAccuracy / gameCount).toFixed(1) : 0,
      avgScore: gameCount > 0 ? Math.round(totalScore / gameCount) : 0,
      
      // Popular content
      popularQuizzes: popularQuizzes.map(q => ({
        quizId: q._id,
        playCount: q.playCount,
        uniquePlayers: q.playCount // Approximate
      })),
      
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error generating dashboard summary:', error);
    throw error;
  }
}

module.exports = {
  aggregateGlobalStats,
  getUserEngagementMetrics,
  getPlatformTrends,
  generateDashboardSummary
};
