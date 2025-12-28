import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
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

  // ---------------------
  // CHARGEMENT DES DONNÉES - useEffect avec requêtes directes
  // ---------------------
  useEffect(() => {
    if (!profile?.nomsociete) {
      console.log("⏳ ChantierContext : En attente de profile.nomsociete...");
      setLoading(false);
      return;
    }

    console.log("🚀 ChantierContext : Chargement des données pour", profile.nomsociete);
    
    async function loadAll() {
      try {
        // 1️⃣ Chantiers
        console.log("1️⃣ loadChantiers...");
        const { data: chantiersData, error: errorChantiers } = await supabase
          .from("chantiers")
          .select("*")
          .eq("nomsociete", profile.nomsociete)
          .order("created_at", { ascending: false });
        if (errorChantiers) console.error("❌ Erreur loadChantiers :", errorChantiers);
        setChantiers(chantiersData || []);
        console.log("✅ loadChantiers OK -", chantiersData?.length, "chantiers");
        
        // 2️⃣ Sous-traitants
        console.log("2️⃣ loadSousTraitants...");
        const { data: stData, error: errorST } = await supabase
          .from("soustraitants")
          .select("*")
          .eq("nomsociete", profile.nomsociete)
          .order("id", { ascending: false });
        if (errorST) console.error("❌ Erreur loadSousTraitants :", errorST);
        setSousTraitants(stData || []);
        console.log("✅ loadSousTraitants OK -", stData?.length);
        
        // 3️⃣ Fournisseurs
        console.log("3️⃣ loadFournisseurs...");
        const { data: fData, error: errorF } = await supabase
          .from("fournisseurs")
          .select("*")
          .eq("nomsociete", profile.nomsociete)
          .order("created_at", { ascending: false });
        if (errorF) console.error("❌ Erreur loadFournisseurs :", errorF);
        setFournisseurs(fData || []);
        console.log("✅ loadFournisseurs OK -", fData?.length);
        
        // 4️⃣ SAV
        console.log("4️⃣ loadSAV...");
        const { data: savData, error: errorSAV } = await supabase
          .from("sav")
          .select("*, chantiers(nomchantier, nomsociete)")
          .order("created_at", { ascending: false });
        if (errorSAV) console.error("❌ Erreur loadSAV :", errorSAV);
        setSav((savData || []).filter(s => s.chantiers?.nomsociete === profile.nomsociete));
        console.log("✅ loadSAV OK");
        
        // 5️⃣ Tâches
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
        
        // 6️⃣ Lots
        console.log("6️⃣ loadLots...");
        const { data: lotsData, error: errorLots } = await supabase
          .from("lots")
          .select("*");
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

  // ✅ ÉCOUTER LES MISES À JOUR DE LOTS DEPUIS LotsContext
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

  // ---------------------
  // FONCTIONS DE RECHARGEMENT MANUEL (pour refresh après CRUD)
  // ---------------------
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
    const { data, error } = await supabase
      .from("lots")
      .select("*");
    if (error) console.error("❌ Erreur loadLots :", error);
    setLots(data || []);
  };

  // ---------------------
  // ✅ CONFLITS ARTISANS - CORRIGÉ POUR DÉTECTER SUR TOUTE LA PÉRIODE
  // ---------------------
  const conflictsByChantier = useMemo(() => {
    const conflicts = {};
    
    // Pour chaque tâche avec artisan assigné
    taches.forEach(t => {
      if (!t.assigneid || t.assignetype !== "soustraitant" || !t.datedebut || !t.datefin) return;
      
      try {
        const start = startOfDay(parseISO(t.datedebut));
        const end = startOfDay(parseISO(t.datefin));
        
        // Pour CHAQUE jour de la tâche
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
    
    // Supprimer les entrées sans conflit (1 seule tâche ou 1 seul chantier)
    Object.keys(conflicts).forEach(k => {
      if (conflicts[k].count <= 1 || conflicts[k].chantierids.length <= 1) {
        delete conflicts[k];
      }
    });
    
    return conflicts;
  }, [taches]);

  // ---------------------
  // CRUD TACHES
  // ---------------------
  const addTache = async (tache) => {
    console.log('🔵 addTache DÉBUT - Payload reçu:', tache);
    
    try {
      // ✅ VÉRIFIER LA SESSION
      console.log('🔍 Vérification session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      console.log("🔐 Résultat getSession:", { 
        hasData: !!sessionData,
        hasSession: !!sessionData?.session,
        userId: sessionData?.session?.user?.id,
        error: sessionError
      });

      if (sessionError) {
        console.error('❌ Erreur getSession:', sessionError);
        alert('Session expirée. Veuillez vous reconnecter.');
        window.location.href = '/login';
        return;
      }

      if (!sessionData?.session) {
        console.error('❌ Pas de session active !');
        alert('Session expirée. Veuillez vous reconnecter.');
        window.location.href = '/login';
        return;
      }

      const session = sessionData.session;
      console.log('✅ Session valide, userId:', session.user.id);

      // Vérification des UUID
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

      const { data, error } = await supabase
        .from("taches")
        .insert([{
          nom: tache.nom ?? null,
          description: tache.description ?? null,
          chantierid: tache.chantierid,
          lotid: tache.lotid,
          assigneid: tache.assigneid ?? null,
          assignetype: tache.assignetype ?? null,
          datedebut: tache.datedebut ?? null,
          datefin: tache.datefin ?? null,
          terminee: tache.terminee ?? false,
        }])
        .select("*")
        .single();

      console.log('📡 Réponse Supabase:', { data, error });

      if (error) {
        console.error("❌ Erreur save tâche:", error);
        console.error("❌ Détails erreur:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Tâche insérée en BDD:', data);
      setTaches(prev => {
        const newTaches = [data, ...prev];
        console.log('✅ Tâches mises à jour dans le state, total:', newTaches.length);
        return newTaches;
      });
      
      console.log('✅ addTache TERMINÉ');
      return data;
    } catch (error) {
      console.error('❌ Exception dans addTache:', error);
      console.error('❌ Stack:', error.stack);
      throw error;
    }
  };

  const updateTache = async (id, updates) => {
    if (updates.lotid && typeof updates.lotid !== "string") {
      throw new Error("lotid doit être un UUID valide.");
    }
    const { data, error } = await supabase
      .from("taches")
      .update({
        nom: updates.nom,
        description: updates.description ?? null,
        chantierid: updates.chantierid ?? null,
        lotid: updates.lotid ?? null,
        assigneid: updates.assigneid ?? null,
        assignetype: updates.assignetype ?? null,
        datedebut: updates.datedebut ?? null,
        datefin: updates.datefin ?? null,
        terminee: updates.terminee ?? false,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    setTaches(prev => prev.map(t => t.id === id ? data : t));
    return data;
  };

  const deleteTache = async (id) => {
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
  };

  // ---------------------
  // CRUD CHANTIERS / SOUS-TRAITANTS / FOURNISSEURS / SAV
  // ---------------------
  const addChantier = async (chantier) => {
    const { data, error } = await supabase.from("chantiers").insert([chantier]).select().single();
    if (error) throw error;
    setChantiers(prev => [data, ...prev]);
    return data;
  };

  const updateChantier = async (id, updates) => {
    console.log('📤 updateChantier - ID:', id);
    console.log('📤 updateChantier - Updates:', updates);
    
    try {
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
    } catch (error) {
      console.error('❌ Exception updateChantier:', error);
      throw error;
    }
  };

  const deleteChantier = async (id) => {
    const { error } = await supabase.from("chantiers").delete().eq("id", id);
    if (error) throw error;
    setChantiers(prev => prev.filter(c => c.id !== id));
  };

  const addSousTraitant = async (st) => setSousTraitants(prev => [st, ...prev]);
  const updateSousTraitant = async (id, updates) => setSousTraitants(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  const deleteSousTraitant = async (id) => setSousTraitants(prev => prev.filter(s => s.id !== id));

  const addFournisseur = async (f) => setFournisseurs(prev => [f, ...prev]);
  const updateFournisseur = async (id, updates) => setFournisseurs(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  const deleteFournisseur = async (id) => setFournisseurs(prev => prev.filter(f => f.id !== id));

  const addSAV = async (s) => setSav(prev => [s, ...prev]);
  const updateSAV = async (id, updates) => setSav(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  const deleteSAV = async (id) => setSav(prev => prev.filter(s => s.id !== id));

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