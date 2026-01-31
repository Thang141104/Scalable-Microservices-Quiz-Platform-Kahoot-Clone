const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const Achievement = require('../models/Achievement');
const { authMiddleware } = require('../middleware/auth.middleware');
const { checkAchievements, getAchievementProgress } = require('../utils/achievements');

// Get all achievements with user progress
router.get('/:userId/achievements', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found' 
      });
    }
    
    // Get all achievements with progress
    const achievementsWithProgress = await getAchievementProgress(userId);
    
    res.json({
      userId: profile.userId,
      username: profile.username,
      achievements: achievementsWithProgress,
      unlockedCount: profile.achievements.length,
      totalCount: achievementsWithProgress.length
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Get unlocked achievements only
router.get('/:userId/achievements/unlocked', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found' 
      });
    }
    
    // Get full achievement details
    const achievementIds = profile.achievements.map(a => a.achievementId);
    const achievements = await Achievement.find({ id: { $in: achievementIds } });
    
    // Merge with unlock data
    const unlockedAchievements = profile.achievements.map(unlocked => {
      const achievement = achievements.find(a => a.id === unlocked.achievementId);
      return {
        ...achievement?.toObject(),
        unlockedAt: unlocked.unlockedAt,
        progress: unlocked.progress
      };
    }).filter(a => a.id); // Filter out any not found
    
    res.json({
      userId: profile.userId,
      achievements: unlockedAchievements,
      count: unlockedAchievements.length
    });
  } catch (error) {
    console.error('Error fetching unlocked achievements:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Manually unlock achievement (admin/debug)
router.post('/:userId/achievements/:achievementId', authMiddleware, async (req, res) => {
  try {
    const { userId, achievementId } = req.params;
    
    // Check if user owns this profile
    if (req.user.id !== userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only unlock achievements for yourself' 
      });
    }
    
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found' 
      });
    }
    
    // Check if achievement exists
    const achievement = await Achievement.findOne({ id: achievementId });
    
    if (!achievement) {
      return res.status(404).json({ 
        error: 'Achievement not found' 
      });
    }
    
    // Check if already unlocked
    const alreadyUnlocked = profile.achievements.some(a => a.achievementId === achievementId);
    
    if (alreadyUnlocked) {
      return res.status(400).json({ 
        error: 'Achievement already unlocked' 
      });
    }
    
    // Unlock achievement
    await profile.unlockAchievement(achievementId);
    
    // Award experience
    profile.experience += achievement.points;
    profile.calculateLevel();
    await profile.save();
    
    res.json({
      message: 'Achievement unlocked successfully',
      achievement: {
        id: achievement.id,
        name: achievement.name,
        points: achievement.points
      },
      newLevel: profile.level,
      newExperience: profile.experience
    });
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Check for new achievements (called after stat updates)
router.post('/:userId/achievements/check', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const newlyUnlocked = await checkAchievements(userId);
    
    res.json({
      message: 'Achievements checked',
      newlyUnlocked: newlyUnlocked.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        points: a.points
      })),
      count: newlyUnlocked.length
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Get all available achievements (catalog)
router.get('/achievements/catalog', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = {};
    if (category) {
      query.category = category;
    }
    
    const achievements = await Achievement.find(query).sort({ category: 1, order: 1 });
    
    res.json({
      achievements,
      count: achievements.length
    });
  } catch (error) {
    console.error('Error fetching achievement catalog:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Force check and unlock achievements for a user
router.post('/:userId/check', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(` Force checking achievements for user ${userId}`);
    
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found',
        message: 'User profile does not exist' 
      });
    }
    
    // Check and unlock achievements
    const newAchievements = await checkAchievements(userId);
    
    if (newAchievements.length > 0) {
      console.log(` Unlocked ${newAchievements.length} achievements for ${userId}`);
      return res.json({
        success: true,
        message: `Unlocked ${newAchievements.length} achievements`,
        achievements: newAchievements.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          points: a.points
        })),
        currentStats: profile.stats
      });
    } else {
      return res.json({
        success: true,
        message: 'No new achievements unlocked',
        currentStats: profile.stats,
        currentAchievements: profile.achievements.length
      });
    }
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

module.exports = router;
