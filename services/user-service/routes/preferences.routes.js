const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const { authMiddleware } = require('../middleware/auth.middleware');
const { validatePreferences } = require('../middleware/validation.middleware');

// Get user preferences
router.get('/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found' 
      });
    }
    
    res.json({
      userId: profile.userId,
      preferences: profile.preferences
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Update user preferences
router.put('/:userId/preferences', authMiddleware, validatePreferences, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user owns this profile
    if (req.user.id !== userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only update your own preferences' 
      });
    }
    
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found' 
      });
    }
    
    // Update preferences (merge with existing)
    const allowedFields = ['theme', 'language', 'emailNotifications', 'pushNotifications', 'profileVisibility', 'showStats', 'allowFriendRequests'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        profile.preferences[field] = req.body[field];
      }
    });
    
    profile.updatedAt = Date.now();
    await profile.save();
    
    res.json({
      message: 'Preferences updated successfully',
      preferences: profile.preferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Update specific preference
router.patch('/:userId/preferences/:preference', authMiddleware, async (req, res) => {
  try {
    const { userId, preference } = req.params;
    const { value } = req.body;
    
    // Check if user owns this profile
    if (req.user.id !== userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only update your own preferences' 
      });
    }
    
    if (value === undefined) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'value is required' 
      });
    }
    
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found' 
      });
    }
    
    const allowedPreferences = ['theme', 'language', 'emailNotifications', 'pushNotifications', 'profileVisibility', 'showStats', 'allowFriendRequests'];
    
    if (!allowedPreferences.includes(preference)) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: `Invalid preference: ${preference}` 
      });
    }
    
    // Validate value based on preference type
    if (preference === 'theme' && !['light', 'dark', 'auto'].includes(value)) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'theme must be: light, dark, or auto' 
      });
    }
    
    if (preference === 'profileVisibility' && !['public', 'friends', 'private'].includes(value)) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'profileVisibility must be: public, friends, or private' 
      });
    }
    
    if (preference === 'language' && typeof value !== 'string') {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'language must be a string' 
      });
    }
    
    if (['emailNotifications', 'pushNotifications', 'showStats', 'allowFriendRequests'].includes(preference) && typeof value !== 'boolean') {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: `${preference} must be a boolean` 
      });
    }
    
    // Update preference
    profile.preferences[preference] = value;
    profile.updatedAt = Date.now();
    await profile.save();
    
    res.json({
      message: 'Preference updated successfully',
      preference,
      value
    });
  } catch (error) {
    console.error('Error updating preference:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

// Reset preferences to default
router.post('/:userId/preferences/reset', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user owns this profile
    if (req.user.id !== userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only reset your own preferences' 
      });
    }
    
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found' 
      });
    }
    
    // Reset to defaults
    profile.preferences = {
      theme: 'auto',
      language: 'en',
      emailNotifications: true,
      pushNotifications: true,
      profileVisibility: 'public',
      showStats: true,
      allowFriendRequests: true
    };
    
    profile.updatedAt = Date.now();
    await profile.save();
    
    res.json({
      message: 'Preferences reset to defaults',
      preferences: profile.preferences
    });
  } catch (error) {
    console.error('Error resetting preferences:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message 
    });
  }
});

module.exports = router;
