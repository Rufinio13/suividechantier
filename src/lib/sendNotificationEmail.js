import { supabase } from '@/lib/supabaseClient';

/**
 * Envoie un email de notification à un artisan via la Edge Function Supabase.
 *
 * Types disponibles :
 * - 'nouvelle_tache'     → data: { artisanPrenom, aCompte, tacheNom, chantierNom, dateDebut?, dateFin?, description? }
 * - 'modification_tache' → data: { artisanPrenom, aCompte, tacheNom, chantierNom, ancienDebut, ancienneFin, dateDebut, dateFin }
 * - 'nouveau_document'   → data: { artisanPrenom, aCompte, nomFichier, chantierNom, typeDocument?, necessite_signature?, urlFichier? }
 * - 'non_conformite'     → data: { artisanPrenom, aCompte, pointControle, chantierNom, description?, photos?, plans?, dateReprise? }
 * - 'sav'                → data: { artisanPrenom, aCompte, titreSAV, chantierNom, description?, datePrevisionnelle? }
 *
 * aCompte: true  → bouton d'action affiché dans le mail
 * aCompte: false → bouton masqué (artisan sans compte)
 */
export async function sendNotificationEmail(type, to, data) {
  try {
    console.log(`📧 sendNotificationEmail type=${type} to=${to} aCompte=${data?.aCompte}`);

    const { error } = await supabase.functions.invoke('send-email', {
      body: { type, to, data },
    });

    if (error) {
      console.error('❌ Erreur envoi email:', error);
    } else {
      console.log('✅ Email envoyé avec succès');
    }
  } catch (err) {
    console.error('❌ Exception envoi email:', err);
  }
}

/**
 * Récupère les infos email d'un artisan (email + prénom + aCompte).
 * Vérifie d'abord si l'artisan a un compte (user_id → profiles),
 * sinon utilise l'email direct de la table soustraitants.
 *
 * @param artisan - L'objet sous-traitant depuis le contexte
 * @param supabaseClient - Instance supabase
 * @returns { email, prenom, aCompte } ou null
 */
export async function getArtisanEmailInfo(artisan, supabaseClient) {
  if (!artisan) return null;
  try {
    // ✅ A un compte → email depuis profiles
    if (artisan.user_id) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('mail, prenom')
        .eq('id', artisan.user_id)
        .single();
      if (profile?.mail) return {
        email: profile.mail,
        prenom: profile.prenom || artisan.PrenomST || artisan.nomsocieteST || 'Artisan',
        aCompte: true,
      };
    }
    // ✅ Pas de compte mais email renseigné dans soustraitants
    if (artisan.email) return {
      email: artisan.email,
      prenom: artisan.PrenomST || artisan.nomsocieteST || 'Artisan',
      aCompte: false,
    };
    return null;
  } catch {
    return null;
  }
}