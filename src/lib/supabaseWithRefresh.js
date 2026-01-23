import { supabase } from './supabaseClient';

// ✅ Wrapper pour toutes les requêtes Supabase
export async function supabaseQuery(queryFn) {
  try {
    // Exécuter la requête
    const result = await queryFn();
    
    // Si erreur d'authentification, rafraîchir et réessayer
    if (result.error && (
      result.error.message?.includes('JWT') ||
      result.error.message?.includes('expired') ||
      result.error.code === 'PGRST301'
    )) {
      console.warn('⚠️ Token expiré, rafraîchissement...');
      
      const { error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('❌ Impossible de rafraîchir la session:', refreshError);
        // Rediriger vers la page de connexion
        window.location.href = '/login';
        throw refreshError;
      }
      
      console.log('✅ Session rafraîchie, nouvelle tentative...');
      return await queryFn();
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erreur supabaseQuery:', error);
    throw error;
  }
}

// Exemple d'utilisation :
// const { data, error } = await supabaseQuery(() =>
//   supabase.from('chantiers').select('*')
// );