import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

const ReferentielCQContext = createContext();

export const useReferentielCQ = () => {
  const context = useContext(ReferentielCQContext);
  if (!context) {
    throw new Error('useReferentielCQ doit être utilisé dans ReferentielCQProvider');
  }
  return context;
};

export function ReferentielCQProvider({ children }) {
  const { user, profile } = useAuth();
  const nomsociete = profile?.nomsociete;

  const [modelesCQ, setModelesCQ] = useState([]);
  const [controles, setControles] = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================================
  // CHARGER LES MODÈLES CQ
  // =========================================
  const fetchModelesCQ = useCallback(async () => {
    if (!nomsociete) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referentiels_controle_qualite')
        .select('*')
        .eq('nomsociete', nomsociete)
        .order('titre', { ascending: true });

      if (error) throw error;
      setModelesCQ(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des modèles CQ:', error);
    } finally {
      setLoading(false);
    }
  }, [nomsociete]);

  // =========================================
  // CHARGER LES CONTRÔLES QUALITÉ
  // =========================================
  const fetchControles = useCallback(async () => {
    if (!nomsociete) return;

    try {
      // ✅ CORRIGÉ : Pas de .eq('nomsociete') car RLS le gère
      const { data, error } = await supabase
        .from('controles_qualite')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('✅ Contrôles chargés:', data);
      setControles(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des contrôles:', error);
    }
  }, [nomsociete]);

  useEffect(() => {
    if (nomsociete) {
      fetchModelesCQ();
      fetchControles();
    }
  }, [nomsociete, fetchModelesCQ, fetchControles]);

  // =========================================
  // AJOUTER UN MODÈLE CQ
  // =========================================
  const addModeleCQ = async (modeleData) => {
    try {
      const dataToInsert = {
        ...modeleData,
        nomsociete,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('referentiels_controle_qualite')
        .insert([dataToInsert])
        .select()
        .single();

      if (error) throw error;

      setModelesCQ(prev => [...prev, data]);
      return { success: true, data };
    } catch (error) {
      console.error('Erreur addModeleCQ:', error);
      throw error;
    }
  };

  // =========================================
  // METTRE À JOUR UN MODÈLE CQ
  // =========================================
  const updateModeleCQ = async (id, updates) => {
    try {
      const dataToUpdate = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('referentiels_controle_qualite')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('nomsociete', nomsociete)
        .select()
        .single();

      if (error) throw error;

      setModelesCQ(prev => prev.map(m => m.id === id ? data : m));
      return { success: true, data };
    } catch (error) {
      console.error('Erreur updateModeleCQ:', error);
      throw error;
    }
  };

  // =========================================
  // SUPPRIMER UN MODÈLE CQ
  // =========================================
  const deleteModeleCQ = async (id) => {
    try {
      const { error } = await supabase
        .from('referentiels_controle_qualite')
        .delete()
        .eq('id', id)
        .eq('nomsociete', nomsociete);

      if (error) throw error;

      setModelesCQ(prev => prev.filter(m => m.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Erreur deleteModeleCQ:', error);
      throw error;
    }
  };

  // =========================================
  // SAUVEGARDER UN CONTRÔLE DEPUIS UN MODÈLE
  // =========================================
  const saveControleFromModele = async (chantierId, modeleCQId, resultats, pointsSpecifiques) => {
    try {
      // ✅ CORRIGÉ : Pas de .eq('nomsociete') car RLS le gère
      const { data: existingControle, error: fetchError } = await supabase
        .from('controles_qualite')
        .select('*')
        .eq('chantier_id', chantierId)
        .eq('modele_cq_id', modeleCQId)
        .maybeSingle(); // ✅ CORRIGÉ : Utiliser maybeSingle() au lieu de single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingControle) {
        // Mise à jour
        const { data, error } = await supabase
          .from('controles_qualite')
          .update({
            resultats,
            points_specifiques: pointsSpecifiques,
            date_controle: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingControle.id)
          .select()
          .single();

        if (error) throw error;

        setControles(prev => prev.map(c => c.id === existingControle.id ? data : c));
        return { success: true, data };
      } else {
        // Création
        const { data, error } = await supabase
          .from('controles_qualite')
          .insert([{
            chantier_id: chantierId,
            modele_cq_id: modeleCQId,
            nomsociete,
            resultats,
            points_specifiques: pointsSpecifiques,
            statut: 'en_cours',
            date_controle: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;

        setControles(prev => [...prev, data]);
        return { success: true, data };
      }
    } catch (error) {
      console.error('Erreur saveControleFromModele:', error);
      throw error;
    }
  };

  // =========================================
  // RÉCUPÉRER LES CONTRÔLES D'UN CHANTIER
  // =========================================
  const getControlesByChantier = (chantierId) => {
    return controles.filter(c => c.chantier_id === chantierId);
  };

  // =========================================
  // AJOUTER UN POINT SPÉCIFIQUE
  // =========================================
  const addPointControleChantierSpecific = async (chantierId, modeleId, domaineId, sousCategorieId, pointData) => {
    try {
      const existingControle = controles.find(
        c => c.chantier_id === chantierId && c.modele_cq_id === modeleId
      );

      const scKey = sousCategorieId || '_global';
      let updatedPointsSpecifiques = existingControle?.points_specifiques || {};
      
      if (!updatedPointsSpecifiques[domaineId]) {
        updatedPointsSpecifiques[domaineId] = {};
      }
      if (!updatedPointsSpecifiques[domaineId][scKey]) {
        updatedPointsSpecifiques[domaineId][scKey] = {};
      }
      updatedPointsSpecifiques[domaineId][scKey][pointData.id] = pointData;

      if (existingControle) {
        const { data, error } = await supabase
          .from('controles_qualite')
          .update({
            points_specifiques: updatedPointsSpecifiques,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingControle.id)
          .select()
          .single();

        if (error) throw error;
        setControles(prev => prev.map(c => c.id === existingControle.id ? data : c));
      } else {
        const { data, error } = await supabase
          .from('controles_qualite')
          .insert([{
            chantier_id: chantierId,
            modele_cq_id: modeleId,
            nomsociete,
            points_specifiques: updatedPointsSpecifiques,
            statut: 'en_cours'
          }])
          .select()
          .single();

        if (error) throw error;
        setControles(prev => [...prev, data]);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur addPointControleChantierSpecific:', error);
      throw error;
    }
  };

  // =========================================
  // METTRE À JOUR UN POINT SPÉCIFIQUE
  // =========================================
  const updatePointControleChantierSpecific = async (chantierId, modeleId, domaineId, sousCategorieId, pointId, updates) => {
    try {
      const existingControle = controles.find(
        c => c.chantier_id === chantierId && c.modele_cq_id === modeleId
      );

      if (!existingControle) throw new Error('Contrôle non trouvé');

      const scKey = sousCategorieId || '_global';
      let updatedPointsSpecifiques = { ...existingControle.points_specifiques };
      
      if (updatedPointsSpecifiques[domaineId]?.[scKey]?.[pointId]) {
        updatedPointsSpecifiques[domaineId][scKey][pointId] = {
          ...updatedPointsSpecifiques[domaineId][scKey][pointId],
          ...updates
        };
      }

      const { data, error } = await supabase
        .from('controles_qualite')
        .update({
          points_specifiques: updatedPointsSpecifiques,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingControle.id)
        .select()
        .single();

      if (error) throw error;
      setControles(prev => prev.map(c => c.id === existingControle.id ? data : c));

      return { success: true };
    } catch (error) {
      console.error('Erreur updatePointControleChantierSpecific:', error);
      throw error;
    }
  };

  // =========================================
  // SUPPRIMER UN POINT SPÉCIFIQUE
  // =========================================
  const deletePointControleChantierSpecific = async (chantierId, modeleId, domaineId, sousCategorieId, pointId) => {
    try {
      const existingControle = controles.find(
        c => c.chantier_id === chantierId && c.modele_cq_id === modeleId
      );

      if (!existingControle) throw new Error('Contrôle non trouvé');

      const scKey = sousCategorieId || '_global';
      let updatedPointsSpecifiques = { ...existingControle.points_specifiques };
      
      if (updatedPointsSpecifiques[domaineId]?.[scKey]?.[pointId]) {
        delete updatedPointsSpecifiques[domaineId][scKey][pointId];
      }

      const { data, error } = await supabase
        .from('controles_qualite')
        .update({
          points_specifiques: updatedPointsSpecifiques,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingControle.id)
        .select()
        .single();

      if (error) throw error;
      setControles(prev => prev.map(c => c.id === existingControle.id ? data : c));

      return { success: true };
    } catch (error) {
      console.error('Erreur deletePointControleChantierSpecific:', error);
      throw error;
    }
  };

  const value = {
    modelesCQ,
    controles,
    loading,
    nomsociete,
    addModeleCQ,
    updateModeleCQ,
    deleteModeleCQ,
    saveControleFromModele,
    getControlesByChantier,
    addPointControleChantierSpecific,
    updatePointControleChantierSpecific,
    deletePointControleChantierSpecific,
    refreshModeles: fetchModelesCQ,
    refreshControles: fetchControles
  };

  return (
    <ReferentielCQContext.Provider value={value}>
      {children}
    </ReferentielCQContext.Provider>
  );
}