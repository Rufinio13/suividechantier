import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, supabaseWithSessionCheck } from '@/lib/supabaseClient';
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
  const [modelesLoaded, setModelesLoaded] = useState(false);
  const [controlesLoaded, setControlesLoaded] = useState(false);
  
  const isAddingPointRef = useRef(false);

  useEffect(() => {
    if (modelesLoaded && controlesLoaded) {
      setLoading(false);
    }
  }, [modelesLoaded, controlesLoaded]);

  // Chargement initial (sans wrapper - lectures)
  useEffect(() => {
    const fetchModelesCQ = async () => {
      if (!profile?.nomsociete) {
        console.log('ReferentielCQContext : En attente de nomsociete...');
        setModelesLoaded(true);
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
        setModelesLoaded(true);
      }
    };

    fetchModelesCQ();
  }, [profile?.nomsociete]);

  useEffect(() => {
    const fetchControles = async () => {
      if (!profile?.nomsociete) {
        console.log('ReferentielCQContext : En attente de nomsociete pour contrôles...');
        setControlesLoaded(true);
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
        setControlesLoaded(true);
      }
    };

    fetchControles();
  }, [profile?.nomsociete]);

  // ✅ CRUD Modèles (AVEC wrapper)
  const addModeleCQ = async (modeleData) => {
    return await supabaseWithSessionCheck(async () => {
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
    });
  };

  const updateModeleCQ = async (id, updates) => {
    return await supabaseWithSessionCheck(async () => {
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
    });
  };

  const deleteModeleCQ = async (id) => {
    return await supabaseWithSessionCheck(async () => {
      const { error } = await supabase
        .from('referentiels_controle_qualite')
        .delete()
        .eq('id', id)
        .eq('nomsociete', profile?.nomsociete);

      if (error) throw error;

      setModelesCQ(prev => prev.filter(m => m.id !== id));
      return { success: true };
    });
  };

  // ✅ Sauvegarde contrôle (AVEC wrapper)
  const saveControleFromModele = async (chantierId, modeleCQId, resultats, pointsSpecifiques) => {
    return await supabaseWithSessionCheck(async () => {
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
    });
  };

  const getControlesByChantier = (chantierId) => {
    return controles.filter(c => c.chantier_id === chantierId);
  };

  // ✅ Points de contrôle (AVEC wrapper)
  const addPointControleChantierSpecific = async (chantierId, modeleId, domaineId, sousCategorieId, pointData) => {
    return await supabaseWithSessionCheck(async () => {
      if (isAddingPointRef.current) {
        console.log('⚠️ addPointControleChantierSpecific déjà en cours, ignoré');
        return { success: false, message: 'Déjà en cours' };
      }

      isAddingPointRef.current = true;
      console.log('🔵 addPointControleChantierSpecific - Début', pointData.id);

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
        
        if (updatedPointsSpecifiques[domaineId][scKey][pointData.id]) {
          console.error('❌ Point déjà existant dans BDD avec ID:', pointData.id);
          return { success: false, message: 'Point déjà existant' };
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
          
          console.log('✅ Point sauvegardé en BDD:', pointData.id);
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
          
          console.log('✅ Contrôle créé avec point:', pointData.id);
          setControles(prev => [...prev, data]);
        }

        return { success: true };
      } finally {
        setTimeout(() => {
          isAddingPointRef.current = false;
          console.log('✅ addPointControleChantierSpecific - Protection désactivée');
        }, 1000);
      }
    });
  };

  const updatePointControleChantierSpecific = async (chantierId, modeleId, domaineId, sousCategorieId, pointId, updates) => {
    return await supabaseWithSessionCheck(async () => {
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
    });
  };

  const deletePointControleChantierSpecific = async (chantierId, modeleId, domaineId, sousCategorieId, pointId) => {
    return await supabaseWithSessionCheck(async () => {
      const existingControle = controles.find(
        c => c.chantier_id === chantierId && c.modele_cq_id === modeleId
      );

      if (!existingControle) throw new Error('Contrôle non trouvé');

      const scKey = sousCategorieId || '_global';
      let updatedPointsSpecifiques = { ...existingControle.points_specifiques };
      
      if (updatedPointsSpecifiques[domaineId]?.[scKey]?.[pointId]) {
        delete updatedPointsSpecifiques[domaineId][scKey][pointId];
      }

      const controlesSupprimes = existingControle.controles_supprimes || {};
      
      if (!controlesSupprimes.points) {
        controlesSupprimes.points = {};
      }
      if (!controlesSupprimes.points[domaineId]) {
        controlesSupprimes.points[domaineId] = {};
      }
      if (!controlesSupprimes.points[domaineId][sousCategorieId]) {
        controlesSupprimes.points[domaineId][sousCategorieId] = [];
      }
      if (!controlesSupprimes.points[domaineId][sousCategorieId].includes(pointId)) {
        controlesSupprimes.points[domaineId][sousCategorieId].push(pointId);
      }

      const { data, error } = await supabase
        .from('controles_qualite')
        .update({
          points_specifiques: updatedPointsSpecifiques,
          controles_supprimes: controlesSupprimes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingControle.id)
        .select()
        .single();

      if (error) throw error;
      setControles(prev => prev.map(c => c.id === existingControle.id ? data : c));

      return { success: true };
    });
  };

  // ✅ Suppression catégories (AVEC wrapper)
  const supprimerCategorie = async (chantierId, modeleId, categorieId) => {
    return await supabaseWithSessionCheck(async () => {
      const existingControle = controles.find(
        c => c.chantier_id === chantierId && c.modele_cq_id === modeleId
      );

      if (!existingControle) throw new Error('Contrôle non trouvé');

      const controlesSupprimes = existingControle.controles_supprimes || {};
      
      if (!controlesSupprimes.categories) {
        controlesSupprimes.categories = [];
      }
      
      if (!controlesSupprimes.categories.includes(categorieId)) {
        controlesSupprimes.categories.push(categorieId);
      }

      const { data, error } = await supabase
        .from('controles_qualite')
        .update({
          controles_supprimes: controlesSupprimes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingControle.id)
        .select()
        .single();

      if (error) throw error;
      
      setControles(prev => prev.map(c => c.id === existingControle.id ? data : c));

      return { success: true };
    });
  };

  const supprimerSousCategorie = async (chantierId, modeleId, categorieId, sousCategorieId) => {
    return await supabaseWithSessionCheck(async () => {
      const existingControle = controles.find(
        c => c.chantier_id === chantierId && c.modele_cq_id === modeleId
      );

      if (!existingControle) throw new Error('Contrôle non trouvé');

      const controlesSupprimes = existingControle.controles_supprimes || {};
      
      if (!controlesSupprimes.sous_categories) {
        controlesSupprimes.sous_categories = {};
      }
      if (!controlesSupprimes.sous_categories[categorieId]) {
        controlesSupprimes.sous_categories[categorieId] = [];
      }

      if (!controlesSupprimes.sous_categories[categorieId].includes(sousCategorieId)) {
        controlesSupprimes.sous_categories[categorieId].push(sousCategorieId);
      }

      const { data, error } = await supabase
        .from('controles_qualite')
        .update({
          controles_supprimes: controlesSupprimes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingControle.id)
        .select()
        .single();

      if (error) throw error;
      
      setControles(prev => prev.map(c => c.id === existingControle.id ? data : c));

      return { success: true };
    });
  };

  // ✅ Ajout catégories/sous-catégories (AVEC wrapper)
  const ajouterCategorieChantier = async (chantierId, modeleId, categorieData) => {
    return await supabaseWithSessionCheck(async () => {
      const existingControle = controles.find(
        c => c.chantier_id === chantierId && c.modele_cq_id === modeleId
      );

      if (!existingControle) throw new Error('Contrôle non trouvé');

      const categoriesSpecifiques = existingControle.categories_specifiques || [];
      const nouvelleCategorie = {
        id: `cat_specific_${Date.now()}`,
        nom: categorieData.nom,
        sousCategories: [],
        isChantierSpecific: true
      };

      categoriesSpecifiques.push(nouvelleCategorie);

      const { data, error } = await supabase
        .from('controles_qualite')
        .update({
          categories_specifiques: categoriesSpecifiques,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingControle.id)
        .select()
        .single();

      if (error) throw error;
      setControles(prev => prev.map(c => c.id === existingControle.id ? data : c));

      return { success: true, data: nouvelleCategorie };
    });
  };

  const ajouterSousCategorieChantier = async (chantierId, modeleId, categorieId, sousCategorieData) => {
    return await supabaseWithSessionCheck(async () => {
      const existingControle = controles.find(
        c => c.chantier_id === chantierId && c.modele_cq_id === modeleId
      );

      if (!existingControle) throw new Error('Contrôle non trouvé');

      const categoriesSpecifiques = existingControle.categories_specifiques || [];
      const nouvelleSousCategorie = {
        id: `scat_specific_${Date.now()}`,
        nom: sousCategorieData.nom,
        pointsControle: [],
        isChantierSpecific: true
      };

      const categorieIndex = categoriesSpecifiques.findIndex(cat => cat.id === categorieId);
      
      if (categorieIndex !== -1) {
        if (!categoriesSpecifiques[categorieIndex].sousCategories) {
          categoriesSpecifiques[categorieIndex].sousCategories = [];
        }
        categoriesSpecifiques[categorieIndex].sousCategories.push(nouvelleSousCategorie);

        const { data, error } = await supabase
          .from('controles_qualite')
          .update({
            categories_specifiques: categoriesSpecifiques,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingControle.id)
          .select()
          .single();

        if (error) throw error;
        setControles(prev => prev.map(c => c.id === existingControle.id ? data : c));

        return { success: true, data: nouvelleSousCategorie };
      } else {
        const sousCategoriesSpecifiques = existingControle.sous_categories_specifiques || {};
        if (!sousCategoriesSpecifiques[categorieId]) {
          sousCategoriesSpecifiques[categorieId] = [];
        }
        sousCategoriesSpecifiques[categorieId].push(nouvelleSousCategorie);

        const { data, error } = await supabase
          .from('controles_qualite')
          .update({
            sous_categories_specifiques: sousCategoriesSpecifiques,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingControle.id)
          .select()
          .single();

        if (error) throw error;
        setControles(prev => prev.map(c => c.id === existingControle.id ? data : c));

        return { success: true, data: nouvelleSousCategorie };
      }
    });
  };

  // Refresh (sans wrapper - lectures)
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
    supprimerCategorie,
    supprimerSousCategorie,
    ajouterCategorieChantier,
    ajouterSousCategorieChantier,
    refreshModeles,
    refreshControles
  };

  return (
    <ReferentielCQContext.Provider value={value}>
      {children}
    </ReferentielCQContext.Provider>
  );
}