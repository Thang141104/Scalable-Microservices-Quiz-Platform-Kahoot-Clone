const Achievement = require('../models/Achievement');
const UserProfile = require('../models/UserProfile');

/**
 * Check and unlock achievements for a user based on their stats
 * @param {String} userId - User ID to check achievements for
 * @returns {Promise<Array>} - Array of newly unlocked achievements
 */
const checkAchievements = async (userId) => {
  try {
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      console.log(` Profile not found for userId: ${userId}`);
      return [];
    }
    
    console.log(` Checking achievements for ${profile.username} (${userId})`);
    console.log(` Current stats:`, profile.stats);
    
    // Get all achievements
    const allAchievements = await Achievement.find();
    console.log(` Total achievements in DB: ${allAchievements.length}`);
    
    // Get already unlocked achievement IDs
    const unlockedIds = profile.achievements.map(a => a.achievementId);
    console.log(` Already unlocked (${unlockedIds.length}):`, unlockedIds);
    
    // Check each achievement
    const newlyUnlocked = [];
    let totalPoints = 0;
    
    for (const achievement of allAchievements) {
      // Skip if already unlocked
      if (unlockedIds.includes(achievement.id)) {
        console.log(`  Skipping ${achievement.id} - already unlocked`);
        continue;
      }
      
      // Check if criteria is met
      const isMet = checkAchievementCriteria(achievement, profile.stats);
      const currentValue = getCurrentValue(achievement.criteria.type, profile.stats);
      
      console.log(` Checking ${achievement.id} (${achievement.name})`);
      console.log(`   Type: ${achievement.criteria.type}, Threshold: ${achievement.criteria.threshold}, Current: ${currentValue}, Met: ${isMet}`);
      
      if (isMet) {
        console.log(` Unlocking ${achievement.id}...`);
        
        // Add to achievements array (don't save yet)
        profile.achievements.push({
          achievementId: achievement.id,
          unlockedAt: new Date(),
          progress: 100
        });
        
        // Add activity manually (don't call addActivity() which saves)
        profile.recentActivity.unshift({
          type: 'achievement_unlocked',
          data: { achievementId: achievement.id },
          timestamp: new Date()
        });
        
        // Keep only last 50 activities
        if (profile.recentActivity.length > 50) {
          profile.recentActivity = profile.recentActivity.slice(0, 50);
        }
        
        newlyUnlocked.push(achievement);
        totalPoints += achievement.points;
        
        console.log(` Achievement unlocked for ${profile.username}: ${achievement.name}`);
      }
    }
    
    // Save once if any achievements were unlocked
    if (newlyUnlocked.length > 0) {
      profile.experience += totalPoints;
      profile.calculateLevel();
      await profile.save();
      console.log(` Saved ${newlyUnlocked.length} achievements and ${totalPoints} XP`);
    }
    
    console.log(` Total newly unlocked: ${newlyUnlocked.length}`);
    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
};

/**
 * Check if achievement criteria is met
 * @param {Object} achievement - Achievement document
 * @param {Object} stats - User stats object
 * @returns {Boolean}
 */
const checkAchievementCriteria = (achievement, stats) => {
  const { type, threshold } = achievement.criteria;
  
  switch (type) {
    case 'quizzes_created':
      return stats.quizzesCreated >= threshold;
    
    case 'games_hosted':
      return stats.gamesHosted >= threshold;
    
    case 'games_won':
      return stats.wins >= threshold;
    
    case 'games_played':
      return stats.gamesPlayed >= threshold;
    
    case 'points_earned':
      return stats.totalPoints >= threshold;
    
    case 'streak':
      return stats.longestStreak >= threshold;
    
    case 'players_hosted':
      return stats.totalPlayersHosted >= threshold;
    
    default:
      return false;
  }
};

/**
 * Get achievement progress for a user
 * @param {String} userId - User ID
 * @returns {Promise<Array>} - Array of achievements with progress
 */
const getAchievementProgress = async (userId) => {
  try {
    const profile = await UserProfile.findOne({ userId });
    if (!profile) return [];
    
    const allAchievements = await Achievement.find().sort({ category: 1, order: 1 });
    
    const unlockedMap = {};
    profile.achievements.forEach(a => {
      unlockedMap[a.achievementId] = a;
    });
    
    return allAchievements.map(achievement => {
      const unlocked = unlockedMap[achievement.id];
      const current = getCurrentValue(achievement.criteria.type, profile.stats);
      const threshold = achievement.criteria.threshold;
      const progress = Math.min(100, Math.floor((current / threshold) * 100));
      
      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        rarity: achievement.rarity,
        points: achievement.points,
        unlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt,
        progress, // Percentage: 0-100
        threshold, // Target value (e.g., 1, 10, 100)
        current // Current value (e.g., 1, 5, 100)
      };
    });
  } catch (error) {
    console.error('Error getting achievement progress:', error);
    return [];
  }
};

/**
 * Calculate progress percentage for an achievement
 */
const calculateProgress = (achievement, stats) => {
  const current = getCurrentValue(achievement.criteria.type, stats);
  const threshold = achievement.criteria.threshold;
  
  return Math.min(100, Math.floor((current / threshold) * 100));
};

/**
 * Get current value for achievement type
 */
const getCurrentValue = (type, stats) => {
  switch (type) {
    case 'quizzes_created': return stats.quizzesCreated;
    case 'games_hosted': return stats.gamesHosted;
    case 'games_won': return stats.wins;
    case 'games_played': return stats.gamesPlayed;
    case 'points_earned': return stats.totalPoints;
    case 'streak': return stats.longestStreak;
    case 'players_hosted': return stats.totalPlayersHosted;
    default: return 0;
  }
};

module.exports = {
  checkAchievements,
  checkAchievementCriteria,
  getAchievementProgress
};
