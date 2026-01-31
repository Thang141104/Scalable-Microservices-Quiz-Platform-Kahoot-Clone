const axios = require('axios');

/**
 * Calculate user statistics from various services
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Calculated statistics
 */
const calculateUserStats = async (userId) => {
  try {
    const stats = {
      quizzesCreated: 0,
      totalQuestions: 0,
      gamesHosted: 0,
      totalPlayersHosted: 0,
      avgPlayersPerGame: 0,
      gamesPlayed: 0,
      wins: 0,
      totalPoints: 0,
      avgPoints: 0,
      avgAccuracy: 0,
      bestScore: 0
    };
    
    // Fetch quizzes from quiz-service
    try {
      const quizResponse = await axios.get(
        `${process.env.QUIZ_SERVICE_URL}/quizzes?createdBy=${userId}`,
        { timeout: 5000 }
      );
      
      if (quizResponse.data && Array.isArray(quizResponse.data)) {
        stats.quizzesCreated = quizResponse.data.length;
        stats.totalQuestions = quizResponse.data.reduce((sum, quiz) => {
          return sum + (quiz.questions?.length || 0);
        }, 0);
      }
    } catch (error) {
      console.warn('Could not fetch quiz stats:', error.message);
    }
    
    // Fetch games from game-service
    try {
      const gamesResponse = await axios.get(
        `${process.env.GAME_SERVICE_URL}/games?hostId=${userId}`,
        { timeout: 5000 }
      );
      
      if (gamesResponse.data && Array.isArray(gamesResponse.data)) {
        stats.gamesHosted = gamesResponse.data.length;
        stats.totalPlayersHosted = gamesResponse.data.reduce((sum, game) => {
          return sum + (game.players?.length || 0);
        }, 0);
        stats.avgPlayersPerGame = stats.gamesHosted > 0 
          ? Math.round(stats.totalPlayersHosted / stats.gamesHosted) 
          : 0;
      }
    } catch (error) {
      console.warn('Could not fetch game stats:', error.message);
    }
    
    // TODO: Fetch player stats (games played, wins, points) when game tracking is implemented
    // For now, keep existing stats if available
    
    return stats;
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return null;
  }
};

/**
 * Update user stats from external services
 * @param {Object} profile - UserProfile document
 * @returns {Promise<Object>} - Updated profile
 */
const syncUserStats = async (profile) => {
  // IMPORTANT: Just return profile as-is
  // Stats are updated through webhook/update-stats endpoint when events occur
  // This "sync" just refreshes the data without recalculating
  
  console.log(` Stats sync requested for user ${profile.username || profile.userId}`);
  console.log(` Current stats preserved (stats updated via events only)`);
  
  return profile;
};

/**
 * Recalculate and update all user statistics
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Updated stats object
 */
const recalculateUserStats = async (userId) => {
  try {
    console.log(` Recalculate stats called for userId: ${userId}`);
    
    const UserProfile = require('../models/UserProfile');
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      console.error(` Profile not found for userId: ${userId}`);
      throw new Error('User profile not found');
    }
    
    console.log(` Profile found for user: ${profile.username}`);
    
    // Sync (which now just returns profile as-is)
    const updatedProfile = await syncUserStats(profile);
    
    console.log(` Stats recalculation complete for user: ${profile.username}`);
    
    return updatedProfile.stats;
  } catch (error) {
    console.error(' Error recalculating user stats:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
};

module.exports = {
  calculateUserStats,
  syncUserStats,
  recalculateUserStats
};
