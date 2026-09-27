'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Profile } from '@/types';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  token: string | null;
  loading: boolean;
  isDemoUser: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, fullName: string) => Promise<void>;
  signInWithDemo: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER = {
  id: '11111111-2222-3333-4444-555555555555',
  email: 'demo.reviewer@company.com',
  user_metadata: {
    full_name: 'Demo Reviewer',
    name: 'Demo Reviewer',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
  }
};

const DEMO_PROFILE: Profile = {
  id: DEMO_USER.id,
  email: DEMO_USER.email,
  full_name: DEMO_USER.user_metadata.full_name,
  avatar_url: DEMO_USER.user_metadata.avatar_url,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      // 1. Check for Demo session in localStorage
      const savedDemo = typeof window !== 'undefined' ? localStorage.getItem('taskflow_demo_session') : null;
      if (savedDemo === 'true') {
        if (mounted) {
          setUser(DEMO_USER);
          setProfile(DEMO_PROFILE);
          setToken('demo-token');
          setIsDemoUser(true);
          setLoading(false);
        }
        return;
      }

      // 2. Check Supabase session if configured
      if (supabase && isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && mounted) {
            setUser(session.user);
            setToken(session.access_token);
            setIsDemoUser(false);

            // Sync profile with backend
            try {
              const synced = await api.syncProfile(session.access_token, session.user);
              if (mounted) setProfile(synced);
            } catch (err) {
              console.warn('[AuthContext] Backend sync warning:', err);
              // Fallback profile from user metadata
              if (mounted) {
                setProfile({
                  id: session.user.id,
                  email: session.user.email || '',
                  full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                  avatar_url: session.user.user_metadata?.avatar_url || '',
                });
              }
            }
          }
        } catch (error) {
          console.error('[AuthContext] Error getting session:', error);
        }

        // Listen for Supabase auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;

            if (session) {
              setUser(session.user);
              setToken(session.access_token);
              setIsDemoUser(false);
              try {
                const synced = await api.syncProfile(session.access_token, session.user);
                if (mounted) setProfile(synced);
              } catch (err) {
                console.warn('[AuthContext] Profile sync on change warning:', err);
              }
            } else if (!isDemoUser) {
              setUser(null);
              setProfile(null);
              setToken(null);
            }
            setLoading(false);
          }
        );

        if (mounted) setLoading(false);
        return () => subscription.unsubscribe();
      } else {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [isDemoUser]);

  // Google OAuth Login
  const signInWithGoogle = async () => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured yet with valid credentials in .env.local. Please provide your Supabase URL & Anon Key, or use the Demo Account to test immediately.'
      );
    }

    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[AuthContext] Google sign in error:', error.message);
      throw error;
    }
  };

  // Email / Password Login (via Supabase)
  const signInWithEmail = async (email: string, pass: string) => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) {
      throw error;
    }
    if (data.session) {
      setUser(data.user);
      setToken(data.session.access_token);
      setIsDemoUser(false);
      try {
        const synced = await api.syncProfile(data.session.access_token, data.user);
        setProfile(synced);
      } catch (err) {
        console.warn('Sync profile warning:', err);
      }
    }
  };

  // Email / Password Sign Up (via Supabase)
  const signUpWithEmail = async (email: string, pass: string, fullName: string) => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase client is not configured.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
          name: fullName,
        },
      },
    });
    if (error) {
      throw error;
    }
    if (data.session) {
      setUser(data.user);
      setToken(data.session.access_token);
      setIsDemoUser(false);
      try {
        const synced = await api.syncProfile(data.session.access_token, data.user);
        setProfile(synced);
      } catch (err) {
        console.warn('Sync profile warning:', err);
      }
    }
  };

  // Demo Login (Instant evaluation)
  const signInWithDemo = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taskflow_demo_session', 'true');
    }
    setUser(DEMO_USER);
    setProfile(DEMO_PROFILE);
    setToken('demo-token');
    setIsDemoUser(true);
    setLoading(false);
  };

  // Sign out
  const signOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('taskflow_demo_session');
    }
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setToken(null);
    setIsDemoUser(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        isDemoUser,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInWithDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
