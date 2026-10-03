import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vkkpbzeaodkxnhdrfunt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_applet_preview';

// Clean the Supabase URL to prevent PGRST125 errors in case of trailing slashes or /rest/v1 appends in process/env vars
const sanitizeSupabaseUrl = (url: string) => {
  let cleanUrl = url.trim();
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  if (cleanUrl.endsWith('/rest/v1')) {
    cleanUrl = cleanUrl.slice(0, -8);
  }
  return cleanUrl;
};

const supabaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'dummy_anon_key_for_applet_preview' &&
  !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('dummy')
);

if (!isSupabaseConfigured) {
  console.info('Supabase anon key not set or using mock preview. Fallback catalog data is active for the storefront.');
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
