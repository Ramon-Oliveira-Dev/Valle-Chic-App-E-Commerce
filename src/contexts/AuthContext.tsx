import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  loginAsAdmin: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const createMockSession = (email: string): Session => {
    const mockUser: User = {
      id: 'admin-' + btoa(email || 'admin').replace(/=/g, '').slice(0, 12),
      app_metadata: { provider: 'email', role: 'admin' },
      user_metadata: { full_name: 'Ramon Oliveira (Administrador)', name: 'Ramon Oliveira' },
      aud: 'authenticated',
      confirmation_sent_at: '',
      recovery_sent_at: '',
      email_change_sent_at: '',
      new_email: '',
      invited_at: '',
      action_link: '',
      email: email || 'ramon.oliveira.developer@gmail.com',
      phone: '',
      created_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      phone_confirmed_at: '',
      last_sign_in_at: new Date().toISOString(),
      role: 'authenticated',
      updated_at: new Date().toISOString(),
      identities: [],
      factors: []
    };

    return {
      access_token: 'local-admin-preview-token',
      token_type: 'bearer',
      expires_in: 86400,
      refresh_token: 'local-admin-refresh-token',
      user: mockUser,
      expires_at: Math.floor(Date.now() / 1000) + 86400
    };
  };

  const loginAsAdmin = (email: string) => {
    const mockSession = createMockSession(email);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('vc_admin_session', JSON.stringify(mockSession));
      }
    } catch (e) {
      console.warn('Could not persist admin session to sessionStorage:', e);
    }
    setSession(mockSession);
    setUser(mockSession.user);
    setLoading(false);
  };

  useEffect(() => {
    // Check if there is an active local admin session
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const localSessStr = sessionStorage.getItem('vc_admin_session');
        if (localSessStr) {
          const parsed = JSON.parse(localSessStr) as Session;
          if (parsed && parsed.user) {
            setSession(parsed);
            setUser(parsed.user);
            setLoading(false);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Error reading local admin session:', e);
    }

    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    // Clear any old localStorage tokens
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      console.error('Error clearing old local storage:', e);
    }

    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      console.error('Unexpected error getting session:', err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('vc_admin_session');
      }
    } catch {}

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, loginAsAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
