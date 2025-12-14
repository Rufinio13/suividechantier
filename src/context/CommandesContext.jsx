import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

const CommandesContext = createContext();

export const useCommandes = () => {
  const context = useContext(CommandesContext);
  if (!context) {
    throw new Error('useCommandes doit être utilisé dans CommandesProvider');
  }
  return context;
};

export function CommandesProvider({ children }) {
  const { user, profile } = useAuth();
  
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================================
  // CHARGER LES COMMANDES
  // =========================================
  useEffect(() => {
    const fetchCommandes = async () => {
      if (!profile?.nomsociete) {
        console.log('CommandesContext : En attente de nomsociete...');
        setLoading(false);
        return;
      }

      try {
        console.log('⏳ Chargement commandes pour société:', profile.nomsociete);
        setLoading(true);
        
        const { data, error } = await supabase
          .from('commandes')
          .select(`
            *,
            chantiers!inner(nomchantier),
            fournisseurs("nomsocieteF")
          `)
          .eq('nomsociete', profile.nomsociete)
          .order('date_livraison_souhaitee', { ascending: true, nullsFirst: false });

        if (error) {
          console.error('❌ Erreur chargement commandes:', error);
          throw error;
        }
        
        console.log('✅ Commandes chargées:', data?.length || 0);
        setCommandes(data || []);
      } catch (error) {
        console.error('❌ Exception lors du chargement des commandes:', error);
        setCommandes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCommandes();
  }, [profile?.nomsociete]);

  // =========================================
  // RÉCUPÉRER LES COMMANDES D'UN CHANTIER
  // =========================================
  const getCommandesByChantier = (chantierId) => {
    return commandes.filter(c => c.chantier_id === chantierId);
  };

  // =========================================
  // AJOUTER UNE COMMANDE
  // =========================================
  const addCommande = async (commandeData) => {
    try {
      const dataToInsert = {
        ...commandeData,
        nomsociete: profile?.nomsociete,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📤 Insertion commande:', dataToInsert);

      const { data, error } = await supabase
        .from('commandes')
        .insert([dataToInsert])
        .select(`
          *,
          chantiers(nomchantier),
          fournisseurs("nomsocieteF")
        `)
        .single();

      if (error) throw error;

      console.log('✅ Commande ajoutée:', data);
      setCommandes(prev => [...prev, data]);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Erreur addCommande:', error);
      throw error;
    }
  };

  // =========================================
  // METTRE À JOUR UNE COMMANDE
  // =========================================
  const updateCommande = async (id, updates) => {
    try {
      const dataToUpdate = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      console.log('📤 Update commande:', id, dataToUpdate);

      const { data, error } = await supabase
        .from('commandes')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('nomsociete', profile?.nomsociete)
        .select(`
          *,
          chantiers(nomchantier),
          fournisseurs("nomsocieteF")
        `)
        .single();

      if (error) throw error;

      console.log('✅ Commande mise à jour:', data);
      setCommandes(prev => prev.map(c => c.id === id ? data : c));
      return { success: true, data };
    } catch (error) {
      console.error('❌ Erreur updateCommande:', error);
      throw error;
    }
  };

  // =========================================
  // SUPPRIMER UNE COMMANDE
  // =========================================
  const deleteCommande = async (id) => {
    try {
      console.log('📤 Delete commande:', id);

      const { error } = await supabase
        .from('commandes')
        .delete()
        .eq('id', id)
        .eq('nomsociete', profile?.nomsociete);

      if (error) throw error;

      console.log('✅ Commande supprimée');
      setCommandes(prev => prev.filter(c => c.id !== id));
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur deleteCommande:', error);
      throw error;
    }
  };

  // =========================================
  // VALIDER UNE COMMANDE (définir date_commande_reelle)
  // =========================================
  const validerCommande = async (id, dateCommandeReelle) => {
    try {
      return await updateCommande(id, {
        date_commande_reelle: dateCommandeReelle || new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('❌ Erreur validerCommande:', error);
      throw error;
    }
  };

  // =========================================
  // RAFRAÎCHIR LES COMMANDES
  // =========================================
  const refreshCommandes = async () => {
    if (!profile?.nomsociete) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          chantiers!inner(nomchantier),
          fournisseurs("nomsocieteF")
        `)
        .eq('nomsociete', profile.nomsociete)
        .order('date_livraison_souhaitee', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      setCommandes(data || []);
    } catch (error) {
      console.error('❌ Erreur refresh commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    commandes,
    setCommandes, // ✅ NOUVEAU : Exposer setCommandes pour mise à jour optimiste
    loading,
    nomsociete: profile?.nomsociete,
    addCommande,
    updateCommande,
    deleteCommande,
    validerCommande,
    getCommandesByChantier,
    refreshCommandes
  };

  return (
    <CommandesContext.Provider value={value}>
      {children}
    </CommandesContext.Provider>
  );
}