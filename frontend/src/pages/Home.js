import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiZap, FiUsers, FiTrendingUp, FiLogOut } from 'react-icons/fi';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    alert('Logged out successfully!');
  };

  return (
    <div className="home-container">
      {/* User info bar if logged in */}
      {user && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          background: 'white',
          padding: '10px 20px',
          borderRadius: '50px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <span style={{fontWeight: '500'}}>👋 {user.username}</span>
          <button 
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#E5164F',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <FiLogOut /> Logout
          </button>
        </div>
      )}

      <div className="hero-section">
        <h1 className="hero-title">
          Make Learning <br />
          <span className="text-red">Fun</span> & <span className="text-yellow">Fast</span>
        </h1>
        <p className="hero-subtitle">
          Create interactive quizzes in minutes. Engage your<br />
          classroom with real-time competition and instant feedback.
        </p>
        <div className="hero-buttons">
          <button className="btn btn-primary" onClick={() => {
            // Check if user is logged in
            const token = localStorage.getItem('token');
            if (token) {
              navigate('/dashboard');
            } else {
              navigate('/login');
            }
          }}>
            <span>▶</span> Create Quiz
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/join')}>
            Join with PIN
          </button>
        </div>
      </div>

      <div className="features-section">
        <div className="feature-card">
          <div className="feature-icon" style={{backgroundColor: '#FFE5E5'}}>
            <FiZap color="#E5164F" size={32} />
          </div>
          <h3>Quick Setup</h3>
          <p>Build quizzes in minutes with our intuitive editor. Add questions, media, and custom time limits effortlessly.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon" style={{backgroundColor: '#FFF9E5'}}>
            <FiUsers color="#FFC107" size={32} />
          </div>
          <h3>Live Engagement</h3>
          <p>Players join instantly with a PIN code. Watch real-time responses and keep everyone engaged with dynamic leaderboards.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon" style={{backgroundColor: '#E5F9E5'}}>
            <FiTrendingUp color="#26890D" size={32} />
          </div>
          <h3>Instant Results</h3>
          <p>Get immediate insights with detailed analytics. Track accuracy, speed, and identify areas for improvement.</p>
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-badge">
          <div className="stat-dots">
            <span className="dot" style={{backgroundColor: '#E5164F'}}></span>
            <span className="dot" style={{backgroundColor: '#FFC107'}}></span>
            <span className="dot" style={{backgroundColor: '#26890D'}}></span>
          </div>
          <p>Join thousands of educators worldwide</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
