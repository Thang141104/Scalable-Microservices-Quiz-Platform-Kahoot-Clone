const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const { authMiddleware } = require('../middleware/auth.middleware');
const { recalculateUserStats } = require('../utils/statsCalculator');

// Get user statistics
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found',
        message: 'User profile does not exist' 
      });
    }
    
    res.json({
      userId: profile.userId,
      username: profile.username,
      displayName: profile.displayName,
      stats: profile.stats,
      level: profile.level,
      experience: profile.experience
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Get user activity history
router.get('/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found' 
      });
    }
    
    // Return recent activity with limit
    const activities = profile.recentActivity.slice(0, parseInt(limit));
    
    res.json({
      userId: profile.userId,
      username: profile.username,
      activities
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Recalculate user statistics (admin/sync endpoint)
router.post('/:userId/stats/recalculate', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user owns this profile or is admin
    if (req.user.id !== userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only recalculate your own stats' 
      });
    }
    
    const stats = await recalculateUserStats(userId);
    
    res.json({
      message: 'Statistics recalculated successfully',
      stats
    });
  } catch (error) {
    console.error('Error recalculating stats:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Sync user statistics (alias for recalculate)
router.post('/:userId/stats/sync', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user owns this profile or is admin
    if (req.user.id !== userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only sync your own stats' 
      });
    }
    
    const stats = await recalculateUserStats(userId);
    
    res.json({
      message: 'Stats synced successfully',
      stats
    });
  } catch (error) {
    console.error('Error syncing stats:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Update specific stats (for internal use by other services)
router.patch('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found' 
      });
    }
    
    // Update stats
    await profile.updateStats(updates);
    
    res.json({
      message: 'Stats updated successfully',
      stats: profile.stats
    });
  } catch (error) {
    console.error('Error updating stats:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Add activity to user timeline
router.post('/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, data } = req.body;
    
    if (!type) {
      return res.status(400).json({ 
        error: 'Activity type is required' 
      });
    }
    
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found' 
      });
    }
    
    await profile.addActivity(type, data);
    
    res.json({
      message: 'Activity added successfully'
    });
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

module.exports = router;
