import { createClient } from '@supabase/supabase-js';

// ✅ Récupère les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// ✅ Crée le client Supabase avec configuration optimale
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.localStorage,        // ✅ Utilise localStorage pour persister même après fermeture
    autoRefreshToken: true,              // ✅ Rafraîchir automatiquement le token
    persistSession: true,                // ✅ Persister la session
    detectSessionInUrl: true,            // ✅ Détecter la session dans l'URL
    flowType: 'pkce',                    // ✅ Utiliser PKCE pour plus de sécurité
    storageKey: 'supabase.auth.token',   // ✅ Clé de stockage
    debug: false,                        // ✅ Mettre à true pour debug
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

/**
 * Configure le paramètre RLS pour le multi-tenant
 * Doit être appelé après la connexion de l'utilisateur
 */
export async function setSupabaseRLSContext(nomsociete) {
  if (!nomsociete) {
    console.warn('⚠️ setSupabaseRLSContext appelé sans nomsociete');
    return;
  }

  try {
    // Définir le paramètre de session pour RLS
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

/**
 * ✅ NOUVEAU : Vérifier et rafraîchir la session si nécessaire
 */
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
    
    // Vérifier si le token expire bientôt (dans moins de 5 minutes)
    const expiresAt = session.expires_at * 1000; // Convertir en millisecondes
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