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
});

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
      if (attempt < retries) {
        console.log(`⏳ Retry ${attempt + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      throw err;
    }
  }
}