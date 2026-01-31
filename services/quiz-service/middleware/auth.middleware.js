const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader ? 'Present' : 'Missing');
    
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No token provided' 
      });
    }
    
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    console.log('JWT_SECRET configured:', JWT_SECRET ? 'Yes' : 'No');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified for user:', decoded.username);
    
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    console.log('Token verification failed:', error.message);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid token',
      details: error.message
    });
  }
};

// Optional auth - extracts user if token exists, but doesn't require it
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, JWT_SECRET);
      
      req.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      };
    }
    
    next();
  } catch (error) {
    // Invalid token, but continue without user
    next();
  }
};

module.exports = { authMiddleware, optionalAuth };
