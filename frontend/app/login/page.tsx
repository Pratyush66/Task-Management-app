'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { CheckSquare, ShieldCheck, Mail, Users, ArrowRight, AlertCircle, KeyRound, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithDemo } = useAuth();
  const router = useRouter();

  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('shadowknight06606@gmail.com');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('Pratyush');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      setMessage({
        text: 'Supabase credentials are not configured yet in .env.local.',
        type: 'error',
      });
      return;
    }

    try {
      setAuthenticating(true);
      setMessage(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setMessage({
        text: err.message || 'Google OAuth is not configured yet in Supabase Auth Providers.',
        type: 'error',
      });
      setAuthenticating(false);
    }
  };

  // Direct Supabase Email Login / Sign Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ text: 'Please provide both email and password.', type: 'error' });
      return;
    }

    setAuthenticating(true);
    setMessage(null);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, fullName);
        setMessage({
          text: 'Account created! If email confirmation is enabled, please check your inbox.',
          type: 'success',
        });
      } else {
        await signInWithEmail(email, password);
        router.push('/');
      }
    } catch (err: any) {
      // If user doesn't exist yet, offer to sign up
      if (err.message && err.message.toLowerCase().includes('invalid login credentials')) {
        setMessage({
          text: 'Invalid credentials. If this is your first time, click "Create Account" below to register.',
          type: 'error',
        });
      } else {
        setMessage({ text: err.message || 'Authentication failed.', type: 'error' });
      }
    } finally {
      setAuthenticating(false);
    }
  };

  // Instant Demo Account
  const handleDemoLogin = () => {
    signInWithDemo();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="login-wrapper">
        <div style={{ color: 'var(--c-indigo)', fontSize: '1.1rem', fontWeight: 700 }}>
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Brand Icon Box */}
        <div className="login-icon-box">
          <CheckSquare size={34} />
        </div>

        {/* Heading */}
        <h1 className="login-title">TaskFlow</h1>
        <p className="login-subtitle">
          Collaborative task management with Google OAuth & automated Gmail notifications.
        </p>

        {/* Status / Error Banner */}
        {message && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: '20px',
              background: message.type === 'error' ? 'rgba(218, 61, 32, 0.08)' : 'rgba(61, 69, 170, 0.08)',
              border: `1.5px solid ${message.type === 'error' ? 'var(--c-crimson)' : 'var(--c-indigo)'}`,
              borderRadius: 'var(--radius-md)',
              color: message.type === 'error' ? 'var(--c-crimson)' : 'var(--c-indigo)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              textAlign: 'left',
              lineHeight: '1.4',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{message.text}</div>
          </div>
        )}

        {/* Auth Mode Toggle Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border-light)' }}>
          <button
            type="button"
            className={`filter-tab ${authMode === 'google' ? 'active' : ''}`}
            onClick={() => { setAuthMode('google'); setMessage(null); }}
            style={{ flex: 1, textAlign: 'center' }}
          >
            Google OAuth
          </button>
          <button
            type="button"
            className={`filter-tab ${authMode === 'email' ? 'active' : ''}`}
            onClick={() => { setAuthMode('email'); setMessage(null); }}
            style={{ flex: 1, textAlign: 'center' }}
          >
            Email Login
          </button>
        </div>

        {/* Mode 1: Google OAuth */}
        {authMode === 'google' && (
          <div>
            <div className="feature-pill-list">
              <div className="feature-pill-item">
                <ShieldCheck size={18} style={{ color: 'var(--c-indigo)', flexShrink: 0 }} />
                <span>Google OAuth 2.0 with Gmail authentication</span>
              </div>
              <div className="feature-pill-item">
                <Users size={18} style={{ color: 'var(--c-tangerine)', flexShrink: 0 }} />
                <span>Assign tasks to team members seamlessly</span>
              </div>
              <div className="feature-pill-item">
                <Mail size={18} style={{ color: 'var(--c-crimson)', flexShrink: 0 }} />
                <span>Automated Gmail notifications on creation & completion</span>
              </div>
            </div>

            <button
              type="button"
              className="google-auth-btn"
              onClick={handleGoogleLogin}
              disabled={authenticating}
              id="google-login-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>{authenticating ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </div>
        )}

        {/* Mode 2: Direct Supabase Email */}
        {authMode === 'email' && (
          <form onSubmit={handleEmailAuth} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
            {isSignUp && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Pratyush"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={authenticating}
            >
              <LogIn size={16} />
              <span>{authenticating ? 'Authenticating...' : isSignUp ? 'Create Supabase Account' : 'Sign In'}</span>
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isSignUp ? (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(false); setMessage(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--c-indigo)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Sign In
                  </button>
                </span>
              ) : (
                <span>
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(true); setMessage(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--c-indigo)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Create Account
                  </button>
                </span>
              )}
            </div>
          </form>
        )}

        {/* Demo Login Button */}
        <button
          type="button"
          className="demo-login-btn"
          onClick={handleDemoLogin}
          id="demo-login-btn"
        >
          <span>Quick Evaluation Demo Account</span>
          <ArrowRight size={16} />
        </button>

        {/* Micro Footer */}
        <div style={{ marginTop: '28px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Supabase PostgreSQL &bull; Flask REST API &bull; Next.js &bull; Gmail SMTP
        </div>
      </div>
    </div>
  );
}
