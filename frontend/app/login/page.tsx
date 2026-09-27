'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CheckSquare, ShieldCheck, Mail, Users, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithDemo } = useAuth();
  const router = useRouter();
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    try {
      setAuthenticating(true);
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      setAuthenticating(false);
    }
  };

  const handleDemoLogin = () => {
    signInWithDemo();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="login-wrapper">
        <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Loading session...
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

        {/* Value Highlights */}
        <div className="feature-pill-list">
          <div className="feature-pill-item">
            <ShieldCheck size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <span>Google OAuth 2.0 with Gmail authentication</span>
          </div>
          <div className="feature-pill-item">
            <Users size={18} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
            <span>Assign tasks to team members seamlessly</span>
          </div>
          <div className="feature-pill-item">
            <Mail size={18} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
            <span>Automated Gmail notifications on creation & completion</span>
          </div>
        </div>

        {/* Google OAuth Login Button */}
        <button
          type="button"
          className="google-auth-btn"
          onClick={handleGoogleLogin}
          disabled={authenticating}
          id="google-login-btn"
        >
          {/* Official Google 'G' SVG icon */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{authenticating ? 'Connecting...' : 'Sign in with Google'}</span>
        </button>

        {/* Demo Login Button */}
        <button
          type="button"
          className="demo-login-btn"
          onClick={handleDemoLogin}
          id="demo-login-btn"
        >
          <span>Quick Evaluation Demo Account</span>
          <ArrowRight size={15} />
        </button>

        {/* Micro Footer */}
        <div style={{ marginTop: '28px', fontSize: '11px', color: 'var(--text-muted)' }}>
          Supabase PostgreSQL &bull; Flask REST API &bull; Next.js &bull; Gmail SMTP
        </div>
      </div>
    </div>
  );
}
