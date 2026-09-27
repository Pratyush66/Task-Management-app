'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('Finalizing secure authentication...');

  useEffect(() => {
    async function handleAuthCallback() {
      if (supabase) {
        try {
          let activeSession = null;

          // 1. Check for PKCE Authorization Code in query params
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');

          if (code) {
            setStatusMessage('Exchanging authorization code with Supabase...');
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('[Callback] exchangeCodeForSession error:', error.message);
            } else if (data?.session) {
              activeSession = data.session;
            }
          }

          // 2. Fallback to getSession (handles hash fragments / persisted sessions)
          if (!activeSession) {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
              console.error('[Callback] getSession error:', error.message);
            } else if (session) {
              activeSession = session;
            }
          }

          // 3. Synchronize user profile with Flask backend
          if (activeSession) {
            setStatusMessage('Synchronizing user profile...');
            try {
              await api.syncProfile(activeSession.access_token, activeSession.user);
            } catch (syncErr) {
              console.warn('[Callback] Backend sync warning:', syncErr);
            }
          }
        } catch (err) {
          console.error('[Callback] Processing error:', err);
        }
      }

      // 4. Redirect to main task dashboard
      router.replace('/');
    }

    handleAuthCallback();
  }, [router]);

  return (
    <div className="login-wrapper">
      <div style={{ textAlign: 'center', color: 'var(--c-indigo)', padding: '24px' }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--c-black)', marginBottom: '10px' }}>
          Welcome to TaskFlow!
        </div>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
          {statusMessage}
        </p>
      </div>
    </div>
  );
}
