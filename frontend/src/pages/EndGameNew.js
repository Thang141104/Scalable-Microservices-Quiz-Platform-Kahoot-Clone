import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import API_URLS from '../config/api';
import './EndGameNew.css';

const EndGameNew = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerData, setPlayerData] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [playerRank, setPlayerRank] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Avatar colors (Kahoot style)
  const avatarColors = [
    '#E5164F', // Red
    '#FFC107', // Yellow
    '#26890D', // Green
    '#1368CE', // Blue
    '#9C27B0', // Purple
    '#FF6F00', // Orange
  ];

  useEffect(() => {
    // Check if user is host or player
    const user = JSON.parse(localStorage.getItem('user'));
    const currentPlayer = JSON.parse(localStorage.getItem('currentPlayer'));
    
    if (user) {
      setIsHost(true);
    } else if (currentPlayer) {
      setPlayerData(currentPlayer);
    }

    // Get leaderboard from navigation state or fetch from API
    if (location.state?.leaderboard) {
      const sortedLeaderboard = location.state.leaderboard.sort((a, b) => b.score - a.score);
      setLeaderboard(sortedLeaderboard);
      
      // Find player rank if player
      if (currentPlayer) {
        const playerIndex = sortedLeaderboard.findIndex(
          p => p.id === currentPlayer.id || p.nickname === currentPlayer.nickname
        );
        if (playerIndex !== -1) {
          setPlayerRank(playerIndex + 1);
        }
      }
    } else {
      fetchLeaderboard();
    }

    // Trigger animations
    setTimeout(() => setAnimateIn(true), 100);
    setTimeout(() => setShowConfetti(true), 500);
    
    // Hide confetti after 5 seconds
    setTimeout(() => setShowConfetti(false), 5500);
  }, [location.state, pin]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(API_URLS.GAME_BY_PIN(pin));
      const data = await response.json();
      
      if (data.players) {
        const sortedLeaderboard = data.players
          .map(p => ({
            id: p.id,
            nickname: p.nickname,
            avatar: p.avatar,
            score: p.score || 0
          }))
          .sort((a, b) => b.score - a.score);
        
        setLeaderboard(sortedLeaderboard);
        
        if (playerData) {
          const playerIndex = sortedLeaderboard.findIndex(
            p => p.id === playerData.id || p.nickname === playerData.nickname
          );
          if (playerIndex !== -1) {
            setPlayerRank(playerIndex + 1);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const getAvatarColor = (index) => {
    return avatarColors[index % avatarColors.length];
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getPodiumHeight = (rank) => {
    if (rank === 1) return '200px';
    if (rank === 2) return '160px';
    if (rank === 3) return '120px';
    return '0px';
  };

  const handleBackToDashboard = () => {
    localStorage.removeItem('currentPlayer');
    navigate('/dashboard');
  };

  const handlePlayAgain = () => {
    navigate('/join');
  };

  // Confetti Component
  const Confetti = () => {
    if (!showConfetti) return null;
    
    const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
      color: avatarColors[Math.floor(Math.random() * avatarColors.length)]
    }));

    return (
      <div className="confetti-container">
        {confettiPieces.map(piece => (
          <div
            key={piece.id}
            className="confetti-piece"
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              backgroundColor: piece.color
            }}
          />
        ))}
      </div>
    );
  };

  // Top 3 Podium
  const Podium = ({ topThree }) => {
    const podiumOrder = [
      topThree[1], // 2nd place (left)
      topThree[0], // 1st place (center)
      topThree[2]  // 3rd place (right)
    ];

    return (
      <div className="podium-container">
        {podiumOrder.map((player, idx) => {
          if (!player) return <div key={idx} className="podium-slot empty" />;
          
          const actualRank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
          const height = getPodiumHeight(actualRank);
          
          return (
            <div 
              key={player.id || idx} 
              className={`podium-slot rank-${actualRank} ${animateIn ? 'animate-in' : ''}`}
              style={{ animationDelay: `${idx * 0.2}s` }}
            >
              <div className="podium-player">
                <div 
                  className="podium-avatar"
                  style={{ backgroundColor: player.avatar || getAvatarColor(actualRank - 1) }}
                >
                  {player.nickname?.charAt(0).toUpperCase()}
                </div>
                <div className="podium-medal">{getMedalEmoji(actualRank)}</div>
                <div className="podium-name">{player.nickname}</div>
                <div className="podium-score">{player.score.toLocaleString()} pts</div>
              </div>
              <div 
                className="podium-base" 
                style={{ 
                  height,
                  backgroundColor: actualRank === 1 ? '#FFD700' : actualRank === 2 ? '#C0C0C0' : '#CD7F32'
                }}
              >
                <span className="podium-rank">{actualRank}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // HOST VIEW
  if (isHost) {
    const topThree = leaderboard.slice(0, 3);
    const restOfPlayers = leaderboard.slice(3);

    return (
      <div className="endgame-new-container host-view">
        <Confetti />
        
        <div className="endgame-header">
          <h1 className="game-over-title">🏆 Game Over! 🏆</h1>
          <p className="game-pin">PIN: {pin}</p>
        </div>

        {topThree.length > 0 && (
          <Podium topThree={topThree} />
        )}

        {restOfPlayers.length > 0 && (
          <div className="other-players">
            <h3>Other Players</h3>
            <div className="players-list">
              {restOfPlayers.map((player, idx) => (
                <div 
                  key={player.id || idx} 
                  className={`player-row ${animateIn ? 'animate-in' : ''}`}
                  style={{ animationDelay: `${0.6 + idx * 0.1}s` }}
                >
                  <div className="player-rank">#{idx + 4}</div>
                  <div 
                    className="player-avatar-small"
                    style={{ backgroundColor: player.avatar || getAvatarColor(idx + 3) }}
                  >
                    {player.nickname?.charAt(0).toUpperCase()}
                  </div>
                  <div className="player-name">{player.nickname}</div>
                  <div className="player-score">{player.score.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="endgame-actions">
          <button className="btn-dashboard" onClick={handleBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // PLAYER VIEW
  const currentPlayerData = leaderboard.find(
    p => p.id === playerData?.id || p.nickname === playerData?.nickname
  );

  return (
    <div className="endgame-new-container player-view">
      <Confetti />
      
      <div className="player-result-card">
        <div className="result-icon">
          {playerRank === 1 ? '👑' : playerRank <= 3 ? '🎉' : '💪'}
        </div>
        
        <h1 className="your-rank">
          {playerRank === 1 ? 'You Won!' : `You placed #${playerRank}!`}
        </h1>
        
        <div className="player-stats-card">
          <div 
            className="player-avatar-large"
            style={{ backgroundColor: currentPlayerData?.avatar || '#E5164F' }}
          >
            {playerData?.nickname?.charAt(0).toUpperCase()}
          </div>
          <div className="player-name-large">{playerData?.nickname}</div>
          <div className="player-score-large">{currentPlayerData?.score || 0} points</div>
          <div className="player-rank-badge">{getMedalEmoji(playerRank)}</div>
        </div>

        <div className="final-leaderboard-mini">
          <h3>Final Standings</h3>
          {leaderboard.slice(0, 5).map((player, idx) => {
            const isCurrentPlayer = player.id === playerData?.id || player.nickname === playerData?.nickname;
            
            return (
              <div 
                key={player.id || idx}
                className={`mini-player-row ${isCurrentPlayer ? 'highlight' : ''} ${animateIn ? 'animate-in' : ''}`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <span className="mini-rank">{getMedalEmoji(idx + 1)}</span>
                <div 
                  className="mini-avatar"
                  style={{ backgroundColor: player.avatar || getAvatarColor(idx) }}
                >
                  {player.nickname?.charAt(0).toUpperCase()}
                </div>
                <span className="mini-name">{player.nickname}</span>
                <span className="mini-score">{player.score}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="endgame-actions">
        <button className="btn-play-again" onClick={handlePlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
};

export default EndGameNew;
