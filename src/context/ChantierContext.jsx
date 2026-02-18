import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase, supabaseWithSessionCheck } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { parseISO, format, eachDayOfInterval, startOfDay } from "date-fns";

export const ChantierContext = createContext();

export function ChantierProvider({ children }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);

  const [chantiers, setChantiers] = useState([]);
  const [sousTraitants, setSousTraitants] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [sav, setSav] = useState([]);
  const [taches, setTaches] = useState([]);
  const [lots, setLots] = useState([]);

  // ==========================================
  // CHARGEMENT INITIAL (inchangé)
  // ==========================================
  useEffect(() => {
    if (!profile?.nomsociete) {
      console.log("⏳ ChantierContext : En attente de profile.nomsociete...");
      setLoading(false);
      return;
    }

    console.log("🚀 ChantierContext : Chargement des données pour", profile.nomsociete);
    
    async function loadAll() {
      try {
        console.log("1️⃣ loadChantiers...");
        const { data: chantiersData, error: errorChantiers } = await supabase
          .from("chantiers")
          .select("*")
          .eq("nomsociete", profile.nomsociete)
          .order("created_at", { ascending: false });
        if (errorChantiers) console.error("❌ Erreur loadChantiers :", errorChantiers);
        setChantiers(chantiersData || []);
        console.log("✅ loadChantiers OK -", chantiersData?.length, "chantiers");
        
        console.log("2️⃣ loadSousTraitants...");
        const { data: stData, error: errorST } = await supabase
          .from("soustraitants")
          .select("*")
          .eq("nomsociete", profile.nomsociete)
          .order("id", { ascending: false });
        if (errorST) console.error("❌ Erreur loadSousTraitants :", errorST);
        setSousTraitants(stData || []);
        console.log("✅ loadSousTraitants OK -", stData?.length);
        
        console.log("3️⃣ loadFournisseurs...");
        const { data: fData, error: errorF } = await supabase
          .from("fournisseurs")
          .select("*")
          .eq("nomsociete", profile.nomsociete)
          .order("created_at", { ascending: false });
        if (errorF) console.error("❌ Erreur loadFournisseurs :", errorF);
        setFournisseurs(fData || []);
        console.log("✅ loadFournisseurs OK -", fData?.length);
        
        console.log("4️⃣ loadSAV...");
        const { data: savData, error: errorSAV } = await supabase
          .from("sav")
          .select("*, chantiers(nomchantier, nomsociete)")
          .order("created_at", { ascending: false });
        if (errorSAV) console.error("❌ Erreur loadSAV :", errorSAV);
        setSav((savData || []).filter(s => s.chantiers?.nomsociete === profile.nomsociete));
        console.log("✅ loadSAV OK");
        
        console.log("5️⃣ loadTaches...");
        const { data: tData, error: errorT } = await supabase
          .from("taches")
          .select("*")
          .order("created_at", { ascending: false });
        if (errorT) {
          console.error("❌ Erreur loadTaches :", errorT);
          setTaches([]);
        } else {
          setTaches(tData || []);
          console.log("✅ loadTaches OK -", tData?.length);
        }
        
        console.log("6️⃣ loadLots...");
        const { data: lotsData, error: errorLots } = await supabase
          .from("lots")
          .select("*")
          .eq("nomsociete", profile.nomsociete);
        if (errorLots) console.error("❌ Erreur loadLots :", errorLots);
        setLots(lotsData || []);
        console.log("✅ loadLots OK -", lotsData?.length);
        
        console.log("✅✅✅ ChantierContext : TOUT EST CHARGÉ !");
      } catch (error) {
        console.error("❌ ChantierContext : Erreur chargement", error);
      } finally {
        setLoading(false);
        console.log("🏁 setLoading(false) appelé");
      }
    }
    
    loadAll();
  }, [profile?.nomsociete]);

  useEffect(() => {
    const handleLotsUpdate = () => {
      console.log('🔔 ChantierContext : Lots mis à jour, rechargement...');
      loadLots();
    };

    window.addEventListener('lots-updated', handleLotsUpdate);
    
    return () => {
      window.removeEventListener('lots-updated', handleLotsUpdate);
    };
  }, [profile?.nomsociete]);

  // ==========================================
  // FONCTIONS DE RECHARGEMENT (inchangées)
  // ==========================================
  const loadChantiers = async () => {
    if (!profile?.nomsociete) return;
    const { data, error } = await supabase
      .from("chantiers")
      .select("*")
      .eq("nomsociete", profile.nomsociete)
      .order("created_at", { ascending: false });
    if (error) console.error("❌ Erreur loadChantiers :", error);
    setChantiers(data || []);
  };

  const loadSousTraitants = async () => {
    if (!profile?.nomsociete) return;
    const { data, error } = await supabase
      .from("soustraitants")
      .select("*")
      .eq("nomsociete", profile.nomsociete)
      .order("id", { ascending: false });
    if (error) console.error("❌ Erreur loadSousTraitants :", error);
    setSousTraitants(data || []);
  };

  const loadFournisseurs = async () => {
    if (!profile?.nomsociete) return;
    const { data, error } = await supabase
      .from("fournisseurs")
      .select("*")
      .eq("nomsociete", profile.nomsociete)
      .order("created_at", { ascending: false });
    if (error) console.error("❌ Erreur loadFournisseurs :", error);
    setFournisseurs(data || []);
  };

  const loadSAV = async () => {
    if (!profile?.nomsociete) return;
    const { data, error } = await supabase
      .from("sav")
      .select("*, chantiers(nomchantier, nomsociete)")
      .order("created_at", { ascending: false });
    if (error) console.error("❌ Erreur loadSAV :", error);
    setSav((data || []).filter(s => s.chantiers?.nomsociete === profile.nomsociete));
  };

  const loadTaches = async () => {
    const { data, error } = await supabase
      .from("taches")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("❌ Erreur loadTaches :", error);
      setTaches([]);
      return;
    }
    setTaches(data || []);
  };

  const loadLots = async () => {
    if (!profile?.nomsociete) return;
    const { data, error } = await supabase
      .from("lots")
      .select("*")
      .eq("nomsociete", profile.nomsociete);
    if (error) console.error("❌ Erreur loadLots :", error);
    setLots(data || []);
  };

  // ==========================================
  // CONFLITS (inchangé)
  // ==========================================
  const conflictsByChantier = useMemo(() => {
    const conflicts = {};
    
    taches.forEach(t => {
      if (!t.assigneid || t.assignetype !== "soustraitant" || !t.datedebut || !t.datefin) return;
      
      try {
        const start = startOfDay(parseISO(t.datedebut));
        const end = startOfDay(parseISO(t.datefin));
        const days = eachDayOfInterval({ start, end });
        
        days.forEach(day => {
          const key = `${t.assigneid}-${format(day, "yyyy-MM-dd")}`;
          
          if (!conflicts[key]) {
            conflicts[key] = { count: 0, chantierids: [], tacheIds: [] };
          }
          
          conflicts[key].count += 1;
          
          if (!conflicts[key].chantierids.includes(t.chantierid)) {
            conflicts[key].chantierids.push(t.chantierid);
          }
          
          if (!conflicts[key].tacheIds.includes(t.id)) {
            conflicts[key].tacheIds.push(t.id);
          }
        });
      } catch (err) {
        console.error("Erreur parsing date tâche:", t.id, err);
      }
    });
    
    Object.keys(conflicts).forEach(k => {
      if (conflicts[k].count <= 1 || conflicts[k].chantierids.length <= 1) {
        delete conflicts[k];
      }
    });
    
    return conflicts;
  }, [taches]);

  // ==========================================
  // ✅ CRUD TÂCHES (AVEC WRAPPER)
  // ==========================================
  const addTache = async (tache) => {
    return await supabaseWithSessionCheck(async () => {
      console.log('🔵 addTache DÉBUT - Payload reçu:', tache);
      
      if (!tache.chantierid || typeof tache.chantierid !== "string") {
        console.error('❌ chantierid invalide:', tache.chantierid);
        throw new Error("chantierid doit être un UUID valide.");
      }
      if (!tache.lotid || typeof tache.lotid !== "string") {
        console.error('❌ lotid invalide:', tache.lotid);
        throw new Error("lotid doit être un UUID valide.");
      }
      if (tache.assigneid && typeof tache.assigneid !== "string") {
        console.error('❌ assigneid invalide:', tache.assigneid);
        throw new Error("assigneid doit être un UUID valide si renseigné.");
      }

      console.log('✅ Validations OK, insertion dans Supabase...');

      const payload = {
        nom: tache.nom ?? null,
        description: tache.description ?? null,
        chantierid: tache.chantierid,
        lotid: tache.lotid,
        assigneid: tache.assigneid ?? null,
        assignetype: tache.assignetype ?? null,
        datedebut: tache.datedebut ?? null,
        datefin: tache.datefin ?? null,
        terminee: tache.terminee ?? false,
      };
      
      console.log('📦 Payload final:', payload);

      const { data, error } = await supabase
        .from("taches")
        .insert([payload])
        .select("*")
        .single();

      if (error) {
        console.error("❌ Erreur save tâche:", error);
        throw error;
      }

      console.log('✅ Tâche insérée en BDD:', data);
      
      if (data.assigneid && data.assignetype === 'soustraitant') {
        console.log('📬 Création notification nouvelle tâche pour artisan:', data.assigneid);
        
        const { error: notifError } = await supabase
          .from('notifications_taches_artisan')
          .insert({
            tache_id: data.id,
            soustraitant_id: data.assigneid,
            type: 'nouvelle_tache',
            vu: false
          });
        
        if (notifError) {
          console.error('⚠️ Erreur création notification (non bloquant):', notifError);
        } else {
          console.log('✅ Notification créée');
        }
      }
      
      setTaches(prev => [data, ...prev]);
      
      console.log('✅ addTache TERMINÉ');
      return data;
    });
  };

  const updateTache = async (id, updates) => {
    return await supabaseWithSessionCheck(async () => {
      if (updates.lotid && typeof updates.lotid !== "string") {
        throw new Error("lotid doit être un UUID valide.");
      }
      
      const { artisan_termine, artisan_termine_date, artisan_photos, artisan_commentaire, ...safeUpdates } = updates;
      
      const ancienneTache = taches.find(t => t.id === id);
      const dateDebutChangee = ancienneTache && ancienneTache.datedebut !== safeUpdates.datedebut;
      const dateFinChangee = ancienneTache && ancienneTache.datefin !== safeUpdates.datefin;
      const datesModifiees = (dateDebutChangee || dateFinChangee) && 
                             ancienneTache.assigneid && 
                             ancienneTache.assignetype === 'soustraitant';
      
      const { data, error } = await supabase
        .from("taches")
        .update({
          nom: safeUpdates.nom,
          description: safeUpdates.description ?? null,
          chantierid: safeUpdates.chantierid ?? null,
          lotid: safeUpdates.lotid ?? null,
          assigneid: safeUpdates.assigneid ?? null,
          assignetype: safeUpdates.assignetype ?? null,
          datedebut: safeUpdates.datedebut ?? null,
          datefin: safeUpdates.datefin ?? null,
          terminee: safeUpdates.terminee ?? false,
          constructeur_valide: safeUpdates.constructeur_valide ?? null,
          constructeur_valide_date: safeUpdates.constructeur_valide_date ?? null,
        })
        .eq("id", id)
        .select("*")
        .single();
        
      if (error) throw error;
      
      if (datesModifiees) {
        console.log('📬 Création notification dates modifiées pour artisan:', ancienneTache.assigneid);
        
        await supabase
          .from('notifications_taches_artisan')
          .delete()
          .eq('tache_id', id)
          .eq('type', 'date_modifiee');
        
        const { error: notifError } = await supabase
          .from('notifications_taches_artisan')
          .insert({
            tache_id: id,
            soustraitant_id: ancienneTache.assigneid,
            type: 'date_modifiee',
            vu: false
          });
        
        if (notifError) {
          console.error('⚠️ Erreur création notification (non bloquant):', notifError);
        } else {
          console.log('✅ Notification dates modifiées créée');
        }
      }
      
      setTaches(prev => prev.map(t => t.id === id ? data : t));
      return data;
    });
  };

  const deleteTache = async (id) => {
    return await supabaseWithSessionCheck(async () => {
      console.log("🗑️ Tentative de suppression tâche:", id);
      
      const { data, error } = await supabase
        .from("taches")
        .delete()
        .eq("id", id)
        .select();
      
      console.log("🗑️ Résultat suppression:", { data, error });
      
      if (error) {
        console.error("❌ Erreur suppression tâche:", error);
        throw error;
      }
      
      setTaches(prev => prev.filter(t => t.id !== id));
      console.log("✅ Tâche supprimée du state local");
      return data;
    });
  };

  // ==========================================
  // ✅ CRUD CHANTIERS (AVEC WRAPPER)
  // ==========================================
  const addChantier = async (chantier) => {
    return await supabaseWithSessionCheck(async () => {
      const { data, error } = await supabase
        .from("chantiers")
        .insert([{ ...chantier, nomsociete: profile.nomsociete }])
        .select()
        .single();
      
      if (error) throw error;
      
      setChantiers(prev => [data, ...prev]);
      return data;
    });
  };

  const updateChantier = async (id, updates) => {
    return await supabaseWithSessionCheck(async () => {
      console.log('📤 updateChantier - ID:', id);
      console.log('📤 updateChantier - Updates:', updates);
      
      const { data, error } = await supabase
        .from("chantiers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      console.log('📥 Réponse Supabase:', { data, error });
      
      if (error) {
        console.error('❌ Erreur Supabase updateChantier:', error);
        throw error;
      }
      
      console.log('✅ Chantier mis à jour:', data);
      
      setChantiers(prev => prev.map(c => c.id === id ? data : c));
      
      return data;
    });
  };

  const deleteChantier = async (id) => {
    return await supabaseWithSessionCheck(async () => {
      console.log('🗑️ Suppression chantier:', id);
      
      const { error: tachesError } = await supabase
        .from("taches")
        .delete()
        .eq("chantierid", id);
      
      if (tachesError) {
        console.error('❌ Erreur suppression tâches:', tachesError);
        throw tachesError;
      }
      
      console.log('✅ Tâches supprimées');
      
      const { error: savError } = await supabase
        .from("sav")
        .delete()
        .eq("chantier_id", id);
      
      if (savError) {
        console.warn('⚠️ Erreur suppression SAV:', savError);
      }
      
      const { error: commentairesError } = await supabase
        .from("commentaires_chantier")
        .delete()
        .eq("chantier_id", id);
      
      if (commentairesError) {
        console.warn('⚠️ Erreur suppression commentaires:', commentairesError);
      }
      
      const { error: documentsError } = await supabase
        .from("documents_chantier")
        .delete()
        .eq("chantier_id", id);
      
      if (documentsError) {
        console.warn('⚠️ Erreur suppression documents:', documentsError);
      }
      
      const { error: chantierError } = await supabase
        .from("chantiers")
        .delete()
        .eq("id", id);
      
      if (chantierError) {
        console.error('❌ Erreur suppression chantier:', chantierError);
        throw chantierError;
      }
      
      console.log('✅ Chantier supprimé');
      
      setChantiers(prev => prev.filter(c => c.id !== id));
      setTaches(prev => prev.filter(t => t.chantierid !== id));
      setSav(prev => prev.filter(s => s.chantier_id !== id));
    });
  };

  // ==========================================
  // ✅ CRUD SOUS-TRAITANTS (AVEC WRAPPER)
  // ==========================================
  const addSousTraitant = async (st) => {
    return await supabaseWithSessionCheck(async () => {
      const { data, error } = await supabase
        .from("soustraitants")
        .insert([{ ...st, nomsociete: profile.nomsociete }])
        .select()
        .single();
      
      if (error) throw error;
      
      setSousTraitants(prev => [data, ...prev]);
      return data;
    });
  };

  const updateSousTraitant = async (id, updates) => {
    return await supabaseWithSessionCheck(async () => {
      const { data, error } = await supabase
        .from("soustraitants")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      
      setSousTraitants(prev => prev.map(s => s.id === id ? data : s));
      return data;
    });
  };

  const deleteSousTraitant = async (id) => {
    return await supabaseWithSessionCheck(async () => {
      const { error } = await supabase
        .from("soustraitants")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setSousTraitants(prev => prev.filter(s => s.id !== id));
    });
  };

  // ==========================================
  // ✅ CRUD FOURNISSEURS (AVEC WRAPPER)
  // ==========================================
  const addFournisseur = async (f) => {
    return await supabaseWithSessionCheck(async () => {
      const { data, error } = await supabase
        .from("fournisseurs")
        .insert([{ ...f, nomsociete: profile.nomsociete }])
        .select()
        .single();
      
      if (error) throw error;
      
      setFournisseurs(prev => [data, ...prev]);
      return data;
    });
  };

  const updateFournisseur = async (id, updates) => {
    return await supabaseWithSessionCheck(async () => {
      const { data, error } = await supabase
        .from("fournisseurs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      
      setFournisseurs(prev => prev.map(f => f.id === id ? data : f));
      return data;
    });
  };

  const deleteFournisseur = async (id) => {
    return await supabaseWithSessionCheck(async () => {
      const { error } = await supabase
        .from("fournisseurs")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setFournisseurs(prev => prev.filter(f => f.id !== id));
    });
  };

  // ==========================================
  // ✅ CRUD SAV (AVEC WRAPPER)
  // ==========================================
  const addSAV = async (s) => {
    return await supabaseWithSessionCheck(async () => {
      const { data, error } = await supabase
        .from("sav")
        .insert([s])
        .select("*, chantiers(nomchantier, nomsociete)")
        .single();
      
      if (error) throw error;
      
      setSav(prev => [data, ...prev]);
      return data;
    });
  };

  const updateSAV = async (id, updates) => {
    return await supabaseWithSessionCheck(async () => {
      const { data, error } = await supabase
        .from("sav")
        .update(updates)
        .eq("id", id)
        .select("*, chantiers(nomchantier, nomsociete)")
        .single();
      
      if (error) throw error;
      
      setSav(prev => prev.map(s => s.id === id ? data : s));
      return data;
    });
  };

  const deleteSAV = async (id) => {
    return await supabaseWithSessionCheck(async () => {
      const { error } = await supabase
        .from("sav")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      setSav(prev => prev.filter(s => s.id !== id));
    });
  };

  return (
    <ChantierContext.Provider value={{
      loading,
      chantiers, loadChantiers, addChantier, updateChantier, deleteChantier,
      sousTraitants, loadSousTraitants, addSousTraitant, updateSousTraitant, deleteSousTraitant,
      fournisseurs, loadFournisseurs, addFournisseur, updateFournisseur, deleteFournisseur,
      sav, loadSAV, addSAV, updateSAV, deleteSAV,
      taches, loadTaches, addTache, updateTache, deleteTache,
      lots, loadLots,
      conflictsByChantier
    }}>
      {children}
    </ChantierContext.Provider>
  );
}

export function useChantier() {
  return useContext(ChantierContext);
}