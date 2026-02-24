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
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 secondes
      
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

// ✅ NOUVEAU : Fonction pour "réveiller" la connexion
async function pingSupabase() {
  try {
    await supabase.from('profiles').select('count').limit(1).single();
  } catch (err) {
    // On ignore l'erreur, on veut juste réveiller la connexion
  }
}

export async function supabaseWithSessionCheck(operation, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Session expirée');
      }
      
      // ✅ NOUVEAU : Ping avant l'opération si c'est un retry
      if (attempt > 1) {
        console.log('🏓 Ping Supabase avant retry...');
        await pingSupabase();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return await operation();
      
    } catch (err) {
      if (attempt < retries && (err.name === 'AbortError' || err.code === 'PGRST301')) {
        console.log(`⏳ Erreur réseau, retry ${attempt + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      throw err;
    }
  }
}