import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
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

  const isLoadingRef = useRef(false);

  // ✅ Fonction loadAll réutilisable
  const loadAll = async () => {
    if (!profile?.nomsociete || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    try {
      console.log("📦 Chargement de toutes les données en parallèle...");
      
      const [
        chantiersResult,
        stResult,
        fournisseursResult,
        savResult,
        tachesResult,
        lotsResult
      ] = await Promise.all([
        supabase.from("chantiers").select("*").eq("nomsociete", profile.nomsociete).order("created_at", { ascending: false }),
        supabase.from("soustraitants").select("*").eq("nomsociete", profile.nomsociete).order("id", { ascending: false }),
        supabase.from("fournisseurs").select("*").eq("nomsociete", profile.nomsociete).order("created_at", { ascending: false }),
        supabase.from("sav").select("*, chantiers(nomchantier, nomsociete)").order("created_at", { ascending: false }),
        supabase.from("taches").select("*").order("created_at", { ascending: false }),
        supabase.from("lots").select("*").eq("nomsociete", profile.nomsociete)
      ]);

      if (chantiersResult.error) console.error("❌ Erreur loadChantiers :", chantiersResult.error);
      else {
        setChantiers(chantiersResult.data || []);
        console.log("✅ loadChantiers OK -", chantiersResult.data?.length, "chantiers");
      }

      if (stResult.error) console.error("❌ Erreur loadSousTraitants :", stResult.error);
      else {
        setSousTraitants(stResult.data || []);
        console.log("✅ loadSousTraitants OK -", stResult.data?.length);
      }

      if (fournisseursResult.error) console.error("❌ Erreur loadFournisseurs :", fournisseursResult.error);
      else {
        setFournisseurs(fournisseursResult.data || []);
        console.log("✅ loadFournisseurs OK -", fournisseursResult.data?.length);
      }

      if (savResult.error) console.error("❌ Erreur loadSAV :", savResult.error);
      else {
        setSav((savResult.data || []).filter(s => s.chantiers?.nomsociete === profile.nomsociete));
        console.log("✅ loadSAV OK");
      }

      if (tachesResult.error) {
        console.error("❌ Erreur loadTaches :", tachesResult.error);
        setTaches([]);
      } else {
        setTaches(tachesResult.data || []);
        console.log("✅ loadTaches OK -", tachesResult.data?.length);
      }

      if (lotsResult.error) console.error("❌ Erreur loadLots :", lotsResult.error);
      else {
        setLots(lotsResult.data || []);
        console.log("✅ loadLots OK -", lotsResult.data?.length);
      }

      console.log("✅✅✅ ChantierContext : TOUT EST CHARGÉ !");
    } catch (error) {
      console.error("❌ ChantierContext : Erreur chargement", error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
      console.log("🏁 setLoading(false) appelé");
    }
  };

  // ✅ Chargement initial
  useEffect(() => {
    if (!profile?.nomsociete) {
      console.log("⏳ ChantierContext : En attente de profile.nomsociete...");
      setLoading(false);
      return;
    }

    if (isLoadingRef.current) {
      console.log("⚠️ ChantierContext : Chargement déjà en cours, skip");
      return;
    }

    console.log("🚀 ChantierContext : Chargement des données pour", profile.nomsociete);
    
    const randomDelay = Math.random() * 800;
    console.log(`⏱️ ChantierContext : Délai de ${Math.round(randomDelay)}ms avant chargement`);
    
    const timer = setTimeout(() => {
      loadAll();
    }, randomDelay);
    
    return () => {
      clearTimeout(timer);
      isLoadingRef.current = false;
    };
  }, [profile?.nomsociete]);

  // ✅ Écouter les mises à jour de lots
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

  // ✅ NOUVEAU : Écouter la reconnexion Supabase
  useEffect(() => {
    const handleReconnect = () => {
      console.log('🔄 ChantierContext : Supabase reconnecté → Rechargement complet...');
      
      if (profile?.nomsociete) {
        // Petit délai pour laisser le client se stabiliser
        setTimeout(() => {
          loadAll();
        }, 500);
      }
    };

    window.addEventListener('supabase-reconnected', handleReconnect);
    
    return () => {
      window.removeEventListener('supabase-reconnected', handleReconnect);
    };
  }, [profile?.nomsociete]);

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

  const conflictsByChantier = useMemo(() => {
    const conflicts = {};
    
    const tachesNonValidees = taches.filter(t => !t.constructeur_valide && !t.terminee);
    
    tachesNonValidees.forEach(t => {
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

  const addTache = async (tache) => {
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

    const { data, error } = await supabase
      .from("taches")
      .insert([payload])
      .select("*")
      .single();

    if (error) throw error;
    
    if (data.assigneid && data.assignetype === 'soustraitant') {
      await supabase
        .from('notifications_taches_artisan')
        .insert({
          tache_id: data.id,
          soustraitant_id: data.assigneid,
          type: 'nouvelle_tache',
          vu: false
        });
    }
    
    setTaches(prev => [data, ...prev]);
    return data;
  };

  const updateTache = async (id, updates) => {
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
      await supabase
        .from('notifications_taches_artisan')
        .delete()
        .eq('tache_id', id)
        .eq('type', 'date_modifiee');
      
      await supabase
        .from('notifications_taches_artisan')
        .insert({
          tache_id: id,
          soustraitant_id: ancienneTache.assigneid,
          type: 'date_modifiee',
          vu: false
        });
    }
    
    setTaches(prev => prev.map(t => t.id === id ? data : t));
    return data;
  };

  const deleteTache = async (id) => {
    const { data, error } = await supabase
      .from("taches")
      .delete()
      .eq("id", id)
      .select();
    
    if (error) throw error;
    
    setTaches(prev => prev.filter(t => t.id !== id));
    return data;
  };

  const addChantier = async (chantier) => {
    const { data, error } = await supabase
      .from("chantiers")
      .insert([{ ...chantier, nomsociete: profile.nomsociete }])
      .select()
      .single();
    
    if (error) throw error;
    
    setChantiers(prev => [data, ...prev]);
    return data;
  };

  const updateChantier = async (id, updates) => {
    const { data, error } = await supabase
      .from("chantiers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    
    setChantiers(prev => prev.map(c => c.id === id ? data : c));
    return data;
  };

  const deleteChantier = async (id) => {
    await supabase.from("taches").delete().eq("chantierid", id);
    await supabase.from("sav").delete().eq("chantier_id", id);
    await supabase.from("commentaires_chantier").delete().eq("chantier_id", id);
    await supabase.from("documents_chantier").delete().eq("chantier_id", id);
    
    const { error } = await supabase
      .from("chantiers")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    setChantiers(prev => prev.filter(c => c.id !== id));
    setTaches(prev => prev.filter(t => t.chantierid !== id));
    setSav(prev => prev.filter(s => s.chantier_id !== id));
  };

  const addSousTraitant = async (st) => {
    const { data, error } = await supabase
      .from("soustraitants")
      .insert([{ ...st, nomsociete: profile.nomsociete }])
      .select()
      .single();
    
    if (error) throw error;
    
    setSousTraitants(prev => [data, ...prev]);
    return data;
  };

  const updateSousTraitant = async (id, updates) => {
    const { data, error } = await supabase
      .from("soustraitants")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    
    setSousTraitants(prev => prev.map(s => s.id === id ? data : s));
    return data;
  };

  const deleteSousTraitant = async (id) => {
    const { error } = await supabase
      .from("soustraitants")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    setSousTraitants(prev => prev.filter(s => s.id !== id));
  };

  const addFournisseur = async (f) => {
    const { data, error } = await supabase
      .from("fournisseurs")
      .insert([{ ...f, nomsociete: profile.nomsociete }])
      .select()
      .single();
    
    if (error) throw error;
    
    setFournisseurs(prev => [data, ...prev]);
    return data;
  };

  const updateFournisseur = async (id, updates) => {
    const { data, error } = await supabase
      .from("fournisseurs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    
    setFournisseurs(prev => prev.map(f => f.id === id ? data : f));
    return data;
  };

  const deleteFournisseur = async (id) => {
    const { error } = await supabase
      .from("fournisseurs")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    setFournisseurs(prev => prev.filter(f => f.id !== id));
  };

  const addSAV = async (s) => {
    const { data, error } = await supabase
      .from("sav")
      .insert([s])
      .select("*, chantiers(nomchantier, nomsociete)")
      .single();
    
    if (error) throw error;
    
    setSav(prev => [data, ...prev]);
    return data;
  };

  const updateSAV = async (id, updates) => {
    const { data, error } = await supabase
      .from("sav")
      .update(updates)
      .eq("id", id)
      .select("*, chantiers(nomchantier, nomsociete)")
      .single();
    
    if (error) throw error;
    
    setSav(prev => prev.map(s => s.id === id ? data : s));
    return data;
  };

  const deleteSAV = async (id) => {
    const { error } = await supabase
      .from("sav")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    setSav(prev => prev.filter(s => s.id !== id));
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