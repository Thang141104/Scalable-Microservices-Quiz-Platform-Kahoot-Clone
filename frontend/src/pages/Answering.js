import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { SOCKET_CONFIG } from '../config/api';
import './Answering.css';

const Answering = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  
  const [socket, setSocket] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedAnswer, setSelectedAnswer] = useState(null); // Can be single value or array for Multiple Choice
  const [selectedAnswers, setSelectedAnswers] = useState([]); // Array for Multiple Choice
  const [isSubmitted, setIsSubmitted] = useState(false); // Track if answer submitted
  const [startTime, setStartTime] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);

  // Use refs for latest values in event handlers
  const answerResultRef = useRef(null);
  const selectedAnswerRef = useRef(null);

  // Update refs when state changes
  useEffect(() => {
    answerResultRef.current = answerResult;
  }, [answerResult]);

  useEffect(() => {
    selectedAnswerRef.current = selectedAnswer;
  }, [selectedAnswer]);

  // Get player info from localStorage
  useEffect(() => {
    const storedPlayer = localStorage.getItem('currentPlayer');
    if (!storedPlayer) {
      navigate(`/join`);
      return;
    }
    setPlayerData(JSON.parse(storedPlayer));
  }, [pin, navigate]);

  // Setup Socket.io connection
  useEffect(() => {
    if (!playerData) return;
    
    // Reuse existing socket from window
    let newSocket = window.gameSocket;
    
    if (!newSocket || !newSocket.connected) {
      console.log('🔌 Creating new socket in Answering...');
      newSocket = io(SOCKET_CONFIG.URL);
      window.gameSocket = newSocket;
    } else {
      console.log('🔌 Reusing existing socket in Answering');
    }
    
    setSocket(newSocket);

    // Check if we have question data from previous page (from Feedback navigation)
    if (window.nextQuestionData) {
      console.log('📦 [ANSWERING] Loading question from window.nextQuestionData');
      const { question: savedQuestion, questionIndex: savedIndex, timeLimit: savedTimeLimit } = window.nextQuestionData;
      setQuestion(savedQuestion);
      setQuestionIndex(savedIndex);
      setTimeLeft(savedTimeLimit || 20);
      setStartTime(Date.now());
      setSelectedAnswer(null);
      setSelectedAnswers([]);
      setIsSubmitted(false);
      setAnswerResult(null);
      // Clear after using
      window.nextQuestionData = null;
    }

    // Remove old listeners to prevent duplicates
    newSocket.off('question-started');
    newSocket.off('answer-result');
    newSocket.off('answer-revealed');
    newSocket.off('game-finished');

    newSocket.emit('player-ready-for-question', { 
      pin, 
      playerId: playerData.id 
    });
    
    // Ensure we're in the room (important for page refresh)
    newSocket.emit('player-join-room', { pin, playerId: playerData.id });

    // Listen for question from host
    newSocket.on('question-started', ({ question, questionIndex: qIdx, timeLimit }) => {
      console.log('📝 [ANSWERING] Question started:', question);
      console.log('📝 [ANSWERING] Question index:', qIdx);
      console.log('📝 [ANSWERING] Question text:', question.question);
      console.log('📝 [ANSWERING] Options:', question.options);
      console.log('📝 [ANSWERING] Time limit:', timeLimit);
      setQuestion(question);
      setQuestionIndex(qIdx);
      setTimeLeft(timeLimit || 20);
      setStartTime(Date.now());
      setSelectedAnswer(null);
      setSelectedAnswers([]);
      setIsSubmitted(false);
      setAnswerResult(null); // Reset answer result for new question
    });

    // Listen for answer result from backend (store but don't navigate yet)
    newSocket.on('answer-result', ({ isCorrect, points, correctAnswer, selectedAnswer }) => {
      console.log('📊 Answer result:', { isCorrect, points, correctAnswer, selectedAnswer });
      setAnswerResult({ isCorrect, points, correctAnswer, selectedAnswer });
      // Don't navigate yet - wait for answer-revealed event after timer ends
    });

    // Listen for show answer event (auto after 20s timer)
    newSocket.on('answer-revealed', ({ correctAnswer, correctAnswerText, correctIndexes }) => {
      console.log('✅ Answer revealed, navigating to feedback in 1 second...');
      console.log('✅ Correct answer text:', correctAnswerText);
      
      // Wait 1 second before navigating to ensure smooth transition
      setTimeout(() => {
        // Use refs to get latest values
        const latestAnswerResult = answerResultRef.current;
        const latestSelectedAnswer = selectedAnswerRef.current;
        
        // If player already answered, use stored result
        // If not answered, show timeout feedback
        const feedbackData = latestAnswerResult || {
          isCorrect: false,
          points: 0,
          correctAnswer,
          correctAnswerText, // Add full text
          selectedAnswer: latestSelectedAnswer || null,
          timedOut: !latestSelectedAnswer  // Flag if player didn't answer
        };
        
        // Add correctAnswerText to existing result if available
        if (latestAnswerResult) {
          feedbackData.correctAnswerText = correctAnswerText;
        }
        
        navigate(`/live/feedback/${pin}`, {
          state: feedbackData
        });
      }, 1000);
    });

    // Listen for game ended
    newSocket.on('game-finished', ({ leaderboard }) => {
      console.log('🏁 Game finished');
      navigate(`/game/end/${pin}`, { state: { leaderboard } });
    });

    return () => {
      // Don't close socket - keep it alive for game duration
      console.log('🔌 Answering unmounting, keeping socket alive');
    };
  }, [playerData, pin]); // Remove navigate from dependencies

  // Timer countdown
  useEffect(() => {
    if (!question || timeLeft <= 0 || isSubmitted) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [question, timeLeft, isSubmitted]);

  // Handle answer selection
  const handleAnswer = (optionId) => {
    if (isSubmitted || !startTime) return;
    
    if (question.type === 'Multiple Choice') {
      // For Multiple Choice: toggle selection
      setSelectedAnswers(prev => {
        if (prev.includes(optionId)) {
          return prev.filter(id => id !== optionId);
        } else {
          return [...prev, optionId];
        }
      });
    } else {
      // For Single Choice and True/False: single selection
      if (selectedAnswer) return; // Already selected
      
      const timeUsed = (Date.now() - startTime) / 1000;
      setSelectedAnswer(optionId);
      setIsSubmitted(true);
      
      // Emit answer to server
      socket?.emit('player-answer', {
        pin,
        playerId: playerData.id,
        answer: optionId,
        timeUsed,
        questionIndex
      });
    }
  };
  
  // Handle submit for Multiple Choice
  const handleSubmitMultiple = () => {
    if (isSubmitted || selectedAnswers.length === 0 || !startTime) return;
    
    const timeUsed = (Date.now() - startTime) / 1000;
    setIsSubmitted(true);
    
    // Emit answer array to server
    socket?.emit('player-answer', {
      pin,
      playerId: playerData.id,
      answer: selectedAnswers, // Send array
      timeUsed,
      questionIndex
    });
  };

  // Handle time up
  const handleTimeUp = () => {
    if (isSubmitted) return;
    
    const timeUsed = question?.timeLimit || 20;
    setIsSubmitted(true);
    setSelectedAnswer('TIMEOUT');
    
    // Emit timeout to server
    socket?.emit('player-answer', {
      pin,
      playerId: playerData.id,
      answer: question.type === 'Multiple Choice' ? selectedAnswers : null,
      timeUsed,
      questionIndex
    });
  };

  if (!playerData || !question) {
    return (
      <div className="answering-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Waiting for host to start...</h2>
        </div>
      </div>
    );
  }

  const optionColors = ['#E5164F', '#FFC107', '#26890D', '#1368CE'];
  
  // Map options based on question type
  const options = question.options.map((opt, idx) => {
    let id;
    if (question.type === 'True/False') {
      // For True/False, use A/B (0=A=False, 1=B=True)
      id = ['A', 'B'][idx];
    } else {
      // For Single/Multiple Choice, use A/B/C/D
      id = ['A', 'B', 'C', 'D'][idx];
    }
    
    return {
      id,
      text: opt,
      color: optionColors[idx]
    };
  });

  return (
    <div className="answering-container">
      <div className="question-header">
        <span className="question-badge">
          Question {questionIndex + 1}
        </span>
        <div className="timer-circle">
          <svg width="60" height="60">
            <circle cx="30" cy="30" r="26" fill="none" stroke="#E2E8F0" strokeWidth="4"/>
            <circle 
              cx="30" 
              cy="30" 
              r="26" 
              fill="none" 
              stroke={timeLeft > 5 ? "#26890D" : "#E5164F"} 
              strokeWidth="4"
              strokeDasharray={`${(timeLeft / (question.timeLimit || 20)) * 163} 163`}
              transform="rotate(-90 30 30)"
            />
          </svg>
          <span className="timer-text">{timeLeft}</span>
        </div>
      </div>

      <h1 className="question-title">{question.title}</h1>
      
      {question.type === 'Multiple Choice' && (
        <p className="instruction-text" style={{ textAlign: 'center', color: '#718096', marginBottom: '10px' }}>
          Select all correct answers, then click Submit
        </p>
      )}

      <div className="options-grid">
        {options.map(option => {
          const isSelected = question.type === 'Multiple Choice' 
            ? selectedAnswers.includes(option.id)
            : selectedAnswer === option.id;
          
          return (
            <button
              key={option.id}
              className={`answer-option ${isSelected ? 'selected' : ''}`}
              style={{ backgroundColor: option.color }}
              onClick={() => handleAnswer(option.id)}
              disabled={isSubmitted || timeLeft === 0}
            >
              <span className="option-label">{option.id}</span>
              <span className="option-text">{option.text}</span>
              {question.type === 'Multiple Choice' && isSelected && (
                <span className="checkmark">✓</span>
              )}
            </button>
          );
        })}
      </div>
      
      {question.type === 'Multiple Choice' && !isSubmitted && selectedAnswers.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            onClick={handleSubmitMultiple}
            style={{
              padding: '12px 40px',
              fontSize: '18px',
              fontWeight: 'bold',
              backgroundColor: '#26890D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Submit ({selectedAnswers.length} selected)
          </button>
        </div>
      )}

      {isSubmitted && selectedAnswer !== 'TIMEOUT' && (
        <div className="answer-submitted">
          <div className="check-icon">✓</div>
          <p>Answer submitted! Waiting for other players...</p>
        </div>
      )}

      {selectedAnswer === 'TIMEOUT' && (
        <div className="answer-submitted">
          <div className="check-icon">⏰</div>
          <p>Time's up! Waiting for results...</p>
        </div>
      )}
    </div>
  );
};

export default Answering;
