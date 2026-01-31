import React, { useState, useEffect } from 'react';
import './AnalyticsDashboard.css';
import { API_URLS } from '../config/api';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, events, trends

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard summary
      const dashboardResponse = await fetch(API_URLS.ANALYTICS_DASHBOARD);
      const dashboardJson = await dashboardResponse.json();
      
      // Fetch global stats
      const statsResponse = await fetch(API_URLS.ANALYTICS_GLOBAL);
      const statsJson = await statsResponse.json();
      
      setDashboardData(dashboardJson);
      setGlobalStats(statsJson);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    const n = Number(num) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const formatPercent = (num) => {
    const n = Number(num) || 0;
    return n.toFixed(1) + '%';
  };

  if (loading && !dashboardData) {
    return (
      <div className="analytics-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => window.location.href = '/'} 
            style={{
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            🏠 Home
          </button>
          <button 
            onClick={() => window.location.href = '/dashboard'} 
            style={{
              background: '#6366f1',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            ← Back to Dashboard
          </button>
          <h1>📊 Analytics Dashboard</h1>
        </div>
        <button onClick={fetchDashboardData} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          📝 Events
        </button>
        <button
          className={`tab-button ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          📊 Trends
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="overview-tab">
          {/* Key Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">👥</div>
              <div className="metric-content">
                <h3>Total Users</h3>
                <p className="metric-value">{formatNumber(globalStats?.totalUsers)}</p>
                <span className="metric-label">Registered</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🟢</div>
              <div className="metric-content">
                <h3>Active Users</h3>
                <p className="metric-value">{formatNumber(dashboardData?.activeUsers)}</p>
                <span className="metric-label">Last 24h</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📝</div>
              <div className="metric-content">
                <h3>Total Quizzes</h3>
                <p className="metric-value">{formatNumber(globalStats?.totalQuizzes)}</p>
                <span className="metric-label">Created</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">🎮</div>
              <div className="metric-content">
                <h3>Games Played</h3>
                <p className="metric-value">{formatNumber(globalStats?.totalGamesPlayed)}</p>
                <span className="metric-label">All Time</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="activity-section">
            <h2>📊 Platform Activity</h2>
            <div className="activity-grid">
              <div className="activity-card">
                <h4>Quiz Activity</h4>
                <div className="activity-stats">
                  <div className="stat-row">
                    <span>Created Today:</span>
                    <strong>{dashboardData?.quizzesCreatedToday || 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Played Today:</span>
                    <strong>{dashboardData?.quizzesPlayedToday || 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Completion Rate:</span>
                    <strong>{formatPercent(dashboardData?.avgCompletionRate)}</strong>
                  </div>
                </div>
              </div>

              <div className="activity-card">
                <h4>Game Activity</h4>
                <div className="activity-stats">
                  <div className="stat-row">
                    <span>Hosted Today:</span>
                    <strong>{dashboardData?.gamesHostedToday || 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Total Players:</span>
                    <strong>{dashboardData?.totalPlayersToday || 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Avg Players/Game:</span>
                    <strong>{(Number(dashboardData?.avgPlayersPerGame) || 0).toFixed(1)}</strong>
                  </div>
                </div>
              </div>

              <div className="activity-card">
                <h4>User Engagement</h4>
                <div className="activity-stats">
                  <div className="stat-row">
                    <span>New Users Today:</span>
                    <strong>{dashboardData?.newUsersToday || 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Active Users:</span>
                    <strong>{dashboardData?.activeUsers || 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Avg Accuracy:</span>
                    <strong>{formatPercent(dashboardData?.avgAccuracy)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Content */}
          {dashboardData?.popularQuizzes && dashboardData.popularQuizzes.length > 0 && (
            <div className="popular-section">
              <h2>🔥 Popular Quizzes</h2>
              <div className="popular-list">
                {dashboardData.popularQuizzes.slice(0, 5).map((quiz, index) => (
                  <div key={quiz.quizId} className="popular-item">
                    <div className="popular-rank">#{index + 1}</div>
                    <div className="popular-content">
                      <h4>{quiz.title || `Quiz ${quiz.quizId}`}</h4>
                      <div className="popular-stats">
                        <span>🎮 {quiz.playCount} plays</span>
                        <span>👥 {quiz.uniquePlayers} players</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="events-tab">
          <h2>📝 Recent Events</h2>
          <div className="events-summary">
            <div className="event-stat">
              <span className="event-icon">👤</span>
              <div>
                <strong>{globalStats?.totalUsers || 0}</strong>
                <span>User Events</span>
              </div>
            </div>
            <div className="event-stat">
              <span className="event-icon">📝</span>
              <div>
                <strong>{globalStats?.totalQuizzes || 0}</strong>
                <span>Quiz Events</span>
              </div>
            </div>
            <div className="event-stat">
              <span className="event-icon">🎮</span>
              <div>
                <strong>{globalStats?.totalGamesPlayed || 0}</strong>
                <span>Game Events</span>
              </div>
            </div>
          </div>
          <p className="info-message">
            💡 Event tracking is active. All user actions are being logged for analytics.
          </p>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="trends-tab">
          <h2>📊 Platform Trends</h2>
          <div className="trend-cards">
            <div className="trend-card">
              <h3>Growth Metrics</h3>
              <div className="trend-content">
                <div className="trend-item">
                  <span>User Growth:</span>
                  <span className="trend-value positive">+{dashboardData?.newUsersToday || 0} today</span>
                </div>
                <div className="trend-item">
                  <span>Quiz Creation:</span>
                  <span className="trend-value positive">+{dashboardData?.quizzesCreatedToday || 0} today</span>
                </div>
                <div className="trend-item">
                  <span>Game Activity:</span>
                  <span className="trend-value positive">+{dashboardData?.gamesHostedToday || 0} today</span>
                </div>
              </div>
            </div>

            <div className="trend-card">
              <h3>Performance Metrics</h3>
              <div className="trend-content">
                <div className="trend-item">
                  <span>Completion Rate:</span>
                  <span className="trend-value">{formatPercent(dashboardData?.avgCompletionRate)}</span>
                </div>
                <div className="trend-item">
                  <span>Average Accuracy:</span>
                  <span className="trend-value">{formatPercent(dashboardData?.avgAccuracy)}</span>
                </div>
                <div className="trend-item">
                  <span>Engagement Score:</span>
                  <span className="trend-value positive">High</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="last-updated">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
