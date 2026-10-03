import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vkkpbzeaodkxnhdrfunt.supabase.co';
// Isolamos a chamada da variável para o console conseguir ler o estado real dela durante o build
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const fallbackAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_applet_preview';

// Clean the Supabase URL to prevent PGRST125 errors in case of trailing slashes or /rest/v1 appends
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
const supabaseAnonKey = rawAnonKey || fallbackAnonKey;

// Diagnóstico no console do navegador para descobrirmos se o Vercel injetou a chave
console.log(
  "🛠️ Check de Compilação (Anon Key):",
  rawAnonKey ? "INJETADA COM SUCESSO!" : "FALHA: Continua Undefined no Vercel"
);

// A validação agora confere a constante isolada, garantindo que o fallback seja ativado se o Vercel falhar
export const isSupabaseConfigured = Boolean(
  rawAnonKey &&
  rawAnonKey !== fallbackAnonKey &&
  !rawAnonKey.includes('dummy')
);

if (!isSupabaseConfigured) {
  console.info('⚠️ Supabase anon key not set or using mock preview. Fallback catalog data is active for the storefront.');
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