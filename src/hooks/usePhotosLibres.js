// Photos ajoutées directement par les artisans dans l'onglet Photos (table photos_chantier).
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { auteurPhoto } from '@/lib/photoAuteur';

const BUCKET = 'photos-taches';

export function usePhotosLibres(chantierId) {
  const { profile } = useAuth();
  const [photosLibres, setPhotosLibres] = useState([]);
  const [chargement, setChargement] = useState(false);

  const recharger = useCallback(async () => {
    if (!chantierId) return;
    setChargement(true);
    const { data, error } = await supabase
      .from('photos_chantier')
      .select('*')
      .eq('chantier_id', chantierId)
      .order('created_at', { ascending: false });
    // Table absente (migration non exécutée) : on ignore sans bloquer l'onglet
    if (error) console.error('❌ Erreur chargement photos_chantier :', error);
    else setPhotosLibres(data || []);
    setChargement(false);
  }, [chantierId]);

  useEffect(() => { recharger(); }, [recharger]);

  // Upload de plusieurs fichiers pour un artisan, avec lot et commentaire communs
  const ajouterPhotos = useCallback(async (files, { soustraitantId, lotId = null, commentaire = '' }) => {
    const auteur = auteurPhoto(profile);
    const lignes = [];
    for (const file of files) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const chemin = `chantiers/${chantierId}/${uuidv4()}.${ext}`;
      const { error: errUpload } = await supabase.storage.from(BUCKET).upload(chemin, file, { cacheControl: '3600', upsert: false });
      if (errUpload) throw errUpload;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(chemin);
      lignes.push({
        chantier_id: chantierId,
        soustraitant_id: soustraitantId,
        lot_id: lotId || null,
        url: urlData.publicUrl,
        nom: file.name,
        commentaire: commentaire || null,
        auteur_nom: auteur.auteur_nom,
      });
    }
    if (!lignes.length) return [];
    const { data, error } = await supabase.from('photos_chantier').insert(lignes).select();
    if (error) throw error;
    setPhotosLibres((prev) => [...(data || []), ...prev]);
    return data;
  }, [chantierId, profile]);

  const changerLotPhotoLibre = useCallback(async (id, lotId) => {
    const { data, error } = await supabase
      .from('photos_chantier')
      .update({ lot_id: lotId || null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setPhotosLibres((prev) => prev.map((p) => (p.id === id ? data : p)));
  }, []);

  const supprimerPhotoLibre = useCallback(async (photo) => {
    const { error } = await supabase.from('photos_chantier').delete().eq('id', photo.id);
    if (error) throw error;
    const chemin = (photo.url || '').split(`/${BUCKET}/`)[1]?.split('?')[0];
    if (chemin) {
      const { error: errStorage } = await supabase.storage.from(BUCKET).remove([decodeURIComponent(chemin)]);
      if (errStorage) console.error('Erreur suppression fichier photo :', errStorage);
    }
    setPhotosLibres((prev) => prev.filter((p) => p.id !== photo.id));
  }, []);

  return { photosLibres, chargement, recharger, ajouterPhotos, changerLotPhotoLibre, supprimerPhotoLibre };
}
