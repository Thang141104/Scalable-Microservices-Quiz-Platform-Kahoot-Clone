// 🧪 PIPELINE TEST: Full build all services
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import Dashboard from './pages/Dashboard';
import QuizBuilder from './pages/QuizBuilder';
import GameHistory from './pages/GameHistory';
import Join from './pages/Join';
import LobbyHost from './pages/LobbyHost';
import LobbyPlayer from './pages/LobbyPlayer';
import LiveControl from './pages/LiveControl';
import Answering from './pages/Answering';
import Feedback from './pages/Feedback';
import EndGameNew from './pages/EndGameNew';
import Profile from './pages/Profile';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quiz/builder/:id?" element={<QuizBuilder />} />
          <Route path="/game/history" element={<GameHistory />} />
          <Route path="/join" element={<Join />} />
          <Route path="/lobby/host/:pin" element={<LobbyHost />} />
          <Route path="/lobby/player/:pin" element={<LobbyPlayer />} />
          <Route path="/live/control/:pin" element={<LiveControl />} />
          <Route path="/live/answer/:pin" element={<Answering />} />
          <Route path="/live/feedback/:pin" element={<Feedback />} />
          <Route path="/game/end/:pin" element={<EndGameNew />} />
          <Route path="/profile/:userId?" element={<Profile />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
