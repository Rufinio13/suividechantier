import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, supabaseWithSessionCheck } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

const CommentairesContext = createContext();

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
  const addCommentaire = async (chantierId, titre, texte) => {
    return await supabaseWithSessionCheck(async () => {
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
          date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur détaillée Supabase:', error);
        throw error;
      }

      setCommentaires(prev => [data, ...prev]);
      return { success: true, data };
    });
  };

  // ✅ METTRE À JOUR UN COMMENTAIRE (AVEC wrapper)
  const updateCommentaire = async (commentaireId, updates) => {
    return await supabaseWithSessionCheck(async () => {
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
    });
  };

  // ✅ SUPPRIMER UN COMMENTAIRE (AVEC wrapper)
  const deleteCommentaire = async (commentaireId) => {
    return await supabaseWithSessionCheck(async () => {
      const { error } = await supabase
        .from('commentaires_chantier')
        .delete()
        .eq('id', commentaireId);

      if (error) throw error;

      setCommentaires(prev => prev.filter(c => c.id !== commentaireId));
      return { success: true };
    });
  };

  // ✅ TOGGLE PRIS EN COMPTE (AVEC wrapper)
  const togglePrisEnCompte = async (commentaireId) => {
    return await supabaseWithSessionCheck(async () => {
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
    refreshCommentaires: fetchCommentaires
  };

  return (
    <CommentairesContext.Provider value={value}>
      {children}
    </CommentairesContext.Provider>
  );
}