import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiUsers, FiPlay } from 'react-icons/fi';
import io from 'socket.io-client';
import API_URLS, { SOCKET_CONFIG } from '../config/api';
import './LobbyHost.css';

const LobbyHost = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [quizTitle, setQuizTitle] = useState('Loading...');
  const [gameSession, setGameSession] = useState(null);
  const [socket, setSocket] = useState(null);

  // Fetch game session and quiz details
  useEffect(() => {
    const fetchGameSession = async () => {
      try {
        // Get game session by PIN
        const gameResponse = await fetch(API_URLS.GAME_BY_PIN(pin));
        const gameData = await gameResponse.json();
        
        if (!gameResponse.ok) {
          alert('Game session not found');
          navigate('/dashboard');
          return;
        }
        
        setGameSession(gameData);
        setPlayers(gameData.players || []);

        // Get quiz details
        const quizResponse = await fetch(API_URLS.QUIZ_BY_ID(gameData.quizId));
        const quizData = await quizResponse.json();
        
        if (quizResponse.ok) {
          setQuizTitle(quizData.title);
        }
      } catch (error) {
        console.error('Error fetching game session:', error);
        alert('Failed to load game session');
      }
    };

    fetchGameSession();
  }, [pin, navigate]);

  // Setup Socket.io connection for real-time player updates
  useEffect(() => {
    const newSocket = io(SOCKET_CONFIG.URL);
    setSocket(newSocket);

    // Host joins the game room
    newSocket.emit('host-join', { pin });

    // Listen for players joining
    newSocket.on('player-joined', (player) => {
      console.log('Player joined:', player);
      setPlayers(prevPlayers => [...prevPlayers, player]);
    });

    // Listen for player leaving
    newSocket.on('player-left', (playerId) => {
      console.log('Player left:', playerId);
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId));
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [pin]);

  const startGame = () => {
    if (socket) {
      socket.emit('start-game', { pin });
    }
    navigate(`/live/control/${pin}`);
  };

  return (
    <div className="lobby-container">
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{
            background: 'white',
            border: '2px solid #E2E8F0',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
      <div className="lobby-content">
        <h1 className="quiz-title">{quizTitle}</h1>
        <p className="lobby-subtitle">Players are joining...</p>

        <div className="lobby-grid">
          <div className="pin-card">
            <h3>GAME PIN</h3>
            <div className="pin-display">{pin}</div>
            <button className="btn-show-qr">
              <span>📱</span> Show QR Code
            </button>
            <p className="join-instruction">Join at nele.app</p>
          </div>

          <div className="players-card">
            <div className="players-header">
              <FiUsers size={24} />
              <h3>{players.length} Players</h3>
              <button className="btn-sound">🔊</button>
            </div>

            <div className="players-grid">
              {players.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#A0AEC0' }}>
                  <p>Waiting for players to join...</p>
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>Share the PIN above</p>
                </div>
              ) : (
                players.map(player => (
                  <div key={player.id} className="player-badge">
                    <div 
                      className="player-avatar"
                      style={{ backgroundColor: player.color || player.avatar || '#E5164F' }}
                    >
                      {player.nickname ? player.nickname.charAt(0).toUpperCase() : player.name?.charAt(0) || '?'}
                    </div>
                    <span className="player-name">{player.nickname || player.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <button 
          className="btn-start-game" 
          onClick={startGame}
          disabled={players.length === 0}
        >
          <FiPlay /> Start Game
        </button>

        <p className="ready-text">
          {players.length === 0 
            ? 'Waiting for players to join...' 
            : `Ready to start with ${players.length} player${players.length > 1 ? 's' : ''}`
          }
        </p>

        <div className="loading-indicator">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
};

export default LobbyHost;
