import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const SousTraitantContext = createContext();

export function SousTraitantProvider({ children }) {
  const { user, profile } = useAuth();

  const [sousTraitants, setSousTraitants] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // ✅ Chargement initial
  useEffect(() => {
    loadSousTraitants();
  }, [profile?.nomsociete]);

  // ✅ NOUVEAU : Écouter la reconnexion Supabase
  useEffect(() => {
    const handleReconnect = () => {
      console.log('🔄 SousTraitantContext : Supabase reconnecté → Rechargement...');
      
      if (profile?.nomsociete) {
        setTimeout(() => {
          loadSousTraitants();
        }, 500);
      }
    };

    window.addEventListener('supabase-reconnected', handleReconnect);
    
    return () => {
      window.removeEventListener('supabase-reconnected', handleReconnect);
    };
  }, [profile?.nomsociete]);

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

    console.log("📦 Payload ST:", payload);

    const { data, error } = await supabase
      .from("soustraitants")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur Supabase:", error);
      throw error;
    }

    console.log("✅ Sous-traitant inséré :", data);
    setSousTraitants((prev) => [data, ...(prev || [])]);
    return data;
  };

  const updateSousTraitant = async (id, updates) => {
    console.log('📤 updateSousTraitant - ID:', id);
    
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
  };

  const deleteSousTraitant = async (id) => {
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