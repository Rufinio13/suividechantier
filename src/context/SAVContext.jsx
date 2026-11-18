// src/context/SAVContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const SAVContext = createContext();

export const nouvelIdSAV = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function SAVProvider({ children }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [demandesSAV, setDemandesSAV] = useState([]);

  // CHARGEMENT (sans wrapper - c'est juste une lecture)
  const loadSAV = useCallback(async () => {
    if (!profile?.nomsociete) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("sav")
      .select("*")
      .eq("nomsociete", profile.nomsociete)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur loadSAV:", error);
    } else {
      setDemandesSAV(data || []);
      console.log(`✅ ${data?.length || 0} SAV chargées pour`, profile.nomsociete);
    }

    setLoading(false);
  }, [profile?.nomsociete]);

  // ✅ AJOUTER (AVEC wrapper)
  const addSAV = async (savData) => {
    
      if (!profile?.nomsociete || !user) return;

      const descriptionsJSON = JSON.stringify(savData.descriptions || []);

      const payload = {
        nomClient: savData.nomClient,
        description: descriptionsJSON,
        soustraitant_id: savData.soustraitant_id || null,
        dateOuverture: savData.dateOuverture || new Date().toISOString(),
        datePrevisionnelle: savData.datePrevisionnelle || null,
        constructeur_valide: savData.constructeur_valide || false,
        constructeur_valide_date: savData.constructeur_valide_date || null,
        nomsociete: profile.nomsociete,
      };

      const { data, error } = await supabase
        .from("sav")
        .insert([payload])
        .select("*")
        .single();

      if (error) {
        console.error("❌ Erreur insertion SAV Supabase :", error);
        throw error;
      }

      setDemandesSAV((prev) => [data, ...prev]);
      return data;
    
  };

  // ✅ METTRE À JOUR (AVEC wrapper)
  const updateSAV = async (id, updates) => {
    
      if (updates.descriptions) {
        updates.description = JSON.stringify(updates.descriptions);
        delete updates.descriptions;
      }

      const { data, error } = await supabase
        .from("sav")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        console.error("❌ Erreur update SAV:", error);
        throw error;
      }

      setDemandesSAV((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s))
      );

      return data;
  
  };

  // ✅ TOGGLE LIGNE (AVEC wrapper)
  const toggleDescriptionLigne = async (savId, ligneIndex) => {
    
      const sav = demandesSAV.find(s => s.id === savId);
      if (!sav) return;

      let descriptions = [];
      try {
        descriptions = typeof sav.description === 'string' 
          ? JSON.parse(sav.description) 
          : sav.description;
      } catch {
        descriptions = [{ texte: sav.description, checked: false }];
      }

      descriptions[ligneIndex].checked = !descriptions[ligneIndex].checked;

      await updateSAV(savId, {
        description: JSON.stringify(descriptions)
      });

  };

  const auteur = profile?.nom || user?.email || 'Utilisateur';

  // ✅ TÂCHES D'UN SAV (JSON dans `description`)
  // Relit la version en base avant d'écrire, pour ne pas écraser une modification
  // faite entre-temps par un autre utilisateur.
  const modifierLignesSAV = async (savId, transformer) => {
    const { data, error } = await supabase.from("sav").select("description").eq("id", savId).single();
    if (error) throw error;

    let lignes;
    try {
      lignes = typeof data?.description === 'string' ? JSON.parse(data.description) : data?.description;
    } catch {
      lignes = null;
    }
    if (!Array.isArray(lignes)) lignes = data?.description ? [{ texte: String(data.description), checked: false }] : [];

    return updateSAV(savId, { description: JSON.stringify(transformer(lignes)) });
  };

  // ✅ RÉPONSES PAR TÂCHE (constructeur uniquement, non affichées à l'artisan)
  const addReponseSAV = async (savId, ligneId, ligneIndex, texte) => {
    const nouvelle = { id: nouvelIdSAV(), auteur, texte, date: new Date().toISOString() };
    return modifierLignesSAV(savId, (lignes) => {
      const trouve = ligneId ? lignes.findIndex(l => l.id === ligneId) : -1;
      const i = trouve !== -1 ? trouve : ligneIndex;
      if (!lignes[i]) throw new Error('Tâche introuvable');
      lignes[i] = { ...lignes[i], reponses: [...(lignes[i].reponses || []), nouvelle] };
      return lignes;
    });
  };

  const deleteReponseSAV = async (savId, reponseId) =>
    modifierLignesSAV(savId, (lignes) =>
      lignes.map(l => (l.reponses ? { ...l, reponses: l.reponses.filter(r => r.id !== reponseId) } : l))
    );

  // ✅ PHOTOS DU CONSTRUCTEUR (bucket photos-reprises, chemin sav_<id>_<uuid>.ext)
  const lirePhotos = async (savId) => {
    const { data, error } = await supabase.from("sav").select("photos").eq("id", savId).single();
    if (error) throw error;
    return Array.isArray(data?.photos) ? data.photos : [];
  };

  // Envoie les fichiers puis les ajoute au SAV. Renvoie le nombre d'échecs.
  const ajouterPhotosSAV = async (savId, fichiers) => {
    const nouvelles = [];
    let echecs = 0;
    for (const file of fichiers) {
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const chemin = `sav_${savId}_${nouvelIdSAV()}.${ext}`;
        const { error } = await supabase.storage.from('photos-reprises').upload(chemin, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('photos-reprises').getPublicUrl(chemin);
        nouvelles.push({ url: urlData.publicUrl, name: file.name, auteur, date: new Date().toISOString() });
      } catch (error) {
        console.error('❌ Upload photo SAV :', file.name, error);
        echecs++;
      }
    }
    if (nouvelles.length > 0) {
      const photos = await lirePhotos(savId);
      await updateSAV(savId, { photos: [...photos, ...nouvelles] });
    }
    return echecs;
  };

  const supprimerPhotoSAV = async (savId, photo) => {
    const photos = await lirePhotos(savId);
    await updateSAV(savId, { photos: photos.filter(p => p.url !== photo.url) });
    // Fichier : chemin après le nom du bucket
    const chemin = decodeURIComponent((photo.url || '').split('/photos-reprises/')[1] || '').split('?')[0];
    if (chemin) await supabase.storage.from('photos-reprises').remove([chemin]).catch(() => {});
  };

  // ✅ ARCHIVER / RESTAURER (seul un SAV validé peut être archivé)
  const setArchiveSAV = async (savId, archive) => {
    const sav = demandesSAV.find(s => s.id === savId);
    if (archive && !sav?.constructeur_valide) throw new Error('Seul un SAV validé peut être archivé');
    return updateSAV(savId, {
      archive,
      archive_le: archive ? new Date().toISOString() : null,
      archive_par: archive ? auteur : null,
    });
  };

  // ✅ SUPPRIMER (AVEC wrapper)
  const deleteSAV = async (id) => {
  
      const { error } = await supabase.from("sav").delete().eq("id", id);
      if (error) {
        console.error("❌ Erreur delete SAV:", error);
        throw error;
      }

      setDemandesSAV((prev) => prev.filter((s) => s.id !== id));
  
  };

  useEffect(() => {
    if (!profile?.nomsociete) return;
    loadSAV();
  }, [profile?.nomsociete, loadSAV]);

  return (
    <SAVContext.Provider
      value={{
        loading,
        demandesSAV,
        loadSAV,
        addSAV,
        updateSAV,
        deleteSAV,
        toggleDescriptionLigne,
        auteur,
        modifierLignesSAV,
        addReponseSAV,
        deleteReponseSAV,
        setArchiveSAV,
        ajouterPhotosSAV,
        supprimerPhotoSAV,
      }}
    >
      {children}
    </SAVContext.Provider>
  );
}

export function useSAV() {
  return useContext(SAVContext);
}