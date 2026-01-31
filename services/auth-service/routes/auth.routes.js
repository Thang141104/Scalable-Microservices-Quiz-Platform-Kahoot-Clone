/**
 * Updated Auth Routes with Production Standards
 * Includes validation, error handling, and logging
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/email');

// Simple error handler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Simple validation middleware
const validateRegistration = (req, res, next) => {
  const { username, email, password } = req.body;
  
  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  next();
};

// Simple logger
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()}: ${msg}`)
};

// Custom error classes
class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 401;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user and send OTP email
 * @access  Public
 */
router.post('/register', validateRegistration, asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [{ email: email.toLowerCase() }, { username }] 
  }).lean();

  if (existingUser) {
    if (existingUser.email === email.toLowerCase()) {
      throw new ConflictError('Email already registered');
    }
    if (existingUser.username === username) {
      throw new ConflictError('Username already taken');
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user (not verified yet)
  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password: hashedPassword,
    isVerified: false
  });

  // Generate and send OTP
  const otp = user.generateOTP();
  await user.save();

  try {
    await sendOTPEmail(user.email, otp, user.username);
    logger.info('OTP sent to user email', { userId: user._id, email: user.email });
  } catch (error) {
    logger.error('Failed to send OTP email', { error: error.message, userId: user._id });
    // Delete user if email fails
    await User.deleteOne({ _id: user._id });
    throw new Error('Failed to send verification email. Please try again.');
  }

  logger.info('User registered successfully, awaiting verification', {
    userId: user._id,
    username: user.username,
    email: user.email
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful! Please check your email for verification code.',
    userId: user._id,
    email: user.email,
    requiresVerification: true
  });
}));

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP code
 * @access  Public
 */
router.post('/verify-otp', asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ValidationError('Email and OTP are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ValidationError('User not found');
  }

  if (user.isVerified) {
    throw new ValidationError('Email already verified');
  }

  // Verify OTP
  if (!user.verifyOTP(otp)) {
    logger.warn('Invalid or expired OTP', { userId: user._id, email: user.email });
    throw new ValidationError('Invalid or expired OTP code');
  }

  // Mark user as verified
  user.isVerified = true;
  user.otp = undefined; // Clear OTP
  await user.save();

  // Send welcome email
  try {
    await sendWelcomeEmail(user.email, user.username);
  } catch (error) {
    logger.error('Failed to send welcome email', { error: error.message });
  }

  // Generate JWT
  const token = jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  logger.info('User verified successfully', { userId: user._id, email: user.email });

  res.json({
    success: true,
    message: 'Email verified successfully!',
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      isVerified: user.isVerified
    }
  });
}));

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP code
 * @access  Public
 */
router.post('/resend-otp', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError('Email is required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ValidationError('User not found');
  }

  if (user.isVerified) {
    throw new ValidationError('Email already verified');
  }

  // Generate new OTP
  const otp = user.generateOTP();
  await user.save();

  // Send OTP email
  try {
    await sendOTPEmail(user.email, otp, user.username);
    logger.info('OTP resent to user email', { userId: user._id, email: user.email });
  } catch (error) {
    logger.error('Failed to resend OTP email', { error: error.message });
    throw new Error('Failed to send verification email. Please try again.');
  }

  res.json({
    success: true,
    message: 'OTP code sent to your email'
  });
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, emailOrUsername, password } = req.body;
  
  const loginIdentifier = emailOrUsername || email;

  // Validate input
  if (!loginIdentifier || !password) {
    throw new ValidationError('Email/Username and password are required');
  }

  // Find user by email or username
  const user = await User.findOne({ 
    $or: [
      { email: loginIdentifier.toLowerCase() },
      { username: loginIdentifier }
    ]
  }).select('+password');

  if (!user) {
    logger.warn('Login attempt with non-existent credentials', { identifier: loginIdentifier });
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check if user is verified
  if (!user.isVerified) {
    logger.warn('Login attempt with unverified account', { userId: user._id, email: user.email });
    return res.status(403).json({
      success: false,
      error: 'Email not verified',
      message: 'Please verify your email before logging in',
      requiresVerification: true,
      email: user.email
    });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    logger.warn('Failed login attempt', { 
      userId: user._id,
      email: user.email 
    });
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate JWT
  const token = jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  logger.info('User logged in successfully', {
    userId: user._id,
    username: user.username
  });

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email
    }
  });
}));

/**
 * @route   POST /api/auth/verify
 * @desc    Verify JWT token
 * @access  Public
 */
router.post('/verify', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Token is required');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.userId).lean();

    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    res.json({
      success: true,
      valid: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Public
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Token is required');
  }

  try {
    // Verify old token (even if expired)
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

    // Check if user still exists
    const user = await User.findById(decoded.userId).lean();

    if (!user) {
      throw new UnauthorizedError('User no longer exists');
    }

    // Generate new token
    const newToken = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('Token refreshed', { userId: user._id });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
}));

module.exports = router;
