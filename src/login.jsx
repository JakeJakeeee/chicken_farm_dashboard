import React, { useState } from 'react';

const NODE_RED_BASE_URL = `http://${window.location.hostname || 'localhost'}:1880`;

// Native SHA-256 Password Hashing Function
async function hashPassword(plainTextPassword) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainTextPassword);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function Login({ onLoginSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('operator');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    if (isRegisterMode && password !== confirmPassword) {
      setErrorMsg('Passwords do not match!');
      return;
    }

    if (isRegisterMode && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Hash password with SHA-256 before sending to Node-RED SQLite
      const passwordHash = await hashPassword(password);

      if (isRegisterMode) {
        // 1. REGISTER NEW USER IN SQLITE
        const res = await fetch(`${NODE_RED_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUsername,
            password_hash: passwordHash,
            role: role
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setErrorMsg(data.message || 'Registration failed. Username may already exist.');
        } else {
          setSuccessMsg(`Account "${cleanUsername}" (${role}) created! You can now sign in.`);
          setIsRegisterMode(false);
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        // 2. SIGN IN VIA SQLITE
        const res = await fetch(`${NODE_RED_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUsername,
            password_hash: passwordHash
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setErrorMsg(data.message || 'Access Denied: Invalid username or password.');
        } else {
          // Save session in localStorage and unlock App.jsx
          localStorage.setItem('farmAuthUser', JSON.stringify(data.user));
          if (onLoginSuccess) {
            onLoginSuccess(data.user);
          }
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMsg('Cannot connect to Node-RED SQLite server at port 1880.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="dashboard-container"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#F8FAFC',
        padding: '20px'
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '36px 32px',
          borderRadius: '14px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
          textAlign: 'center',
          width: '100%',
          maxWidth: '380px',
          border: '1px solid #E2E8F0'
        }}
      >
        <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>🐔</div>
        <h2 style={{ margin: '0 0 6px 0', color: '#0F172A' }}>
          {isRegisterMode ? 'Register Account' : 'Farm Portal Login'}
        </h2>
        <p style={{ color: '#64748B', marginBottom: '20px', fontSize: '0.9rem' }}>
          Chicken Farm Telemetry System (SQLite Auth)
        </p>

        {/* MODE SWITCH TABS */}
        <div
          style={{
            display: 'flex',
            background: '#F1F5F9',
            borderRadius: '8px',
            padding: '4px',
            marginBottom: '20px'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: !isRegisterMode ? 'white' : 'transparent',
              color: !isRegisterMode ? '#032B5E' : '#64748B',
              boxShadow: !isRegisterMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: isRegisterMode ? 'white' : 'transparent',
              color: isRegisterMode ? '#032B5E' : '#64748B',
              boxShadow: isRegisterMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Register User
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Username
            </label>
            <input
              type="text"
              required
              placeholder="e.g. jiaming_admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.92rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.92rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {isRegisterMode && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.92rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  User Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.92rem',
                    backgroundColor: 'white',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="admin">Admin (Full Control)</option>
                  <option value="operator">Farm Operator (Standard)</option>
                  <option value="supervisor">Supervisor / Viewer</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '11px',
              backgroundColor: '#032B5E',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting
              ? isRegisterMode
                ? 'Registering...'
                : 'Signing in...'
              : isRegisterMode
              ? 'Create Account'
              : 'Sign In'}
          </button>
        </form>

        {errorMsg && (
          <div
            style={{
              color: '#B91C1C',
              background: '#FEE2E2',
              padding: '10px 12px',
              borderRadius: '8px',
              marginTop: '16px',
              fontSize: '0.84rem',
              fontWeight: 600
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              color: '#15803D',
              background: '#DCFCE7',
              padding: '10px 12px',
              borderRadius: '8px',
              marginTop: '16px',
              fontSize: '0.84rem',
              fontWeight: 600
            }}
          >
            {successMsg}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;