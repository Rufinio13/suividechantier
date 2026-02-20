import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, supabaseWithSessionCheck } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

const ReferentielCommandeContext = createContext();

export const useReferentielCommande = () => {
  const context = useContext(ReferentielCommandeContext);
  if (!context) {
    throw new Error('useReferentielCommande doit être utilisé dans ReferentielCommandeProvider');
  }
  return context;
};

export function ReferentielCommandeProvider({ children }) {
  const { user, profile } = useAuth();
  const nomsociete = profile?.nomsociete;

  const [modelesCommande, setModelesCommande] = useState([]);
  const [loading, setLoading] = useState(true);

  // CHARGER LES MODÈLES DE COMMANDE (sans wrapper - lecture)
  const fetchModelesCommande = useCallback(async () => {
    if (!nomsociete) {
      console.log('ReferentielCommandeContext : En attente de nomsociete...');
      setLoading(false);
      return;
    }

    try {
      console.log('⏳ Chargement modèles commande pour société:', nomsociete);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('referentiels_commande')
        .select('*')
        .eq('nomsociete', nomsociete)
        .order('titre', { ascending: true });

      if (error) throw error;
      
      console.log('✅ Modèles commande chargés:', data?.length || 0);
      setModelesCommande(data || []);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des modèles commande:', error);
      setModelesCommande([]);
    } finally {
      setLoading(false);
    }
  }, [nomsociete]);

  useEffect(() => {
    if (nomsociete) {
      fetchModelesCommande();
    }
  }, [nomsociete, fetchModelesCommande]);

  // ✅ AJOUTER UN MODÈLE DE COMMANDE (AVEC wrapper)
  const addModeleCommande = async (modeleData) => {
    return await supabaseWithSessionCheck(async () => {
      const dataToInsert = {
        ...modeleData,
        nomsociete,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📤 Insertion modèle commande:', dataToInsert);

      const { data, error } = await supabase
        .from('referentiels_commande')
        .insert([dataToInsert])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Modèle commande ajouté:', data);
      setModelesCommande(prev => [...prev, data]);
      return { success: true, data };
    });
  };

  // ✅ METTRE À JOUR UN MODÈLE DE COMMANDE (AVEC wrapper)
  const updateModeleCommande = async (id, updates) => {
    return await supabaseWithSessionCheck(async () => {
      const dataToUpdate = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      console.log('📤 Update modèle commande:', id, dataToUpdate);

      const { data, error } = await supabase
        .from('referentiels_commande')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('nomsociete', nomsociete)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Modèle commande mis à jour:', data);
      setModelesCommande(prev => prev.map(m => m.id === id ? data : m));
      return { success: true, data };
    });
  };

  // ✅ SUPPRIMER UN MODÈLE DE COMMANDE (AVEC wrapper)
  const deleteModeleCommande = async (id) => {
    return await supabaseWithSessionCheck(async () => {
      console.log('📤 Delete modèle commande:', id);

      const { error } = await supabase
        .from('referentiels_commande')
        .delete()
        .eq('id', id)
        .eq('nomsociete', nomsociete);

      if (error) throw error;

      console.log('✅ Modèle commande supprimé');
      setModelesCommande(prev => prev.filter(m => m.id !== id));
      return { success: true };
    });
  };

  const value = {
    modelesCommande,
    loading,
    nomsociete,
    addModeleCommande,
    updateModeleCommande,
    deleteModeleCommande,
    refreshModeles: fetchModelesCommande
  };

  return (
    <ReferentielCommandeContext.Provider value={value}>
      {children}
    </ReferentielCommandeContext.Provider>
  );
}