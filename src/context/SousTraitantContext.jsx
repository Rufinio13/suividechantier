import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const SousTraitantContext = createContext();

export function SousTraitantProvider({ children }) {
  const { user, profile } = useAuth();

  const [sousTraitants, setSousTraitants] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSousTraitants = async () => {
    if (!profile) {
      console.log("SousTraitantContext : En attente de profile...");
      setSousTraitants([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // ✅ ARTISAN : charger uniquement son propre enregistrement via user_id
    if (profile.user_type === 'artisan') {
      if (!user?.id) {
        setSousTraitants([]);
        setLoading(false);
        return;
      }

      console.log("⏳ Chargement sous-traitant artisan pour user_id :", user.id);

      const { data, error } = await supabase
        .from("soustraitants")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("❌ loadSousTraitants (artisan) :", error);
        setSousTraitants([]);
      } else {
        console.log("✅ Sous-traitant artisan chargé :", data?.length || 0, data);
        setSousTraitants(data || []);
      }

      setLoading(false);
      return;
    }

    // ✅ CONSTRUCTEUR : charger tous les sous-traitants de sa société
    if (!profile.nomsociete) {
      console.log("SousTraitantContext : En attente de nomsociete...");
      setSousTraitants([]);
      setLoading(false);
      return;
    }

    console.log("⏳ Chargement sous-traitants pour société :", profile.nomsociete);

    const { data, error } = await supabase
      .from("soustraitants")
      .select("*")
      .eq("nomsociete", profile.nomsociete)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ loadSousTraitants (constructeur) :", error);
      setSousTraitants([]);
    } else {
      console.log("✅ Sous-traitants chargés :", data?.length || 0);
      setSousTraitants(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSousTraitants();
  }, [profile?.user_type, profile?.nomsociete, user?.id]);

  useEffect(() => {
    const handleReconnect = () => {
      console.log('🔄 SousTraitantContext : Supabase reconnecté → Rechargement...');
      setTimeout(() => loadSousTraitants(), 500);
    };
    window.addEventListener('supabase-reconnected', handleReconnect);
    return () => window.removeEventListener('supabase-reconnected', handleReconnect);
  }, [profile?.user_type, profile?.nomsociete, user?.id]);

  const addSousTraitant = async (st) => {
    console.log("🔵 addSousTraitant - Début");

    if (!user || !profile?.nomsociete) {
      throw new Error("User ou société non définis");
    }

    const payload = {
      nomST: st.nomST || null,
      PrenomST: st.PrenomST || null,
      email: st.email || null,
      telephone: st.telephone || null,
      adresseST: st.adresseST || null,
      assigned_lots: st.assigned_lots || [],
      nomsociete: profile.nomsociete,
      nomsocieteST: st.nomsocieteST,
    };

    const { data, error } = await supabase
      .from("soustraitants")
      .insert([payload])
      .select()
      .single();

    if (error) { console.error("❌ Erreur Supabase:", error); throw error; }

    console.log("✅ Sous-traitant inséré :", data);
    setSousTraitants((prev) => [data, ...(prev || [])]);
    return data;
  };

  const updateSousTraitant = async (id, updates) => {
    console.log('📤 updateSousTraitant - ID:', id);

    // ✅ Récupérer le sous-traitant actuel pour avoir le user_id
    const stActuel = sousTraitants.find(s => s.id === id);

    const cleanUpdates = { ...updates };
    delete cleanUpdates.id;
    delete cleanUpdates.created_at;
    delete cleanUpdates.updated_at;
    delete cleanUpdates.user_id;
    delete cleanUpdates.nomsociete;
    // ✅ nomsocieteST N'EST PLUS supprimé — le constructeur peut modifier le nom

    const { data, error } = await supabase
      .from("soustraitants")
      .update(cleanUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) { console.error("❌ Erreur Supabase updateSousTraitant:", error); throw error; }

    // ✅ Si l'artisan a un compte, synchroniser nom/prénom dans profiles
    if (stActuel?.user_id) {
      const profileUpdates = {};
      if (cleanUpdates.nomST !== undefined) profileUpdates.nom = cleanUpdates.nomST || '';
      if (cleanUpdates.PrenomST !== undefined) profileUpdates.prenom = cleanUpdates.PrenomST || '';
      if (cleanUpdates.email !== undefined) profileUpdates.mail = cleanUpdates.email || '';
      if (cleanUpdates.telephone !== undefined) profileUpdates.tel = cleanUpdates.telephone || '';

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', stActuel.user_id);

        if (profileError) {
          console.error('⚠️ Erreur sync profiles:', profileError);
        } else {
          console.log('✅ Profil artisan synchronisé:', profileUpdates);
        }
      }
    }

    console.log("✅ Sous-traitant mis à jour:", data);
    setSousTraitants((prev) => (prev || []).map((s) => (s.id === id ? data : s)));
    return data;
  };

  const deleteSousTraitant = async (id) => {
    console.log("📤 Delete ST :", id);

    const { error } = await supabase
      .from("soustraitants")
      .delete()
      .eq("id", id)
      .eq("nomsociete", profile?.nomsociete);

    if (error) { console.error("❌ deleteSousTraitant :", error); throw error; }

    setSousTraitants((prev) => (prev || []).filter((s) => s.id !== id));
    console.log("✅ ST supprimé du state local");
    return true;
  };

  return (
    <SousTraitantContext.Provider
      value={{
        sousTraitants: sousTraitants || [],
        loading,
        loadSousTraitants,
        addSousTraitant,
        updateSousTraitant,
        deleteSousTraitant,
      }}
    >
      {children}
    </SousTraitantContext.Provider>
  );
}

export function useSousTraitant() {
  const ctx = useContext(SousTraitantContext);
  if (!ctx) throw new Error("useSousTraitant utilisé hors provider !");
  return ctx;
}