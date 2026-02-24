import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 secondes
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
});

export async function setSupabaseRLSContext(nomsociete) {
  if (!nomsociete) return;

  try {
    await supabase.rpc('set_config', {
      parameter: 'app.current_user_nomsociete',
      value: nomsociete
    });
  } catch (err) {
    console.error('❌ Erreur RLS context:', err);
  }
}

export async function supabaseWithSessionCheck(operation, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // ✅ Laisser Supabase gérer le refresh automatiquement
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Session expirée');
      }
      
      // ✅ Exécuter l'opération directement
      return await operation();
      
    } catch (err) {
      // ✅ Retry SEULEMENT si timeout réseau
      if (attempt < retries && err.name === 'AbortError') {
        console.log(`⏳ Timeout, retry ${attempt + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // ✅ Sinon, propager l'erreur
      throw err;
    }
  }
}