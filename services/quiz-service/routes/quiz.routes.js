const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const { authMiddleware, optionalAuth } = require('../middleware/auth.middleware');

// Get all quizzes
router.get('/', async (req, res) => {
  try {
    const { userId, filter } = req.query;
    let query = {};
    
    if (userId) {
      query.createdBy = userId;
    }
    
    if (filter === 'starred') {
      query.starred = true;
    }

    const quizzes = await Quiz.find(query).sort({ updatedAt: -1 });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get quiz by ID
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new quiz
router.post('/', authMiddleware, async (req, res) => {
  try {
    const quizData = { ...req.body };
    
    // Set createdBy from authenticated user
    if (req.user && req.user.id) {
      quizData.createdBy = req.user.id;
    }
    
    // Transform question format if needed
    if (quizData.questions && Array.isArray(quizData.questions)) {
      quizData.questions = quizData.questions.map(q => {
        const transformed = { ...q };
        
        // Map 'question' to 'title' if needed
        if (q.question && !q.title) {
          transformed.title = q.question;
          delete transformed.question;
        }
        
        // Transform type format
        if (q.type) {
          const typeMap = {
            'single': 'Single Choice',
            'multiple': 'Multiple Choice',
            'truefalse': 'True/False',
            'Single Choice': 'Single Choice',
            'Multiple Choice': 'Multiple Choice',
            'True/False': 'True/False'
          };
          transformed.type = typeMap[q.type] || q.type;
        }
        
        return transformed;
      });
    }
    
    const quiz = new Quiz(quizData);
    await quiz.save();
    
    // Track analytics and update user stats
    try {
      const axios = require('axios');
      const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005';
      const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3004';
      
      const eventData = {
        eventType: 'quiz_created',
        userId: req.user.id,
        relatedEntityType: 'quiz',
        relatedEntityId: quiz._id.toString(),
        metadata: {
          title: quiz.title,
          category: quiz.category,
          questionCount: quiz.questions?.length || 0
        }
      };
      
      // Track to analytics
      await axios.post(`${ANALYTICS_SERVICE_URL}/events`, eventData);
      console.log(`Analytics: Tracked quiz_created for user ${req.user.id}`);
      
      // Update user stats and check achievements
      const statsResult = await axios.post(`${USER_SERVICE_URL}/webhook/update-stats`, {
        userId: req.user.id,
        eventType: 'quiz_created',
        metadata: eventData.metadata
      });
      
      if (statsResult.data.newAchievements && statsResult.data.newAchievements.length > 0) {
        console.log(`User ${req.user.id} unlocked ${statsResult.data.newAchievements.length} achievements!`);
      }
    } catch (analyticsError) {
      console.error('Failed to track analytics:', analyticsError.message);
      // Don't fail quiz creation if analytics fails
    }
    
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Quiz creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update quiz
router.put('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete quiz
router.delete('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle star
router.patch('/:id/star', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    quiz.starred = !quiz.starred;
    await quiz.save();
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
