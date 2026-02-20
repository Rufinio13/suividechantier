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

// ✅ Vérifier et rafraîchir la session si nécessaire
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
    
    // ✅ Rafraîchir si expire dans moins de 10 minutes
    if (timeUntilExpiry < 10 * 60 * 1000) {
      console.log('🔄 Session expire bientôt, rafraîchissement...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('❌ Erreur rafraîchissement:', refreshError);
        return false;
      }
      
      console.log('✅ Session rafraîchie avec succès');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Exception ensureValidSession:', err);
    return false;
  }
}

// ✅ WRAPPER : Vérifie la session avant toute opération
export async function supabaseWithSessionCheck(operation) {
  const sessionValid = await ensureValidSession();
  
  if (!sessionValid) {
    const error = new Error('Session expirée. Veuillez vous reconnecter.');
    console.error('❌', error.message);
    throw error;
  }
  
  return await operation();
}