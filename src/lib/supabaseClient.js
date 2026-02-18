import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// ✅ Utiliser sessionStorage au lieu de localStorage
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.sessionStorage,        // ✅ Session effacée à la fermeture du navigateur
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
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Erreur getSession:', error);
      return false;
    }
    
    if (!session) {
      console.warn('⚠️ Pas de session active');
      return false;
    }
    
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log('🔄 Token expire bientôt, rafraîchissement...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('❌ Erreur rafraîchissement:', refreshError);
        return false;
      }
      
      console.log('✅ Session rafraîchie');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Exception ensureValidSession:', err);
    return false;
  }
}