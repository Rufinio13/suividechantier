import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
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

  // =========================================
  // CHARGER LES COMMENTAIRES
  // =========================================
  const fetchCommentaires = useCallback(async () => {
    if (!nomsociete) return;

    try {
      setLoading(true);
      // ✅ CORRIGÉ : Pas de .eq('nomsociete') car RLS le gère
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

  // =========================================
  // RÉCUPÉRER LES COMMENTAIRES D'UN CHANTIER
  // =========================================
  const getCommentairesByChantier = useCallback((chantierId) => {
    return commentaires
      .filter(c => c.chantier_id === chantierId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [commentaires]);

  // =========================================
  // AJOUTER UN COMMENTAIRE
  // =========================================
  const addCommentaire = async (chantierId, titre, texte) => {
    try {
      const { data, error } = await supabase
        .from('commentaires_chantier')
        .insert([{
          chantier_id: chantierId,
          nomsociete, // ✅ On passe nomsociete pour l'insertion
          titre,
          texte,
          auteur,
          pris_en_compte: false,
          date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setCommentaires(prev => [data, ...prev]);
      return { success: true, data };
    } catch (error) {
      console.error('Erreur addCommentaire:', error);
      throw error;
    }
  };

  // =========================================
  // METTRE À JOUR UN COMMENTAIRE
  // =========================================
  const updateCommentaire = async (commentaireId, updates) => {
    try {
      // ✅ CORRIGÉ : Pas de .eq('nomsociete') car RLS le gère
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
    } catch (error) {
      console.error('Erreur updateCommentaire:', error);
      throw error;
    }
  };

  // =========================================
  // SUPPRIMER UN COMMENTAIRE
  // =========================================
  const deleteCommentaire = async (commentaireId) => {
    try {
      // ✅ CORRIGÉ : Pas de .eq('nomsociete') car RLS le gère
      const { error } = await supabase
        .from('commentaires_chantier')
        .delete()
        .eq('id', commentaireId);

      if (error) throw error;

      setCommentaires(prev => prev.filter(c => c.id !== commentaireId));
      return { success: true };
    } catch (error) {
      console.error('Erreur deleteCommentaire:', error);
      throw error;
    }
  };

  // =========================================
  // TOGGLE PRIS EN COMPTE
  // =========================================
  const togglePrisEnCompte = async (commentaireId) => {
    try {
      const commentaire = commentaires.find(c => c.id === commentaireId);
      if (!commentaire) throw new Error('Commentaire non trouvé');

      // ✅ CORRIGÉ : Pas de .eq('nomsociete') car RLS le gère
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
    } catch (error) {
      console.error('Erreur togglePrisEnCompte:', error);
      throw error;
    }
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