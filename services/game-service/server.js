// 🧪 PIPELINE TEST: Full build all services
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { metricsMiddleware, register } = require('./utils/metrics');
require('dotenv').config();
const { trackEventAndUpdateStats } = require('./utils/eventTracker');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Metrics middleware
app.use(metricsMiddleware);

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log(' MongoDB connected'))
.catch(err => console.error(' MongoDB connection error:', err));

// Auto-progression helper function
const autoProgressQuestion = async (io, pin, questionIndex, timeLimit) => {
  setTimeout(async () => {
    console.log(` Time's up for question ${questionIndex} in game ${pin}`);
    
    const GameSession = require('./models/GameSession');
    const axios = require('axios');
    
    try {
      const game = await GameSession.findOne({ pin });
      if (!game) return;

      // Call Quiz Service directly to avoid Gateway rate limiting
      const QUIZ_SERVICE_URL = process.env.QUIZ_SERVICE_URL || 'http://localhost:3002';
      const quizResponse = await axios.get(`${QUIZ_SERVICE_URL}/quizzes/${game.quizId}`);
      const quiz = quizResponse.data;
      const currentQuestion = quiz.questions[questionIndex];
      
      // Handle different question types
      let correctAnswer;
      let correctIndexes;
      let correctAnswerText; // Full text of correct answer(s)
      
      if (currentQuestion.type === 'True/False') {
        // For True/False: use A/B (0=A=False, 1=B=True)
        correctAnswer = currentQuestion.correctAnswer === 1 ? 'B' : 'A';
        correctIndexes = currentQuestion.correctAnswer;
        correctAnswerText = currentQuestion.options[currentQuestion.correctAnswer];
      } else if (currentQuestion.type === 'Multiple Choice') {
        // For Multiple Choice: correctAnswer is array like [0, 2] for A and C
        if (Array.isArray(currentQuestion.correctAnswer)) {
          const letters = currentQuestion.correctAnswer.map(idx => ['A', 'B', 'C', 'D'][idx]);
          correctAnswer = letters.join(', '); // "A, C"
          correctIndexes = currentQuestion.correctAnswer;
          // Get text for all correct answers
          correctAnswerText = currentQuestion.correctAnswer.map(idx => currentQuestion.options[idx]).join(', ');
        } else {
          // Fallback if single answer
          correctAnswer = ['A', 'B', 'C', 'D'][currentQuestion.correctAnswer];
          correctIndexes = [currentQuestion.correctAnswer];
          correctAnswerText = currentQuestion.options[currentQuestion.correctAnswer];
        }
      } else {
        // For Single Choice: correctAnswer is index 0-3 (A-D)
        correctAnswer = ['A', 'B', 'C', 'D'][currentQuestion.correctAnswer];
        correctIndexes = [currentQuestion.correctAnswer];
        correctAnswerText = currentQuestion.options[currentQuestion.correctAnswer];
      }

      // Reveal answer to all players
      io.to(pin).emit('answer-revealed', { 
        correctAnswer,
        correctAnswerText, // Add full text
        correctIndexes, // Send array of correct indexes
        questionType: currentQuestion.type
      });

      console.log(` Revealed answer: ${correctAnswer} for question ${questionIndex} (Type: ${currentQuestion.type})`);

      // After 7 seconds, move to next question or end game (increased from 4s to give time for navigation)
      setTimeout(async () => {
        const nextIndex = questionIndex + 1;
        
        if (nextIndex < quiz.questions.length) {
          const nextQuestion = quiz.questions[nextIndex];
          console.log(` Auto moving to question ${nextIndex}`);
          
          io.to(pin).emit('question-started', {
            question: nextQuestion,
            questionIndex: nextIndex,
            timeLimit: nextQuestion.timeLimit || 20
          });

          // Recursively continue auto-progression
          autoProgressQuestion(io, pin, nextIndex, nextQuestion.timeLimit || 20);
          
        } else {
          // Game over, show final leaderboard
          console.log(` Game ${pin} finished!`);
          
          // Update game status to finished in database
          game.status = 'finished';
          game.finishedAt = new Date();
          await game.save();
          console.log(` Game status updated to 'finished' in database`);
          
          const leaderboard = game.players
            .map(p => ({
              id: p.id,
              nickname: p.nickname,
              avatar: p.avatar,
              score: p.score || 0
            }))
            .sort((a, b) => b.score - a.score);

          io.to(pin).emit('game-finished', { leaderboard });
          
          console.log(` Final leaderboard:`, leaderboard);
          
          // Track analytics for authenticated players AND host
          
          // Track game_ended for host (with stats update)
          await trackEventAndUpdateStats({
            eventType: 'game_ended',
            userId: game.hostId.toString(),
            relatedEntityType: 'game',
            relatedEntityId: game._id.toString(),
            metadata: {
              pin: pin,
              quizId: game.quizId.toString(),
              totalPlayers: game.players.length,
              duration: game.finishedAt ? Math.floor((game.finishedAt - game.startedAt) / 1000) : 0,
              winner: leaderboard.length > 0 ? leaderboard[0].nickname : null
            }
          });
          
          for (const player of game.players) {
            if (player.isAuthenticated && player.userId) {
              // Calculate player stats
              const totalQuestions = quiz.questions.length;
              const correctAnswers = player.answers.filter(a => a.isCorrect).length;
              const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions * 100) : 0;
              const rank = leaderboard.findIndex(p => p.id === player.id) + 1;
              
              // Track game_completed event (with stats update)
              await trackEventAndUpdateStats({
                eventType: 'game_completed',
                userId: player.userId.toString(),
                relatedEntityType: 'game',
                relatedEntityId: game._id.toString(),
                metadata: {
                  pin: pin,
                  quizId: game.quizId.toString(),
                  score: player.score || 0,
                  rank: rank,
                  totalPlayers: game.players.length,
                  accuracy: accuracy.toFixed(2),
                  correctAnswers: correctAnswers,
                  totalQuestions: totalQuestions,
                  isHost: player.userId.toString() === game.hostId.toString(),
                  won: rank === 1
                }
              });
              
              // If player won (rank 1), track wins stat specifically
              if (rank === 1 && game.players.length > 1) {
                console.log(` Player ${player.userId} won the game! (Tracked in game_completed metadata)`);
              }
            }
          }
        }
      }, 7000); // Increased to 7 seconds for smooth navigation

    } catch (error) {
      console.error('Error in auto-progression:', error);
    }
  }, (timeLimit || 20) * 1000);
};

// Game state storage (in-memory, can be moved to Redis for production)
const games = new Map();

// Socket.io connection
io.on('connection', (socket) => {
  console.log(' Client connected:', socket.id);

  // Host joins game room
  socket.on('host-join', (data) => {
    const { pin } = data;
    socket.join(pin);
    console.log(`� Host joined room: ${pin}`);
  });

  // Player joins game
  socket.on('join-game', async (data) => {
    const { pin, player } = data;
    
    try {
      // Find game session in database
      const GameSession = require('./models/GameSession');
      const game = await GameSession.findOne({ pin });

      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }

      if (game.status !== 'waiting') {
        return socket.emit('error', { message: 'Game already started' });
      }

      // Add player to game session
      const newPlayer = {
        id: player.id || socket.id,
        userId: player.userId || null, // Real user ID if authenticated
        isAuthenticated: player.isAuthenticated || false, // Flag for authenticated users
        nickname: player.nickname,
        color: player.color || player.avatar,
        avatar: player.color || player.avatar,
        score: 0,
        joinedAt: new Date()
      };

      game.players.push(newPlayer);
      await game.save();

      // Join socket room
      socket.join(pin);
      
      // Track analytics for authenticated users (with stats update)
      if (newPlayer.isAuthenticated && newPlayer.userId) {
        await trackEventAndUpdateStats({
          eventType: 'game_joined',
          userId: newPlayer.userId,
          relatedEntityType: 'game',
          relatedEntityId: game._id.toString(),
          metadata: {
            pin: pin,
            nickname: player.nickname,
            quizId: game.quizId.toString()
          }
        });
      }
      
      // Notify host and all players that new player joined
      io.to(pin).emit('player-joined', newPlayer);
      
      // Send confirmation to player
      socket.emit('joined-game', { game, player: newPlayer });
      
      console.log(` ${player.nickname} joined game ${pin}${newPlayer.isAuthenticated ? ' (authenticated)' : ' (guest)'}`);
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', { message: 'Failed to join game' });
    }
  });

  // Host starts game
  socket.on('start-game', async (data) => {
    const { pin } = data;
    
    try {
      const GameSession = require('./models/GameSession');
      const game = await GameSession.findOne({ pin });

      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }

      game.status = 'active';
      game.startedAt = new Date();
      await game.save();

      // Track analytics when host actually starts the game (not just creates PIN)
      // This ensures only started games count toward gamesHosted stat
      await trackEventAndUpdateStats({
        eventType: 'game_created',
        userId: game.hostId.toString(),
        relatedEntityType: 'game',
        relatedEntityId: game._id.toString(),
        metadata: {
          pin: pin,
          quizId: game.quizId.toString(),
          playerCount: game.players.length
        }
      });

      io.to(pin).emit('game-started', { game });
      console.log(` Game ${pin} started by host ${game.hostId}`);
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  // Host starts first question
  socket.on('start-first-question', async (data) => {
    const { pin, questionIndex, question, timeLimit } = data;
    
    const room = io.sockets.adapter.rooms.get(pin);
    const clientsInRoom = room ? room.size : 0;
    
    console.log(` Starting question ${questionIndex} for game ${pin}`);
    console.log(` Clients in room "${pin}": ${clientsInRoom}`);
    
    // Broadcast to all players in the room
    io.to(pin).emit('question-started', {
      questionIndex,
      question,
      timeLimit
    });

    // Start automatic progression
    autoProgressQuestion(io, pin, questionIndex, timeLimit || 20);
  });

  // Player submits answer
  socket.on('player-answer', async (data) => {
    const { pin, playerId, answer, timeUsed, questionIndex } = data;
    
    console.log(` Received player-answer:`, { pin, playerId, answer, timeUsed, questionIndex });
    
    try {
      const GameSession = require('./models/GameSession');
      const game = await GameSession.findOne({ pin });

      if (!game) {
        return socket.emit('error', { message: 'Game not found' });
      }

      // Find player in game to verify they exist
      const playerInGame = game.players.find(p => p.id == playerId); // Use == for loose equality
      if (!playerInGame) {
        console.error(` Player ${playerId} not found in game ${pin}`);
        console.log(`Available players:`, game.players.map(p => ({ id: p.id, nickname: p.nickname })));
        return socket.emit('error', { message: 'Player not found in game' });
      }

      console.log(` Player found: ${playerInGame.nickname} (ID: ${playerInGame.id})`);

      // Fetch quiz from quiz-service API (direct call to avoid Gateway rate limiting)
      const axios = require('axios');
      const QUIZ_SERVICE_URL = process.env.QUIZ_SERVICE_URL || 'http://localhost:3002';
      const quizResponse = await axios.get(`${QUIZ_SERVICE_URL}/quizzes/${game.quizId}`);
      const quiz = quizResponse.data;
      const question = quiz.questions[questionIndex];
      
      if (!question) {
        return socket.emit('error', { message: 'Question not found' });
      }

      // Check if answer is correct
      let isCorrect = false;
      
      if (question.type === 'True/False') {
        // True/False uses A/B: 0=A=False, 1=B=True
        const correctLetter = question.correctAnswer === 1 ? 'B' : 'A';
        isCorrect = answer === correctLetter;
        console.log(` Answer check (True/False): Player sent "${answer}", Correct is "${correctLetter}" (index ${question.correctAnswer}), Result: ${isCorrect}`);
      } else if (question.type === 'Multiple Choice') {
        // For Multiple Choice: answer must be array and match ALL correct answers
        const correctIndexes = Array.isArray(question.correctAnswer) 
          ? question.correctAnswer 
          : [question.correctAnswer];
        const correctLetters = correctIndexes.map(idx => ['A', 'B', 'C', 'D'][idx]).sort();
        
        const playerAnswers = Array.isArray(answer) ? answer : [answer];
        const sortedPlayerAnswers = [...playerAnswers].sort();
        
        // Must match exactly: same length and same elements
        isCorrect = correctLetters.length === sortedPlayerAnswers.length &&
                    correctLetters.every((letter, idx) => letter === sortedPlayerAnswers[idx]);
        
        console.log(` Answer check: Player sent [${playerAnswers.join(',')}], Correct is [${correctLetters.join(',')}], Result: ${isCorrect}`);
      } else {
        // Single Choice
        const correctLetter = ['A', 'B', 'C', 'D'][question.correctAnswer];
        isCorrect = answer === correctLetter;
        console.log(` Answer check: Player sent "${answer}", Correct is "${correctLetter}", Result: ${isCorrect}`);
      }
      
      // Calculate points (Kahoot-style: base points + time bonus)
      let points = 0;
      if (isCorrect) {
        const basePoints = question.points || 1000;
        const timeLimit = question.timeLimit || 20;
        const timeBonus = Math.max(0, Math.floor(basePoints * 0.5 * (1 - timeUsed / timeLimit)));
        points = basePoints + timeBonus;
        
        console.log(` Points calculation: base=${basePoints}, timeUsed=${timeUsed}s/${timeLimit}s, timeBonus=${timeBonus}, total=${points}`);
      }

      // Update player score in database
      const updateResult = await GameSession.updateOne(
        { pin, 'players.id': playerId },
        { 
          $inc: { 'players.$.score': points },
          $push: { 
            'players.$.answers': {
              questionId: questionIndex,
              answer,
              isCorrect,
              points,
              timeSpent: timeUsed
            }
          }
        }
      );

      console.log(` Database update result:`, updateResult);

      // Verify the update by fetching the game again
      const updatedGame = await GameSession.findOne({ pin });
      const updatedPlayer = updatedGame.players.find(p => p.id == playerId); // Use == for loose equality
      console.log(` Updated player score in DB: ${updatedPlayer?.score || 0} (was expecting: ${(playerInGame.score || 0) + points})`);

      if (updateResult.matchedCount === 0) {
        console.error(` Failed to update player score! No player matched with id: ${playerId}`);
      }

      // Send result back to the player who answered
      socket.emit('answer-result', {
        isCorrect,
        points,
        correctAnswer: ['A', 'B', 'C', 'D'][question.correctAnswer],
        selectedAnswer: answer  // Echo back the answer player selected
      });

      // Notify ONLY host about answer (not broadcast to all)
      // Host should be listening with different event or we emit to specific socket
      // For now, broadcast but host will handle deduplication
      socket.broadcast.to(pin).emit('player-answer', {
        playerId,
        answer,
        timeUsed,
        isCorrect,
        points
      });

      console.log(` Player ${playerId} answered: ${answer}, correct: ${isCorrect}, points: ${points}`);
    } catch (error) {
      console.error('Error processing answer:', error);
      socket.emit('error', { message: 'Failed to process answer' });
    }
  });

  // Show leaderboard
  socket.on('show-leaderboard', async (data) => {
    const { pin } = data;
    
    try {
      const GameSession = require('./models/GameSession');
      const game = await GameSession.findOne({ pin });

      if (!game) return;

      const leaderboard = game.players
        .map(p => ({
          nickname: p.nickname,
          avatar: p.avatar,
          score: p.score || 0
        }))
        .sort((a, b) => b.score - a.score);

      io.to(pin).emit('leaderboard-update', { leaderboard });
    } catch (error) {
      console.error('Error showing leaderboard:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(' Client disconnected:', socket.id);
  });

   // HOST events
  socket.on('host-join-control', ({ pin }) => {
    socket.join(pin);
    console.log(` Host joined control room: ${pin}`);
  });

  socket.on('show-answer', ({ pin, correctAnswer }) => {
    // Deprecated: Auto-progression handles this now
    console.log(' show-answer event received but ignored - using auto-progression');
  });

  socket.on('next-question', ({ pin, questionIndex, question }) => {
    // Deprecated: Auto-progression handles this now
    console.log(' next-question event received but ignored - using auto-progression');
  });

  socket.on('game-ended', async ({ pin, leaderboard }) => {
    console.log(` Host manually ended game: ${pin}`);
    
    try {
      const GameSession = require('./models/GameSession');
      const game = await GameSession.findOne({ pin });
      
      if (game) {
        // Update game status to finished
        game.status = 'finished';
        game.finishedAt = new Date();
        await game.save();
        console.log(` Game ${pin} status updated to 'finished' in database`);
        
        // Broadcast game-finished to all players
        io.to(pin).emit('game-finished', { leaderboard });
        console.log(` Final leaderboard broadcasted:`, leaderboard);
      } else {
        console.error(` Game ${pin} not found when trying to end manually`);
      }
    } catch (error) {
      console.error('Error ending game manually:', error);
    }
  });

  // PLAYER events
  socket.on('player-ready-for-question', ({ pin, playerId }) => {
    socket.join(pin);
    console.log(` Player ${playerId} ready in room: ${pin}`);
  });

  socket.on('player-answer', ({ pin, playerId, answer, timeUsed }) => {
    io.to(pin).emit('player-answer', {
      playerId,
      answer,
      timeUsed
    });
  });
  
});

// Helper functions
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// REST API routes
const gameRoutes = require('./routes/game.routes');
app.use('/games', gameRoutes);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'game-service',
    timestamp: new Date().toISOString() 
  });
});

const PORT = process.env.PORT || 3003;
server.listen(PORT, '0.0.0.0', () => {
  console.log(` Game Service running on port ${PORT}`);
});
