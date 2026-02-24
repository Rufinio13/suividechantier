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
    storageKey: 'supabase.auth.token',
    debug: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'suivi-chantier-app',
    },
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
});

export async function setSupabaseRLSContext(nomsociete) {
  if (!nomsociete) {
    console.warn('⚠️ setSupabaseRLSContext appelé sans nomsociete');
    return;
  }

  try {
    const { error } = await supabase.rpc('set_config', {
      parameter: 'app.current_user_nomsociete',
      value: nomsociete
    });

    if (error) {
      console.error('❌ Erreur setSupabaseRLSContext:', error);
    } else {
      console.log('✅ RLS context défini:', nomsociete);
    }
  } catch (err) {
    console.error('❌ Exception setSupabaseRLSContext:', err);
  }
}

export async function ensureValidSession() {
  try {
    console.log('🔄 ensureValidSession appelé');
    
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('❌ Erreur rafraîchissement:', refreshError);
      return false;
    }
    
    if (!refreshData?.session) {
      console.error('❌ Pas de session après refresh');
      return false;
    }
    
    console.log('✅ Session rafraîchie avec succès');
    return true;
  } catch (err) {
    console.error('❌ Exception ensureValidSession:', err);
    return false;
  }
}

export async function supabaseWithSessionCheck(operation, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 Tentative ${attempt}/${retries}`);
      }
      
      const sessionValid = await ensureValidSession();
      
      if (!sessionValid) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`✅ Opération réussie (tentative ${attempt})`);
      }
      
      return result;
      
    } catch (err) {
      console.error(`❌ Erreur tentative ${attempt}:`, err.message);
      
      if (attempt === retries) {
        throw err;
      }
      
      if (err.message?.includes('Session expirée')) {
        throw err;
      }
      
      if (err.name === 'AbortError') {
        console.log('⏱️ Timeout détecté, retry...');
      }
      
      const waitTime = attempt * 1500;
      console.log(`⏳ Attente ${waitTime}ms avant retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}