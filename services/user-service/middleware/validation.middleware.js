// Validation middleware for user profile updates

const validateProfileUpdate = (req, res, next) => {
  const { displayName, bio, settings } = req.body;
  const errors = [];
  
  // Display name validation
  if (displayName !== undefined) {
    if (typeof displayName !== 'string') {
      errors.push('Display name must be a string');
    } else if (displayName.trim().length < 2) {
      errors.push('Display name must be at least 2 characters');
    } else if (displayName.trim().length > 50) {
      errors.push('Display name must be less than 50 characters');
    }
  }
  
  // Bio validation
  if (bio !== undefined) {
    if (typeof bio !== 'string') {
      errors.push('Bio must be a string');
    } else if (bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }
  }
  
  // Settings validation (optional, flexible)
  if (settings !== undefined && typeof settings !== 'object') {
    errors.push('Settings must be an object');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      errors
    });
  }
  
  next();
};

const validatePreferences = (req, res, next) => {
  const { theme, language, notifications, privacy } = req.body;
  const errors = [];
  
  // Theme validation
  if (theme !== undefined) {
    const validThemes = ['light', 'dark', 'auto'];
    if (typeof theme !== 'string' || !validThemes.includes(theme)) {
      errors.push(`Theme must be one of: ${validThemes.join(', ')}`);
    }
  }
  
  // Language validation (optional)
  if (language !== undefined && typeof language !== 'string') {
    errors.push('Language must be a string');
  }
  
  // Notifications validation (flexible object)
  if (notifications !== undefined && typeof notifications !== 'object') {
    errors.push('Notifications must be an object');
  }
  
  // Privacy validation (flexible object)
  if (privacy !== undefined) {
    if (typeof privacy !== 'object') {
      errors.push('Privacy must be an object');
    } else if (privacy.profileVisibility !== undefined) {
      const validVisibility = ['public', 'friends', 'private'];
      if (!validVisibility.includes(privacy.profileVisibility)) {
        errors.push(`Profile visibility must be one of: ${validVisibility.join(', ')}`);
      }
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      errors
    });
  }
  
  next();
};

module.exports = {
  validateProfileUpdate,
  validatePreferences
};
