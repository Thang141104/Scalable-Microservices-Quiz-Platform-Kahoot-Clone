import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiZap } from 'react-icons/fi';
import io from 'socket.io-client';
import API_URLS, { SOCKET_CONFIG } from '../config/api';
import './Join.css';

const Join = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);

  const avatarColors = [
    '#E5164F', '#FFC107', '#26890D', '#1368CE',
    '#9B51E0', '#F97316', '#EC4899', '#06B6D4'
  ];

  const handleJoin = async () => {
    if (pin && nickname) {
      try {
        // Verify game exists
        const response = await fetch(API_URLS.GAME_BY_PIN(pin));
        
        if (!response.ok) {
          alert('Game not found! Please check the PIN.');
          return;
        }

        // Connect to Socket.io and join game
        const socket = io(SOCKET_CONFIG.URL);
        
        // Check if user is logged in
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        
        const playerData = {
          id: user?.id || Date.now(), // Use real userId if logged in, else temporary ID
          nickname: nickname,
          color: avatarColors[selectedAvatar],
          avatar: avatarColors[selectedAvatar],
          isAuthenticated: !!user, // Flag to indicate authenticated user
          userId: user?.id || null // Store userId separately for analytics
        };

        // Wait for join confirmation
        socket.on('joined-game', ({ game, player }) => {
          console.log('✅ Successfully joined game:', game.pin);
          // Store player data in localStorage for LobbyPlayer page
          localStorage.setItem('currentPlayer', JSON.stringify(player));
          localStorage.setItem('currentGamePin', pin);
          
          // Keep socket alive by storing reference
          window.gameSocket = socket;
          
          // Navigate to player lobby
          navigate(`/lobby/player/${pin}`);
        });

        socket.on('error', (error) => {
          alert(error.message || 'Failed to join game');
          socket.close();
        });

        socket.emit('join-game', {
          pin: pin,
          player: playerData
        });

      } catch (error) {
        console.error('Error joining game:', error);
        alert('Failed to join game. Please try again.');
      }
    }
  };

  return (
    <div className="join-container">
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{
            background: '#6366f1',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
          }}
        >
          📚 My Dashboard
        </button>
      </div>
      <div className="join-card">
        <div className="join-icon">
          <FiZap size={32} />
        </div>
        <h1>Join Quiz</h1>
        <p>Enter the game PIN to get started</p>

        <div className="form-section">
          <div className="form-group">
            <label>Game PIN</label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="123456"
              maxLength="6"
              className="pin-input"
            />
          </div>

          <div className="form-group">
            <label>Your Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your name"
              className="nickname-input"
            />
          </div>

          <div className="form-group">
            <label>Choose Your Avatar</label>
            <div className="avatar-grid">
              {avatarColors.map((color, index) => (
                <button
                  key={index}
                  className={`avatar-option ${selectedAvatar === index ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedAvatar(index)}
                >
                  ?
                </button>
              ))}
            </div>
          </div>

          <button 
            className="btn-join-game" 
            onClick={handleJoin}
            disabled={!pin || !nickname}
          >
            <FiZap /> Join Game
          </button>
        </div>

        <p className="help-text">
          Get the PIN from your host to join the quiz
        </p>
      </div>
    </div>
  );
};

export default Join;
