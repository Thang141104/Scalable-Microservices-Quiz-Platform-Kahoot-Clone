import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { SOCKET_CONFIG } from '../config/api';
import './Feedback.css';

const Feedback = () => {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);

  // Get feedback data from navigation state
  const feedback = location.state || {
    isCorrect: false,
    points: 0,
    correctAnswer: null,
    selectedAnswer: null
  };

  useEffect(() => {
    console.log('📊 Feedback page loaded:', feedback);

    // Reuse existing socket
    let newSocket = window.gameSocket;
    
    if (!newSocket || !newSocket.connected) {
      console.log('🔌 Creating new socket in Feedback...');
      newSocket = io(SOCKET_CONFIG.URL);
      window.gameSocket = newSocket;
    } else {
      console.log('🔌 Reusing existing socket in Feedback');
    }
    
    setSocket(newSocket);

    // Remove old listeners to prevent duplicates
    newSocket.off('question-started');
    newSocket.off('game-finished');

    // Listen for next question
    newSocket.on('question-started', ({ question, questionIndex, timeLimit }) => {
      console.log('📝 [FEEDBACK] Next question received, navigating back to Answering...');
      console.log('📝 [FEEDBACK] Question data:', { question, questionIndex, timeLimit });
      
      // Store question data in window to avoid timing issues
      window.nextQuestionData = { question, questionIndex, timeLimit };
      
      navigate(`/live/answer/${pin}`);
    });

    // Listen for game ended
    newSocket.on('game-finished', ({ leaderboard }) => {
      console.log('🏁 Game finished, navigating to end game...');
      navigate(`/game/end/${pin}`, { state: { leaderboard } });
    });

    return () => {
      // Keep socket alive
      console.log('🔌 Feedback unmounting, keeping socket alive');
    };
  }, [pin]); // Remove navigate and feedback from dependencies

  return (
    <div className={`feedback-container ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
      <div className="feedback-content">
        <div className="feedback-icon">
          {feedback.isCorrect ? '✓' : '✗'}
        </div>

        <h1 className="feedback-title">
          {feedback.timedOut ? 'Time\'s Up!' : feedback.isCorrect ? 'Correct!' : 'Incorrect!'}
        </h1>

        <div className="points-card">
          <p className="points-label">Points Earned</p>
          <h2 className="points-value">+{feedback.points}</h2>
        </div>

        {!feedback.isCorrect && feedback.correctAnswerText && (
          <div className="correct-answer-card">
            <p className="correct-answer-label">Correct Answer:</p>
            <h3 className="correct-answer-value">
              {feedback.correctAnswer && <span className="answer-letter">{feedback.correctAnswer}: </span>}
              {feedback.correctAnswerText}
            </h3>
          </div>
        )}

        {feedback.isCorrect && (
          <div className="streak-badge">
            <span className="streak-icon">⚡</span>
            <span className="streak-text">Great job!</span>
          </div>
        )}

        <div className="loading-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>

        <p className="waiting-text">Waiting for next question...</p>
      </div>
    </div>
  );
};

export default Feedback;
