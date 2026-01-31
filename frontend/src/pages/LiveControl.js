import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import API_URLS, { SOCKET_CONFIG } from '../config/api';
import './LiveControl.css';

const LiveControl = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [socket, setSocket] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answeredPlayers, setAnsweredPlayers] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(20);

  // Fetch game data and quiz on mount
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        console.log('🔍 Fetching game with PIN:', pin);
        const response = await fetch(API_URLS.GAME_BY_PIN(pin));
        const data = await response.json();
        
        console.log('Response status:', response.status);
        console.log('Response data:', data);
        
        if (response.ok) {
          setGameData(data);
          
          // Fetch quiz details
          console.log('📚 Fetching quiz:', data.quizId);
          const quizResponse = await fetch(API_URLS.QUIZ_BY_ID(data.quizId));
          const quizData = await quizResponse.json();
          console.log('Quiz data:', quizData);
          setQuiz(quizData);
          
          // Initialize responses for first question
          if (quizData.questions && quizData.questions.length > 0) {
            initializeResponses(quizData.questions[0]);
          }
        } else {
          console.error('❌ Failed to fetch game:', data.error);
          alert('Game not found: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('❌ Error fetching game data:', error);
        alert('Error loading game. Please try again.');
      }
    };

    fetchGameData();
  }, [pin]);

  // Setup Socket.io connection
  useEffect(() => {
    if (!gameData) return;

    const newSocket = io(SOCKET_CONFIG.URL);
    setSocket(newSocket);

    newSocket.emit('host-join-control', { pin });

    // Listen for player answers
    newSocket.on('player-answer', ({ playerId, answer, timeUsed, isCorrect, points }) => {
      console.log('Player answered:', { playerId, answer, timeUsed, isCorrect, points });
      
      // Check if this player already answered (prevent duplicates)
      setAnsweredPlayers(prev => {
        if (prev.has(playerId)) {
          console.warn('Duplicate answer from player:', playerId);
          return prev;
        }
        
        const newSet = new Set(prev);
        newSet.add(playerId);
        
        // Update response counts
        // Handle both single answer and array of answers (Multiple Choice)
        const answers = Array.isArray(answer) ? answer : [answer];
        setResponses(prevResp => prevResp.map(resp => {
          if (answers.includes(resp.id)) {
            return { ...resp, count: resp.count + 1 };
          }
          return resp;
        }));
        
        // Increment answered count
        setAnsweredCount(prevCount => prevCount + 1);
        
        // Update leaderboard with backend-calculated points
        if (points > 0) {
          updateLeaderboardWithPoints(playerId, points);
        }
        
        return newSet;
      });
    });

    // Listen for all players answered
    newSocket.on('all-answered', () => {
      console.log('All players answered!');
    });

    return () => {
      newSocket.close();
    };
  }, [gameData, pin]);

  // Start first question when quiz is loaded
  useEffect(() => {
    if (!quiz || !socket) return;
    
    console.log('🎮 Quiz loaded, waiting for players to join...');
    
    // Wait 2 seconds for players to join room before starting
    const startTimer = setTimeout(() => {
      console.log('🎮 Starting first question...');
      
      // Emit first question to all players
      socket.emit('start-first-question', {
        pin,
        questionIndex: 0,
        question: quiz.questions[0],
        timeLimit: quiz.questions[0].timeLimit || 20
      });
    }, 2000); // 2 second delay

    return () => clearTimeout(startTimer);
  }, [quiz, socket, pin]);

  // Initialize response counters for a question
  const initializeResponses = (question) => {
    const initialResponses = question.options.map((opt, idx) => {
      let id;
      if (question.type === 'True/False') {
        // For True/False, use A/B (0=A=False, 1=B=True)
        id = ['A', 'B'][idx];
      } else {
        // For Single/Multiple Choice, use A/B/C/D
        id = ['A', 'B', 'C', 'D'][idx];
      }
      
      // Handle correctAnswer for different question types
      let isCorrect = false;
      if (question.type === 'True/False') {
        // correctAnswer is 0 (False=A) or 1 (True=B)
        isCorrect = idx === question.correctAnswer;
      } else if (question.type === 'Multiple Choice') {
        // correctAnswer is array like [0, 2]
        const correctIndexes = Array.isArray(question.correctAnswer) 
          ? question.correctAnswer 
          : [question.correctAnswer];
        isCorrect = correctIndexes.includes(idx);
      } else {
        // Single Choice: correctAnswer is index
        isCorrect = idx === question.correctAnswer;
      }
      
      return {
        id,
        text: opt,
        count: 0,
        isCorrect
      };
    });
    
    setResponses(initialResponses);
    setAnsweredCount(0);
    setAnsweredPlayers(new Set()); // Reset answered players for new question
    setShowAnswer(false);
    setTimeLeft(question.timeLimit || 20); // Reset timer for new question
  };

  // Timer countdown for host
  useEffect(() => {
    if (!quiz || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, timeLeft]);

  // Update leaderboard with player scores
  const updateLeaderboardWithPoints = (playerId, points) => {
    if (!gameData) return;
    
    setLeaderboard(prev => {
      const existing = prev.find(p => p.playerId === playerId);
      if (existing) {
        return prev.map(p => 
          p.playerId === playerId 
            ? { ...p, score: p.score + points }
            : p
        ).sort((a, b) => b.score - a.score);
      } else {
        const player = gameData.players.find(p => p.id === playerId);
        return [...prev, {
          playerId,
          name: player?.nickname || 'Unknown',
          avatar: player?.avatar || '#E5164F',
          score: points
        }].sort((a, b) => b.score - a.score);
      }
    });
  };

  // Update leaderboard with player scores (old method - deprecated)
  const updateLeaderboard = (playerId, answer, timeUsed) => {
    if (!quiz || !gameData) return;
    
    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isCorrect = responses.find(r => r.id === answer)?.isCorrect;
    
    if (isCorrect) {
      const basePoints = currentQuestion.points || 1000;
      const timeBonus = Math.max(0, basePoints * (1 - timeUsed / currentQuestion.timeLimit));
      const score = Math.round(basePoints + timeBonus);
      
      setLeaderboard(prev => {
        const existing = prev.find(p => p.playerId === playerId);
        if (existing) {
          return prev.map(p => 
            p.playerId === playerId 
              ? { ...p, score: p.score + score }
              : p
          ).sort((a, b) => b.score - a.score);
        } else {
          const player = gameData.players.find(p => p.id === playerId);
          return [...prev, {
            playerId,
            name: player?.nickname || 'Unknown',
            avatar: player?.avatar || '#E5164F',
            score
          }].sort((a, b) => b.score - a.score);
        }
      });
    }
  };

  // Listen for auto-progression events from backend
  useEffect(() => {
    if (!socket) return;

    // Answer revealed automatically by backend
    socket.on('answer-revealed', ({ correctAnswer, correctIndex }) => {
      console.log('✅ Answer revealed:', correctAnswer);
      setShowAnswer(true);
    });

    // Next question automatically by backend
    socket.on('question-started', ({ question, questionIndex }) => {
      console.log('📝 Next question in LiveControl:', question);
      setCurrentQuestionIndex(questionIndex);
      initializeResponses(question);
      setShowAnswer(false);
    });

    // Game finished
    socket.on('game-finished', ({ leaderboard: finalLeaderboard }) => {
      console.log('🏁 Game finished in LiveControl');
      navigate(`/game/end/${pin}`, { state: { leaderboard: finalLeaderboard } });
    });

    return () => {
      socket.off('answer-revealed');
      socket.off('question-started');
      socket.off('game-finished');
    };
  }, [socket, pin, navigate]);

  if (!gameData || !quiz) {
    return (
      <div className="live-control-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Loading game...</h2>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalPlayers = gameData.players?.length || 0;

  return (
    <div className="live-control-container">
      <header className="live-header">
        <div className="header-left">
          <h2>{quiz.title}</h2>
          <span className="question-progress">
            Question {currentQuestionIndex + 1}/{quiz.questions.length}
          </span>
        </div>
        <div className="header-right">
          <span className="pin-badge">📌 PIN: {pin}</span>
          <span className="players-badge">👥 {totalPlayers}</span>
          <button className="btn-end-game" onClick={() => {
            socket?.emit('game-ended', { pin, leaderboard });
            navigate(`/game/end/${pin}`);
          }}>
            End Game
          </button>
        </div>
      </header>

      <div className="live-content">
        <div className="question-section">
          <div className="question-card">
            <div className="question-header-row">
              <div className="question-type-badge">{currentQuestion.type}</div>
              <div className="timer-badge" style={{
                backgroundColor: timeLeft > 5 ? '#26890D' : '#E5164F',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                ⏱️ {timeLeft}s
              </div>
            </div>
            <h1 className="question-text">{currentQuestion.title}</h1>
            <div className="media-preview">
              <span>👁️</span>
              <p>Question media preview</p>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: totalPlayers > 0 
                    ? `${(answeredCount / totalPlayers) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
            <p className="answered-count">
              {answeredCount} of {totalPlayers} players answered
            </p>
          </div>

          <div className="responses-section">
            <h3>Live Responses</h3>
            
            {/* Auto-progression indicator */}
            <div className="auto-progress-info">
              <p>⏱️ Questions progress automatically - no controls needed</p>
            </div>

            <div className="responses-grid">
              {responses.map(response => {
                const percentage = answeredCount > 0 
                  ? Math.round((response.count / answeredCount) * 100) 
                  : 0;
                
                return (
                  <div 
                    key={response.id} 
                    className={`response-bar ${showAnswer && response.isCorrect ? 'correct-answer' : ''}`}
                  >
                    <div className="response-label">
                      <span className={`option-badge ${showAnswer && response.isCorrect ? 'correct' : ''}`}>
                        {response.id}
                      </span>
                      <span className="option-text">{response.text}</span>
                    </div>
                    <div className="response-stats">
                      <span className="response-count">{response.count}</span>
                      <div className="bar-container">
                        <div 
                          className="bar-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="leaderboard-sidebar">
          <h3>🏆 Live Leaderboard</h3>
          <div className="leaderboard-list">
            {leaderboard.length === 0 ? (
              <p style={{textAlign: 'center', color: '#999', padding: '20px'}}>
                No scores yet...
              </p>
            ) : (
              leaderboard.slice(0, 5).map((player, index) => (
                <div key={player.playerId} className="leaderboard-item">
                  <span className="rank">{index + 1}</span>
                  <div className="player-info">
                    <div 
                      className="player-avatar" 
                      style={{ backgroundColor: player.avatar }}
                    >
                      {player.name.charAt(0)}
                    </div>
                    <span className="player-name">{player.name}</span>
                  </div>
                  <span className="player-score">{player.score}</span>
                </div>
              ))
            )}
          </div>

          {/* Auto-progression status */}
          <div className="auto-progress-status">
            <p>
              {showAnswer 
                ? '⏳ Moving to next question in 7 seconds...' 
                : `⏱️ Question ${currentQuestionIndex + 1}/${quiz.questions.length} - ${timeLeft}s remaining`
              }
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LiveControl;
