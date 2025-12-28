import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const SousTraitantContext = createContext();

export function SousTraitantProvider({ children }) {
  const { user, profile } = useAuth();

  const [sousTraitants, setSousTraitants] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- Charger les sous-traitants ----
  useEffect(() => {
    const loadSousTraitants = async () => {
      if (!profile?.nomsociete) {
        console.log("SousTraitantContext : En attente de nomsociete...");
        setSousTraitants([]);
        setLoading(false);
        return;
      }

      console.log("⏳ Chargement sous-traitants pour société :", profile.nomsociete);
      setLoading(true);

      const { data, error } = await supabase
        .from("soustraitants")
        .select("*")
        .eq("nomsociete", profile.nomsociete)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("❌ loadSousTraitants :", error);
        setSousTraitants([]);
      } else {
        console.log("✅ Sous-traitants chargés :", data?.length || 0);
        setSousTraitants(data || []);
      }

      setLoading(false);
    };

    loadSousTraitants();

    // Realtime
    if (profile?.nomsociete) {
      const channel = supabase
        .channel("soustraitants-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "soustraitants" },
          () => {
            console.log("🔄 Realtime : modification détectée sur soustraitants → reload");
            loadSousTraitants();
          }
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [profile?.nomsociete]);

  // ---- Ajouter un sous-traitant ----
  const addSousTraitant = async (st) => {
    try {
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
        user_id: user.id,
        nomsociete: profile.nomsociete,
        nomsocieteST: st.nomsocieteST,
      };

      console.log("📦 Payload ST:", payload);
      console.log('🚀 Appel Supabase.from("soustraitants").insert()...');

      // ✅ Timeout de 10 secondes
      const insertPromise = supabase
        .from("soustraitants")
        .insert([payload])
        .select()
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.error('⏰ TIMEOUT addSousTraitant ! 30 secondes dépassées');
          reject(new Error('Timeout: la requête a pris plus de 30 secondes'));
        }, 30000) // 30 secondes
      );

      console.log('⏳ En attente réponse Supabase...');
      const result = await Promise.race([insertPromise, timeoutPromise]);
      const { data, error } = result;

      console.log('📡 Réponse Supabase:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error("❌ Erreur Supabase:", error);
        throw error;
      }

      console.log("✅ Sous-traitant inséré :", data);
      setSousTraitants((prev) => [data, ...(prev || [])]);
      return data;
    } catch (err) {
      console.error("❌ Exception addSousTraitant:", err);
      alert(`Erreur lors de la création du sous-traitant: ${err.message}`);
      throw err;
    }
  };

  // ---- Mise à jour d'un sous-traitant ----
  const updateSousTraitant = async (id, updates) => {
    try {
      console.log('📤 updateSousTraitant - ID:', id);
      
      // ✅ NETTOYER les updates
      const cleanUpdates = { ...updates };
      delete cleanUpdates.id;
      delete cleanUpdates.created_at;
      delete cleanUpdates.updated_at;
      delete cleanUpdates.user_id;
      delete cleanUpdates.nomsociete;
      delete cleanUpdates.nomsocieteST;
      
      const { data, error } = await supabase
        .from("soustraitants")
        .update(cleanUpdates)
        .eq("id", id)
        .eq("nomsociete", profile?.nomsociete)
        .select()
        .single();

      if (error) {
        console.error("❌ Erreur Supabase updateSousTraitant:", error);
        throw error;
      }

      console.log("✅ Sous-traitant mis à jour:", data);
      setSousTraitants((prev) =>
        (prev || []).map((s) => (s.id === id ? data : s))
      );

      return data;
    } catch (error) {
      console.error('❌ Exception updateSousTraitant:', error);
      alert(`Erreur lors de la modification: ${error.message}`);
      throw error;
    }
  };

  // ---- Suppression d'un ST ----
  const deleteSousTraitant = async (id) => {
    try {
      console.log("📤 Delete ST :", id);

      const { error } = await supabase
        .from("soustraitants")
        .delete()
        .eq("id", id)
        .eq("nomsociete", profile?.nomsociete);

      if (error) {
        console.error("❌ deleteSousTraitant :", error);
        throw error;
      }

      setSousTraitants((prev) => (prev || []).filter((s) => s.id !== id));
      console.log("✅ ST supprimé du state local");
      return true;
    } catch (error) {
      console.error('❌ Exception deleteSousTraitant:', error);
      alert(`Erreur lors de la suppression: ${error.message}`);
      throw error;
    }
  };

  // ---- Rafraîchir manuellement ----
  const loadSousTraitants = async () => {
    if (!profile?.nomsociete) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("soustraitants")
      .select("*")
      .eq("nomsociete", profile.nomsociete)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ loadSousTraitants :", error);
      setSousTraitants([]);
    } else {
      setSousTraitants(data || []);
    }

    setLoading(false);
    return data;
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
  if (!ctx) {
    throw new Error("useSousTraitant utilisé hors provider !");
  }
  return ctx;
}