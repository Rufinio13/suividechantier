import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const [modelesCQ, setModelesCQ] = useState([]);
  const [controles, setControles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelesLoaded, setModelesLoaded] = useState(false); // ✅ NOUVEAU
  const [controlesLoaded, setControlesLoaded] = useState(false); // ✅ NOUVEAU

  // ✅ NOUVEAU : Mettre loading à false quand les deux sont chargés
  useEffect(() => {
    if (modelesLoaded && controlesLoaded) {
      setLoading(false);
    }
  }, [modelesLoaded, controlesLoaded]);

  // =========================================
  // CHARGER LES MODÈLES CQ
  // =========================================
  useEffect(() => {
    const fetchModelesCQ = async () => {
      if (!profile?.nomsociete) {
        console.log('ReferentielCQContext : En attente de nomsociete...');
        setModelesLoaded(true); // ✅ MODIFIÉ
        return;
      }

      try {
        console.log('⏳ Chargement modèles CQ pour société:', profile.nomsociete);
        
        const { data, error } = await supabase
          .from('referentiels_controle_qualite')
          .select('*')
          .eq('nomsociete', profile.nomsociete)
          .order('titre', { ascending: true });

        if (error) throw error;
        
        console.log('✅ Modèles CQ chargés:', data?.length || 0);
        setModelesCQ(data || []);
      } catch (error) {
        console.error('❌ Erreur lors du chargement des modèles CQ:', error);
        setModelesCQ([]);
      } finally {
        setModelesLoaded(true); // ✅ MODIFIÉ
      }
    };

    fetchModelesCQ();
  }, [profile?.nomsociete]);

  // =========================================
  // CHARGER LES CONTRÔLES QUALITÉ
  // =========================================
  useEffect(() => {
    const fetchControles = async () => {
      if (!profile?.nomsociete) {
        console.log('ReferentielCQContext : En attente de nomsociete pour contrôles...');
        setControlesLoaded(true); // ✅ MODIFIÉ
        return;
      }

      try {
        console.log('⏳ Chargement contrôles pour société:', profile.nomsociete);
        
        const { data, error } = await supabase
          .from('controles_qualite')
          .select('*')
          .eq('nomsociete', profile.nomsociete)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        console.log('✅ Contrôles chargés:', data?.length || 0);
        setControles(data || []);
      } catch (error) {
        console.error('❌ Erreur lors du chargement des contrôles:', error);
        setControles([]);
      } finally {
        setControlesLoaded(true); // ✅ MODIFIÉ
      }
    };

    fetchControles();
  }, [profile?.nomsociete]);

  // =========================================
  // AJOUTER UN MODÈLE CQ
  // =========================================
  const addModeleCQ = async (modeleData) => {
    try {
      const dataToInsert = {
        ...modeleData,
        nomsociete: profile?.nomsociete,
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
        .eq('nomsociete', profile?.nomsociete)
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
        .eq('nomsociete', profile?.nomsociete);

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
      console.log('💾 saveControleFromModele:', { chantierId, modeleCQId });
      
      const { data: existingControle, error: fetchError } = await supabase
        .from('controles_qualite')
        .select('*')
        .eq('chantier_id', chantierId)
        .eq('modele_cq_id', modeleCQId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingControle) {
        console.log('📝 Mise à jour contrôle existant:', existingControle.id);
        
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
        console.log('➕ Création nouveau contrôle');
        
        // Création
        const { data, error } = await supabase
          .from('controles_qualite')
          .insert([{
            chantier_id: chantierId,
            modele_cq_id: modeleCQId,
            nomsociete: profile?.nomsociete,
            resultats,
            points_specifiques: pointsSpecifiques,
            statut: 'en_cours',
            date_controle: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;

        console.log('✅ Contrôle créé:', data);
        setControles(prev => [...prev, data]);
        return { success: true, data };
      }
    } catch (error) {
      console.error('❌ Erreur saveControleFromModele:', error);
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
            nomsociete: profile?.nomsociete,
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

  // =========================================
  // RAFRAÎCHIR MANUELLEMENT
  // =========================================
  const refreshModeles = async () => {
    if (!profile?.nomsociete) return;

    try {
      const { data, error } = await supabase
        .from('referentiels_controle_qualite')
        .select('*')
        .eq('nomsociete', profile.nomsociete)
        .order('titre', { ascending: true });

      if (error) throw error;
      setModelesCQ(data || []);
    } catch (error) {
      console.error('Erreur refreshModeles:', error);
    }
  };

  const refreshControles = async () => {
    if (!profile?.nomsociete) return;

    try {
      const { data, error } = await supabase
        .from('controles_qualite')
        .select('*')
        .eq('nomsociete', profile.nomsociete)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setControles(data || []);
    } catch (error) {
      console.error('Erreur refreshControles:', error);
    }
  };

  const value = {
    modelesCQ,
    controles,
    loading,
    nomsociete: profile?.nomsociete,
    addModeleCQ,
    updateModeleCQ,
    deleteModeleCQ,
    saveControleFromModele,
    getControlesByChantier,
    addPointControleChantierSpecific,
    updatePointControleChantierSpecific,
    deletePointControleChantierSpecific,
    refreshModeles,
    refreshControles
  };

  return (
    <ReferentielCQContext.Provider value={value}>
      {children}
    </ReferentielCQContext.Provider>
  );
}