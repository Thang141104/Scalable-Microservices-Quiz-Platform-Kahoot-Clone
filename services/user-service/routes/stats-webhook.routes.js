const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const { checkAchievements } = require('../utils/achievements');

/**
 * Manual trigger to check achievements for a user
 * Use this to force achievement check without updating stats
 */
router.post('/check-achievements/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(` Manually checking achievements for user ${userId}`);
    
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found',
        message: 'User profile does not exist' 
      });
    }
    
    // Check achievements
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
          icon: a.icon
        }))
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

/**
 * Update user stats from analytics events
 * This endpoint is called by Analytics Service or Game Service
 * when events occur that should update user stats
 */
router.post('/update-stats', async (req, res) => {
  try {
    const { userId, eventType, metadata } = req.body;
    
    if (!userId || !eventType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'userId and eventType are required' 
      });
    }
    
    console.log(` Updating stats for user ${userId}, event: ${eventType}`);
    
    // Get or create profile
    let profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      console.log(`Profile not found for ${userId}, skipping stats update`);
      return res.status(404).json({ 
        error: 'Profile not found',
        message: 'User profile does not exist' 
      });
    }
    
    // Update stats based on event type
    let statsUpdated = false;
    
    switch (eventType) {
      case 'quiz_created':
        profile.stats.quizzesCreated += 1;
        if (metadata?.questionCount) {
          profile.stats.totalQuestions += metadata.questionCount;
        }
        statsUpdated = true;
        break;
        
      case 'game_created':
        profile.stats.gamesHosted += 1;
        statsUpdated = true;
        break;
        
      case 'game_ended':
        // Update host stats when game ends
        if (metadata?.totalPlayers) {
          profile.stats.totalPlayersHosted += metadata.totalPlayers;
          profile.stats.avgPlayersPerGame = 
            profile.stats.totalPlayersHosted / profile.stats.gamesHosted;
        }
        statsUpdated = true;
        break;
        
      case 'game_completed':
        // Update player stats when they complete a game
        profile.stats.gamesPlayed += 1;
        
        if (metadata?.score) {
          profile.stats.totalPoints += metadata.score;
        }
        
        // Check if player won (rank 1 or won flag)
        if (metadata?.rank === 1 || metadata?.won === true) {
          profile.stats.wins += 1;
          console.log(` Player won! Total wins: ${profile.stats.wins}`);
        }
        
        if (metadata?.accuracy) {
          // Update average accuracy
          const currentTotal = profile.stats.avgAccuracy * (profile.stats.gamesPlayed - 1);
          const newAccuracy = parseFloat(metadata.accuracy);
          profile.stats.avgAccuracy = (currentTotal + newAccuracy) / profile.stats.gamesPlayed;
        }
        
        statsUpdated = true;
        break;
        
      default:
        console.log(`Event type ${eventType} does not affect stats`);
    }
    
    if (statsUpdated) {
      profile.lastActiveAt = new Date();
      await profile.save();
      console.log(` Stats updated for user ${userId}`);
      
      // Check for newly unlocked achievements
      const newAchievements = await checkAchievements(userId);
      
      if (newAchievements.length > 0) {
        console.log(` Unlocked ${newAchievements.length} new achievements for ${userId}`);
        return res.json({
          success: true,
          message: 'Stats updated and achievements unlocked',
          stats: profile.stats,
          newAchievements: newAchievements.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            icon: a.icon,
            points: a.points
          }))
        });
      }
      
      res.json({
        success: true,
        message: 'Stats updated successfully',
        stats: profile.stats
      });
    } else {
      res.json({
        success: true,
        message: 'No stats updated for this event type'
      });
    }
    
  } catch (error) {
    console.error('Error updating stats:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

module.exports = router;
