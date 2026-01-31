import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API_URLS from '../config/api';
import './VerifyOTP.css';

function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, email, username } = location.state || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!userId) {
      navigate('/register');
      return;
    }

    // Timer countdown
    if (timer > 0 && !canResend) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [timer, canResend, userId, navigate]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }

    // Auto-submit when all fields filled
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Check if pasted data is 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      document.getElementById('otp-5').focus();
      // Auto-submit
      setTimeout(() => handleVerify(pastedData), 100);
    }
  };

  const handleVerify = async (otpCode = otp.join('')) => {
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(API_URLS.VERIFY_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          otp: otpCode
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Email verified successfully! Redirecting...');
        
        // Save token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Navigate to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(data.message || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0').focus();
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(API_URLS.RESEND_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('OTP resent successfully! Check your email.');
        setTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0').focus();
      } else {
        setError(data.message || 'Failed to resend OTP');
      }
    } catch (err) {
      console.error('Resend error:', err);
      setError('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="verify-otp-container">
      <div className="verify-otp-box">
        <div className="verify-otp-header">
          <div className="email-icon">📧</div>
          <h2>Verify Your Email</h2>
          <p>We've sent a 6-digit code to</p>
          <p className="email-highlight">{email}</p>
        </div>

        <div className="otp-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="otp-inputs" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="otp-input"
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <button 
            onClick={() => handleVerify()}
            className="btn-verify"
            disabled={loading || otp.some(digit => !digit)}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <div className="resend-section">
            {!canResend ? (
              <p className="timer-text">
                Resend code in <span className="timer">{timer}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="btn-resend"
                disabled={resending}
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </div>

          <div className="verify-otp-footer">
            <button 
              onClick={() => navigate('/register')}
              className="link-button"
            >
              ← Back to Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyOTP;
