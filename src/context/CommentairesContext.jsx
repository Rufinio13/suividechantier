import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

const CommentairesContext = createContext();

export const nouvelId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export const useCommentaires = () => {
  const context = useContext(CommentairesContext);
  if (!context) {
    throw new Error('useCommentaires doit être utilisé dans CommentairesProvider');
  } 
  return context;
};

export function CommentairesProvider({ children }) {
  const { user, profile } = useAuth();
  const nomsociete = profile?.nomsociete;
  const auteur = profile?.nom || user?.email || 'Utilisateur';

  const [commentaires, setCommentaires] = useState([]);
  const [loading, setLoading] = useState(true);

  // CHARGER LES COMMENTAIRES (sans wrapper - lecture)
  const fetchCommentaires = useCallback(async () => {
    if (!nomsociete) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('commentaires_chantier')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setCommentaires(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des commentaires:', error);
    } finally {
      setLoading(false);
    }
  }, [nomsociete]);

  useEffect(() => {
    if (nomsociete) {
      fetchCommentaires();
    }
  }, [nomsociete, fetchCommentaires]);

  // RÉCUPÉRER LES COMMENTAIRES D'UN CHANTIER
  const getCommentairesByChantier = useCallback((chantierId) => {
    return commentaires
      .filter(c => c.chantier_id === chantierId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [commentaires]);

  // ✅ AJOUTER UN COMMENTAIRE (AVEC wrapper)
  const addCommentaire = async (chantierId, titre, texte, categorie = 'journal') => {
    
      // Récupérer le nomsociete du chantier
      const { data: chantier, error: chantierError } = await supabase
        .from('chantiers')
        .select('nomsociete')
        .eq('id', chantierId)
        .single();
      
      if (chantierError) {
        console.error('❌ Erreur récupération chantier:', chantierError);
        throw chantierError;
      }
      
      if (!chantier?.nomsociete) {
        throw new Error('Impossible de récupérer le nomsociete du chantier');
      }

      const { data, error } = await supabase
        .from('commentaires_chantier')
        .insert([{
          chantier_id: chantierId,
          nomsociete: chantier.nomsociete,
          titre,
          texte,
          auteur,
          pris_en_compte: false,
          date: new Date().toISOString(),
          // Colonne envoyée seulement hors journal : le journal marche même avant la migration SQL
          ...(categorie && categorie !== 'journal' ? { categorie } : {}),
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur détaillée Supabase:', error);
        throw error;
      }

      setCommentaires(prev => [data, ...prev]);
      return { success: true, data };
    
  };

  // ✅ METTRE À JOUR UN COMMENTAIRE (AVEC wrapper)
  const updateCommentaire = async (commentaireId, updates) => {
    
      const { data, error } = await supabase
        .from('commentaires_chantier')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentaireId)
        .select()
        .single();

      if (error) throw error;

      setCommentaires(prev => prev.map(c => c.id === commentaireId ? data : c));
      return { success: true, data };
    
  };

  // ✅ SUPPRIMER UN COMMENTAIRE (AVEC wrapper)
  const deleteCommentaire = async (commentaireId) => {
    
      const { error } = await supabase
        .from('commentaires_chantier')
        .delete()
        .eq('id', commentaireId);

      if (error) throw error;

      setCommentaires(prev => prev.filter(c => c.id !== commentaireId));
      return { success: true };
    
  };

  // ✅ TOGGLE PRIS EN COMPTE (AVEC wrapper)
  const togglePrisEnCompte = async (commentaireId) => {
    
      const commentaire = commentaires.find(c => c.id === commentaireId);
      if (!commentaire) throw new Error('Commentaire non trouvé');

      const { data, error } = await supabase
        .from('commentaires_chantier')
        .update({
          pris_en_compte: !commentaire.pris_en_compte,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentaireId)
        .select()
        .single();

      if (error) throw error;

      setCommentaires(prev => prev.map(c => c.id === commentaireId ? data : c));
      return { success: true, data };
    
  };

  // ✅ TÂCHES D'UN COMMENTAIRE (stockées en JSON dans `texte`)
  // Relit la version en base avant d'écrire, pour ne pas écraser une tâche
  // ou une réponse ajoutée entre-temps par un autre utilisateur.
  const modifierLignes = async (commentaireId, transformer) => {
    const { data, error } = await supabase
      .from('commentaires_chantier')
      .select('texte')
      .eq('id', commentaireId)
      .single();
    if (error) throw error;

    let lignes;
    try {
      lignes = typeof data?.texte === 'string' ? JSON.parse(data.texte) : data?.texte;
    } catch {
      lignes = null;
    }
    if (!Array.isArray(lignes)) lignes = data?.texte ? [{ texte: String(data.texte), checked: false }] : [];

    return updateCommentaire(commentaireId, { texte: JSON.stringify(transformer(lignes)) });
  };

  // Retrouve une tâche par son id (nouvelles tâches) ou, à défaut, par sa position
  const trouverIndex = (lignes, ligneId, index) => {
    if (ligneId) {
      const i = lignes.findIndex(l => l.id === ligneId);
      if (i !== -1) return i;
    }
    return index;
  };

  // ✅ RÉPONSES PAR TÂCHE
  const addReponse = async (commentaireId, ligneId, ligneIndex, texte) => {
    const nouvelle = { id: nouvelId(), auteur, texte, date: new Date().toISOString() };
    return modifierLignes(commentaireId, (lignes) => {
      const i = trouverIndex(lignes, ligneId, ligneIndex);
      if (!lignes[i]) throw new Error('Tâche introuvable');
      lignes[i] = { ...lignes[i], reponses: [...(lignes[i].reponses || []), nouvelle] };
      return lignes;
    });
  };

  const deleteReponse = async (commentaireId, reponseId) => {
    return modifierLignes(commentaireId, (lignes) =>
      lignes.map(l => (l.reponses ? { ...l, reponses: l.reponses.filter(r => r.id !== reponseId) } : l))
    );
  };

  // ✅ ARCHIVER / RESTAURER
  const setArchive = async (commentaireId, archive) => {
    return updateCommentaire(commentaireId, {
      archive,
      archive_le: archive ? new Date().toISOString() : null,
      archive_par: archive ? auteur : null,
    });
  };

  const value = {
    commentaires,
    loading,
    nomsociete,
    auteur,
    getCommentairesByChantier,
    addCommentaire,
    updateCommentaire,
    deleteCommentaire,
    togglePrisEnCompte,
    modifierLignes,
    addReponse,
    deleteReponse,
    setArchive,
    refreshCommentaires: fetchCommentaires
  };

  return (
    <CommentairesContext.Provider value={value}>
      {children}
    </CommentairesContext.Provider>
  );
}