const express = require('express');
const router = express.Router();
const GameSession = require('../models/GameSession');
const { trackEventAndUpdateStats } = require('../utils/eventTracker');

// Get all game sessions (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { hostId, status, limit = 50 } = req.query;
    let query = {};
    
    console.log(' Fetching game sessions with filters:', { hostId, status, limit });
    
    if (hostId) {
      query.hostId = hostId;
    }
    
    if (status) {
      query.status = status;
    }

    const sessions = await GameSession.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    console.log(` Found ${sessions.length} game sessions`);
    
    res.json(sessions);
  } catch (error) {
    console.error(' Error fetching game sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get game session by PIN
router.get('/pin/:pin', async (req, res) => {
  try {
    console.log('Looking for game with PIN:', req.params.pin);
    const session = await GameSession.findOne({ pin: req.params.pin });
    
    if (!session) {
      console.log('Game session not found for PIN:', req.params.pin);
      return res.status(404).json({ message: 'Game not found' });
    }
    
    console.log('Found game session:', session._id);
    res.json(session);
  } catch (error) {
    console.error('Error creating game session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get game session by ID
router.get('/:id', async (req, res) => {
  try {
    const session = await GameSession.findById(req.params.id).populate('quizId');
    if (!session) {
      return res.status(404).json({ error: 'Game session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create game session (generates PIN)
router.post('/', async (req, res) => {
  try {
    const { quizId, hostId } = req.body;
    
    console.log(' Creating game session:', { quizId, hostId });
    
    // Validate required fields
    if (!quizId) {
      return res.status(400).json({ error: 'quizId is required' });
    }
    if (!hostId) {
      return res.status(400).json({ error: 'hostId is required' });
    }

    // Generate unique 6-digit PIN
    let pin;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await GameSession.findOne({ pin });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique PIN' });
    }

    console.log('Generated PIN:', pin);

    // Create game session
    const session = new GameSession({
      pin,
      quizId,
      hostId,
      status: 'waiting',
      players: []
    });
    
    await session.save();
    console.log('Game session created:', session._id);
    
    // Note: Don't track game_created here - only track when host actually starts the game
    // This prevents counting games that were created but never started
    
    res.status(201).json({
      pin: session.pin,
      gameId: session._id,
      status: session.status
    });
  } catch (error) {
    console.error(' Error creating game session:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete game session
router.delete('/:id', async (req, res) => {
  try {
    const session = await GameSession.findByIdAndDelete(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Game session not found' });
    }
    res.json({ message: 'Game session deleted successfully' });
  } catch (error) {
    console.error('Error deleting game session:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
