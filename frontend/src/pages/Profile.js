import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiCamera, FiAward, FiTrendingUp, FiUser, FiX, FiCheck } from 'react-icons/fi';
import API_URLS from '../config/api';
import './Profile.css';

// Updated styling v2
const Profile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' or 'achievements'
  const [formData, setFormData] = useState({
    displayName: '',
    bio: ''
  });

  useEffect(() => {
    fetchProfile();
    fetchAchievements();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) {
        navigate('/login');
        return;
      }

      setIsOwner(!userId || userId === user?.id);

      const response = await fetch(API_URLS.USER_PROFILE(targetUserId), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      console.log('Profile API response:', { status: response.status, data });

      if (response.ok) {
        setProfile(data);
        setFormData({
          displayName: data.displayName || data.username,
          bio: data.bio || ''
        });
      } else {
        console.error('Failed to fetch profile:', data);
        alert(`Failed to load profile: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      const targetUserId = userId || user?.id;

      const response = await fetch(API_URLS.USER_ACHIEVEMENTS(targetUserId), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      console.log('Achievements API response:', { status: response.status, data });

      if (response.ok) {
        // API returns { achievements: [...], unlockedCount, totalCount }
        // Extract the achievements array
        const achievementsList = data.achievements || [];
        console.log('Setting achievements:', achievementsList.length, 'items');
        setAchievements(achievementsList);
      } else {
        console.error('Failed to fetch achievements:', data);
        setAchievements([]);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setAchievements([]); // Set empty array on error
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      const response = await fetch(API_URLS.USER_PROFILE_UPDATE(user.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data);
        setEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(API_URLS.USER_AVATAR(user.id), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
        alert('Avatar uploaded successfully!');
      } else {
        alert('Failed to upload avatar: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Error uploading avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          <p>Profile not found</p>
          <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // Safely handle achievements array
  const safeAchievements = Array.isArray(achievements) ? achievements : [];
  const unlockedAchievements = safeAchievements.filter(a => a.unlocked);
  const totalAchievements = safeAchievements.length;

  return (
    <div className="profile-container">
      <header className="profile-header-bar">
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-back" onClick={() => navigate('/')}>
            🏠 Home
          </button>
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            <FiArrowLeft /> Back to Dashboard
          </button>
        </div>
        {isOwner && (
          <button className="btn-edit" onClick={() => setEditing(!editing)}>
            <FiEdit2 /> {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        )}
      </header>

      <div className="profile-content">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar-section">
            <div 
              className="profile-avatar-large"
              style={profile.avatarUrl 
                ? { backgroundImage: `url(${process.env.REACT_APP_API_URL || 'http://localhost:3000'}${profile.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { backgroundColor: '#667eea' }
              }
            >
              {!profile.avatarUrl && (profile.displayName?.charAt(0).toUpperCase() || profile.username?.charAt(0).toUpperCase())}
            </div>
            {isOwner && (
              <>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
                <button 
                  className="btn-change-avatar"
                  onClick={() => document.getElementById('avatar-upload').click()}
                  disabled={uploadingAvatar}
                >
                  <FiCamera /> {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                </button>
              </>
            )}
          </div>

          <div className="profile-info">
            {editing ? (
              <form onSubmit={handleUpdateProfile} className="edit-form">
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    maxLength={50}
                  />
                </div>
                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    maxLength={500}
                    rows={4}
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save">Save Changes</button>
                  <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className="profile-name">{profile.displayName || profile.username}</h1>
                <p className="profile-username">@{profile.username}</p>
                {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                
                <div className="profile-meta">
                  <div className="meta-item">
                    <span className="meta-label">Level</span>
                    <span className="meta-value">{profile.level || 1}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">XP</span>
                    <span className="meta-value">{profile.experience || 0}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Achievements</span>
                    <span className="meta-value">{unlockedAchievements.length}/{totalAchievements}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button 
            className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <FiTrendingUp /> Statistics
          </button>
          <button 
            className={`tab-button ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={async () => {
              setActiveTab('achievements');
              // Force check achievements when opening tab
              if (isOwner) {
                try {
                  const user = JSON.parse(localStorage.getItem('user'));
                  const token = localStorage.getItem('token');
                  const response = await fetch(API_URLS.USER_CHECK_ACHIEVEMENTS(user.id), {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  const data = await response.json();
                  console.log('Auto-check achievements:', data);
                  if (data.achievements && data.achievements.length > 0) {
                    console.log(`🏆 Unlocked: ${data.achievements.map(a => a.name).join(', ')}`);
                    // Refresh achievements
                    fetchAchievements();
                  }
                } catch (error) {
                  console.error('Error auto-checking achievements:', error);
                }
              }
            }}
          >
            <FiAward /> Achievements ({unlockedAchievements.length}/{totalAchievements})
          </button>
        </div>

        {/* Statistics Section */}
        {activeTab === 'stats' && (
          <div className="profile-section">
            <div className="section-header">
              <h2><FiTrendingUp /> Statistics</h2>
            </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-info">
                <div className="stat-value">{profile.stats?.quizzesCreated || 0}</div>
                <div className="stat-label">Quizzes Created</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🎮</div>
              <div className="stat-info">
                <div className="stat-value">{profile.stats?.gamesHosted || 0}</div>
                <div className="stat-label">Games Hosted</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <div className="stat-value">{profile.stats?.totalPlayersHosted || 0}</div>
                <div className="stat-label">Players Hosted</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-info">
                <div className="stat-value">{profile.stats?.wins || 0}</div>
                <div className="stat-label">Games Won</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-info">
                <div className="stat-value">{profile.stats?.totalPoints?.toLocaleString() || 0}</div>
                <div className="stat-label">Total Points</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <div className="stat-value">{profile.stats?.avgAccuracy || 0}%</div>
                <div className="stat-label">Avg Accuracy</div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Achievements Section */}
        {activeTab === 'achievements' && (
          <div className="profile-section">
          <div className="section-header">
            <h2><FiAward /> Achievements</h2>
          </div>

          <div className="achievements-grid">
            {safeAchievements.length === 0 ? (
              <p className="no-data">No achievements available yet</p>
            ) : (
              safeAchievements.map(achievement => (
                <div 
                  key={achievement.id} 
                  className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'} ${achievement.rarity}`}
                >
                  <div className="achievement-icon">{achievement.icon}</div>
                  <div className="achievement-info">
                    <h4 className="achievement-name">{achievement.name}</h4>
                    <p className="achievement-desc">{achievement.description}</p>
                    {!achievement.unlocked && (
                      <div className="achievement-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${achievement.progress}%` }}
                          />
                        </div>
                        <span className="progress-text">
                          {achievement.current}/{achievement.threshold}
                        </span>
                      </div>
                    )}
                    {achievement.unlocked && (
                      <span className="unlocked-date">
                        Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className={`rarity-badge ${achievement.rarity}`}>
                    {achievement.rarity}
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
