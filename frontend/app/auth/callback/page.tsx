'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuthCallback() {
      if (supabase) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.error('[Callback] Auth error:', error.message);
          }

          if (session) {
            // Synchronize authenticated Google profile to database via Flask backend
            try {
              await api.syncProfile(session.access_token, session.user);
            } catch (syncErr) {
              console.warn('[Callback] Backend sync warning:', syncErr);
            }
          }
        } catch (err) {
          console.error('[Callback] Processing error:', err);
        }
      }

      // Redirect to main dashboard
      router.replace('/');
    }

    handleAuthCallback();
  }, [router]);

  return (
    <div className="login-wrapper">
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
          Authenticating with Google...
        </div>
        <p style={{ fontSize: '14px' }}>Finalizing your secure session and redirecting to TaskFlow.</p>
      </div>
    </div>
  );
}
