import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const SousTraitantContext = createContext();

export function SousTraitantProvider({ children }) {
  const { user, profile } = useAuth();

  const [sousTraitants, setSousTraitants] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- 1 : Charger les sous-traitants ----
  const loadSousTraitants = async () => {
    if (!profile?.nomsociete) {
      console.warn("⚠ loadSousTraitants : aucune société dans profile → stop");
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
    return data;
  };

  // ---- 2 : Ajouter un sous-traitant ----
  const addSousTraitant = async (st) => {
    if (!user || !profile?.nomsociete) return;

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

    console.log("📤 Insertion ST payload :", payload);

    const { data, error } = await supabase
      .from("soustraitants")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("❌ addSousTraitant :", error);
      throw error;
    }

    console.log("✅ Sous-traitant inséré :", data);
    setSousTraitants((prev) => [data, ...(prev || [])]);
    return data;
  };

  // ---- 3 : Mise à jour d’un sous-traitant ----
  const updateSousTraitant = async (id, updates) => {
    console.log("📤 Update ST :", id, updates);

    const { data, error } = await supabase
      .from("soustraitants")
      .update({ ...updates })
      .eq("id", id)
      .eq("nomsociete", profile.nomsociete)
      .select()
      .single();

    if (error) {
      console.error("❌ updateSousTraitant :", error);
      throw error;
    }

    console.log("✅ Update ST retour :", data);
    setSousTraitants((prev) =>
      (prev || []).map((s) => (s.id === id ? { ...s, ...data } : s))
    );

    return data;
  };

  // ---- 4 : Suppression d’un ST ----
  const deleteSousTraitant = async (id) => {
    console.log("📤 Delete ST :", id);

    const { error } = await supabase
      .from("soustraitants")
      .delete()
      .eq("id", id)
      .eq("nomsociete", profile.nomsociete);

    if (error) {
      console.error("❌ deleteSousTraitant :", error);
      throw error;
    }

    setSousTraitants((prev) => (prev || []).filter((s) => s.id !== id));
    console.log("✅ ST supprimé du state local");

    return true;
  };

  // ---- 5 : Auto-load + realtime ----
  useEffect(() => {
    loadSousTraitants();

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
  }, [profile?.nomsociete]);

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

// ---- 6 : Hook sécurisé ----
export function useSousTraitant() {
  const ctx = useContext(SousTraitantContext);
  if (!ctx) {
    console.error("🚨 useSousTraitant doit être utilisé dans un <SousTraitantProvider>");
    throw new Error("useSousTraitant utilisé hors provider !");
  }
  return ctx;
}
