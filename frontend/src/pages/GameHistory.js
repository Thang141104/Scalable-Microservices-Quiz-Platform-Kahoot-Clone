import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTrash2, FiUsers, FiClock, FiAward, FiPlay } from 'react-icons/fi';
import API_URLS from '../config/api';
import './GameHistory.css';

const GameHistory = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, active
  const [quizzes, setQuizzes] = useState({}); // Store quiz details by ID

  useEffect(() => {
    fetchGameHistory();
  }, [filter]);

  // Fetch quiz details for games
  useEffect(() => {
    const fetchQuizDetails = async () => {
      const quizIds = [...new Set(games.map(g => g.quizId).filter(Boolean))];
      
      for (const quizId of quizIds) {
        if (!quizzes[quizId] && typeof quizId === 'string') {
          try {
            const response = await fetch(API_URLS.QUIZ_BY_ID(quizId));
            if (response.ok) {
              const data = await response.json();
              setQuizzes(prev => ({ ...prev, [quizId]: data }));
            }
          } catch (error) {
            console.error('Error fetching quiz:', quizId, error);
          }
        }
      }
    };

    if (games.length > 0) {
      fetchQuizDetails();
    }
  }, [games]);

  const fetchGameHistory = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.id) {
        navigate('/login');
        return;
      }

      console.log('🔍 Fetching game history for user:', user.id);

      // Build query params
      const params = new URLSearchParams({ hostId: user.id });
      if (filter !== 'all') {
        params.append('status', filter === 'completed' ? 'finished' : 'active');
      }

      const url = `${API_URLS.GAMES}?${params}`;
      console.log('📡 API URL:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('📦 Response status:', response.status);
      console.log('📦 Response data:', data);

      if (response.ok) {
        console.log(`✅ Found ${data.length} games`);
        setGames(data);
      } else {
        console.error('❌ Failed to fetch games:', data);
      }
    } catch (error) {
      console.error('❌ Error fetching game history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (id, pin) => {
    if (!window.confirm(`Are you sure you want to delete game session PIN: ${pin}?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(API_URLS.GAME_DELETE(id), {
        method: 'DELETE'
      });

      if (response.ok) {
        setGames(games.filter(g => g._id !== id));
        alert('Game session deleted successfully!');
      } else {
        const data = await response.json();
        alert('Failed to delete game: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting game:', error);
      alert('Error deleting game. Please try again.');
    }
  };

  const handleViewResults = (pin) => {
    navigate(`/game/end/${pin}`);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      waiting: { text: 'Waiting', color: '#FFC107' },
      active: { text: 'Active', color: '#26890D' },
      finished: { text: 'Finished', color: '#718096' }
    };
    const statusInfo = statusMap[status] || { text: status, color: '#718096' };
    
    return (
      <span 
        className="status-badge" 
        style={{ backgroundColor: statusInfo.color }}
      >
        {statusInfo.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredGames = games;

  return (
    <div className="game-history-container">
      <header className="history-header">
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-back" onClick={() => navigate('/')}>
            🏠 Home
          </button>
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            <FiArrowLeft /> Back to Dashboard
          </button>
        </div>
        <h1>Game History</h1>
      </header>

      <div className="history-content">
        <div className="filter-section">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Games
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading game history...</div>
        ) : filteredGames.length === 0 ? (
          <div className="empty-state">
            <FiPlay size={64} color="#CBD5E0" />
            <h3>No games found</h3>
            <p>Start your first game from the dashboard!</p>
            <p style={{fontSize: '12px', color: '#999', marginTop: '10px'}}>
              Debug: Filtering by hostId = {JSON.parse(localStorage.getItem('user') || '{}').id || 'not found'}
            </p>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="games-list">
            {filteredGames.map(game => (
              <div key={game._id} className="game-card">
                <div className="game-card-header">
                  <div className="game-info">
                    <h3 className="quiz-title">
                      {quizzes[game.quizId]?.title || game.quizId?.title || `Quiz ID: ${game.quizId || 'Unknown'}`}
                    </h3>
                    <div className="game-meta">
                      <span className="game-pin">
                        PIN: <strong>{game.pin}</strong>
                      </span>
                      {getStatusBadge(game.status)}
                    </div>
                  </div>
                </div>

                <div className="game-stats">
                  <div className="stat-item">
                    <FiUsers size={20} color="#667eea" />
                    <div className="stat-info">
                      <span className="stat-value">{game.players?.length || 0}</span>
                      <span className="stat-label">Players</span>
                    </div>
                  </div>
                  
                  <div className="stat-item">
                    <FiAward size={20} color="#FFC107" />
                    <div className="stat-info">
                      <span className="stat-value">
                        {game.players?.length > 0 
                          ? game.players[0]?.nickname || 'N/A'
                          : 'N/A'}
                      </span>
                      <span className="stat-label">Top Player</span>
                    </div>
                  </div>

                  <div className="stat-item">
                    <FiClock size={20} color="#26890D" />
                    <div className="stat-info">
                      <span className="stat-value">{formatDate(game.createdAt)}</span>
                      <span className="stat-label">Started</span>
                    </div>
                  </div>
                </div>

                <div className="game-actions">
                  {game.status === 'finished' && (
                    <button
                      className="btn-view-results"
                      onClick={() => handleViewResults(game.pin)}
                    >
                      <FiAward /> View Results
                    </button>
                  )}
                  <button
                    className="btn-delete-game"
                    onClick={() => handleDeleteGame(game._id, game.pin)}
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameHistory;
