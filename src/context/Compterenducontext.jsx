import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

const CompteRenduContext = createContext();

export const useCompteRendu = () => {
  const context = useContext(CompteRenduContext);
  if (!context) {
    throw new Error('useCompteRendu doit être utilisé dans CompteRenduProvider');
  }
  return context;
};

export function CompteRenduProvider({ children }) {
  const { user, profile } = useAuth();
  const nomsociete = profile?.nomsociete;

  const [comptesRendus, setComptesRendus] = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================================
  // CHARGER LES COMPTES RENDUS
  // =========================================
  const fetchComptesRendus = useCallback(async () => {
    if (!nomsociete) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comptes_rendus')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setComptesRendus(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des comptes rendus:', error);
    } finally {
      setLoading(false);
    }
  }, [nomsociete]);

  useEffect(() => {
    if (nomsociete) {
      fetchComptesRendus();
    }
  }, [nomsociete, fetchComptesRendus]);

  // =========================================
  // RÉCUPÉRER LES COMPTES RENDUS D'UN CHANTIER
  // =========================================
  const getComptesRendusByChantier = useCallback((chantierId) => {
    return comptesRendus
      .filter(cr => cr.chantier_id === chantierId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [comptesRendus]);

  // =========================================
  // AJOUTER UN COMPTE RENDU
  // =========================================
  const addCompteRendu = async (chantierId, compteRenduData) => {
    try {
      const { data, error } = await supabase
        .from('comptes_rendus')
        .insert([{
          chantier_id: chantierId,
          nomsociete,
          ...compteRenduData,
          date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setComptesRendus(prev => [data, ...prev]);
      return { success: true, data };
    } catch (error) {
      console.error('Erreur addCompteRendu:', error);
      throw error;
    }
  };

  // =========================================
  // METTRE À JOUR UN COMPTE RENDU
  // =========================================
  const updateCompteRendu = async (compteRenduId, updates) => {
    try {
      const { data, error } = await supabase
        .from('comptes_rendus')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', compteRenduId)
        .select()
        .single();

      if (error) throw error;

      setComptesRendus(prev => prev.map(cr => cr.id === compteRenduId ? data : cr));
      return { success: true, data };
    } catch (error) {
      console.error('Erreur updateCompteRendu:', error);
      throw error;
    }
  };

  // =========================================
  // SUPPRIMER UN COMPTE RENDU
  // =========================================
  const deleteCompteRendu = async (compteRenduId) => {
    try {
      const { error } = await supabase
        .from('comptes_rendus')
        .delete()
        .eq('id', compteRenduId);

      if (error) throw error;

      setComptesRendus(prev => prev.filter(cr => cr.id !== compteRenduId));
      return { success: true };
    } catch (error) {
      console.error('Erreur deleteCompteRendu:', error);
      throw error;
    }
  };

  const value = {
    comptesRendus,
    loading,
    nomsociete,
    getComptesRendusByChantier,
    addCompteRendu,
    updateCompteRendu,
    deleteCompteRendu,
    refreshComptesRendus: fetchComptesRendus
  };

  return (
    <CompteRenduContext.Provider value={value}>
      {children}
    </CompteRenduContext.Provider>
  );
}