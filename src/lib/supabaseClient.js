import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

let supabaseInstance = null;
let lastRequestTime = Date.now();
let isReconnecting = false;

function createSupabaseClient() {
  console.log('🔧 Création nouvelle instance Supabase client');
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: window.sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      fetch: async (url, options = {}) => {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        
        // ✅ Si plus de 3 minutes depuis la dernière requête, attendre un peu
        if (timeSinceLastRequest > 3 * 60 * 1000) {
          console.log(`⏱️ Inactivité détectée (${Math.round(timeSinceLastRequest / 1000)}s), attente 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        lastRequestTime = now;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error('⏱️ TIMEOUT après 20 secondes');
          controller.abort();
        }, 20000); // ✅ Réduit à 20 secondes
        
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            // ✅ Forcer de nouveaux headers pour éviter le cache
            headers: {
              ...options.headers,
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          });
          
          clearTimeout(timeoutId);
          return response;
          
        } catch (err) {
          clearTimeout(timeoutId);
          
          if (err.name === 'AbortError') {
            console.error('❌ Requête timeout, reconnexion nécessaire');
          }
          
          throw err;
        }
      },
    },
  });
}

function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

// ✅ Fonction pour forcer une reconnexion
async function forceReconnect() {
  if (isReconnecting) {
    console.log('⏳ Reconnexion déjà en cours...');
    return;
  }
  
  isReconnecting = true;
  console.log('🔄 FORCE RECONNECT : Destruction et recréation du client');
  
  try {
    // Détruire l'ancienne instance
    if (supabaseInstance) {
      supabaseInstance = null;
    }
    
    // Attendre 1 seconde
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Créer nouvelle instance
    supabaseInstance = createSupabaseClient();
    lastRequestTime = Date.now();
    
    console.log('✅ Client Supabase recréé');
    
  } finally {
    isReconnecting = false;
  }
}

export const supabase = new Proxy({}, {
  get(target, prop) {
    return getSupabaseClient()[prop];
  }
});

if (typeof window !== 'undefined') {
  window.supabase = supabase;
  window.forceReconnect = forceReconnect; // ✅ Exposer pour tests
}

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

export async function supabaseWithSessionCheck(operation, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // ✅ Si retry, forcer reconnexion
      if (attempt > 1) {
        console.log(`🔄 Retry ${attempt}/${retries} - Force reconnect`);
        await forceReconnect();
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Session expirée');
      }
      
      return await operation();
      
    } catch (err) {
      console.error(`❌ Tentative ${attempt} échouée:`, err.message);
      
      if (attempt === retries) {
        throw err;
      }
      
      // Attendre avant retry
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
}