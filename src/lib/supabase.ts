import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vkkpbzeaodkxnhdrfunt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_applet_preview';

if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase Anon Key is missing. Set VITE_SUPABASE_ANON_KEY to enable live backend synchronization.');
}

// Use sessionStorage so the admin is forced to log in again if they close the tab/app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
