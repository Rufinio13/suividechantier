import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// ✅ Fonction pour créer un nouveau client
function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: window.sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    realtime: {
      enabled: false, // Désactiver Realtime
    },
  });
}

// ✅ Export du client (mutable)
export let supabase = createSupabaseClient();

// ✅ Fonction pour recréer le client
export function recreateSupabaseClient() {
  console.log('🔄 RECRÉATION COMPLÈTE du client Supabase...');
  
  // Détruire l'ancien client
  if (supabase) {
    try {
      // Supprimer tous les canaux potentiels
      if (supabase.removeAllChannels) {
        supabase.removeAllChannels();
      }
    } catch (err) {
      console.warn('⚠️ Erreur nettoyage ancien client:', err);
    }
  }
  
  // Créer un nouveau client
  supabase = createSupabaseClient();
  
  if (typeof window !== 'undefined') {
    window.supabase = supabase;
  }
  
  console.log('✅ Nouveau client Supabase créé');
  return supabase;
}

// ✅ Système de surveillance et reconnexion
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  
  let lastVisibleTime = Date.now();
  let isRecreating = false;
  
  // ✅ Listener visibilitychange
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
      lastVisibleTime = Date.now();
      console.log('👋 Page cachée à', new Date().toLocaleTimeString());
    } 
    else if (document.visibilityState === 'visible') {
      const timeAway = Date.now() - lastVisibleTime;
      const minutesAway = Math.round(timeAway / 60000);
      
      console.log(`👀 Page visible après ${minutesAway} minute(s) d'absence`);
      
      // ✅ Si absent > 30 secondes, recréer le client
      if (timeAway > 30000 && !isRecreating) {
        isRecreating = true;
        
        console.log(`⏰ Absence de ${minutesAway} min → Recréation du client...`);
        recreateSupabaseClient();
        
        // Attendre que le client se stabilise
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Déclencher un événement pour que les Contexts rechargent
        window.dispatchEvent(new Event('supabase-reconnected'));
        
        isRecreating = false;
      }
    }
  });
  
  // ✅ Listener focus (backup si visibilitychange ne se déclenche pas)
  window.addEventListener('focus', async () => {
    const timeAway = Date.now() - lastVisibleTime;
    
    if (timeAway > 30000 && !isRecreating) {
      isRecreating = true;
      
      console.log('🔄 Focus après absence → Recréation du client...');
      recreateSupabaseClient();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.dispatchEvent(new Event('supabase-reconnected'));
      
      isRecreating = false;
    }
  });
}