import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

let supabaseInstance = null;
let lastActivityTime = Date.now();

// ✅ Créer une nouvelle instance du client
function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: window.sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      fetch: (url, options = {}) => {
        lastActivityTime = Date.now();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      },
    },
  });
}

// ✅ Obtenir le client (avec réinitialisation si inactif trop longtemps)
function getSupabaseClient() {
  const now = Date.now();
  const inactivityDuration = now - lastActivityTime;
  
  // Si inactif depuis plus de 5 minutes, recréer le client
  if (inactivityDuration > 5 * 60 * 1000 || !supabaseInstance) {
    console.log('🔄 Réinitialisation du client Supabase après', Math.round(inactivityDuration / 1000), 'secondes d\'inactivité');
    supabaseInstance = createSupabaseClient();
    lastActivityTime = now;
  }
  
  return supabaseInstance;
}

// ✅ Export avec getter
export const supabase = new Proxy({}, {
  get(target, prop) {
    return getSupabaseClient()[prop];
  }
});

// Exposer globalement pour debugging
if (typeof window !== 'undefined') {
  window.supabase = supabase;
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

export async function supabaseWithSessionCheck(operation, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Session expirée');
      }
      
      return await operation();
      
    } catch (err) {
      if (attempt < retries && (err.name === 'AbortError' || err.code === 'PGRST301')) {
        console.log(`⏳ Timeout, retry ${attempt + 1}/${retries}...`);
        
        // ✅ Forcer réinitialisation du client avant retry
        lastActivityTime = 0;
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      throw err;
    }
  }
}