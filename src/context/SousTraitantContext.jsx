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
    // ✅ VÉRIFIER LA SESSION EN DÉTAIL
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log("🔐 Session avant insert:", { 
      hasSession: !!session, 
      userId: session?.user?.id,
      expiresAt: session?.expires_at,
      accessToken: session?.access_token ? 'présent' : 'absent',
      error: sessionError
    });

    if (!session) {
      throw new Error("Session Supabase expirée");
    }
    
    console.log("📥 addSousTraitant appelé avec:", st);
    
    if (!user || !profile?.nomsociete) {
      console.error("❌ User ou nomsociete manquant:", { user: !!user, nomsociete: profile?.nomsociete });
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

    console.log("📤 Insertion ST payload :", payload);

    try {
      console.log("🔄 Appel Supabase insert...");
      
      // ✅ Ajouter un timeout de 10 secondes
      const insertPromise = supabase
        .from("soustraitants")
        .insert([payload])
        .select()
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: la requête a pris plus de 10 secondes')), 10000)
      );
      
      const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

      console.log("📥 Réponse Supabase:", { data, error });

      if (error) {
        console.error("❌ Erreur Supabase:", error);
        throw error;
      }

      if (!data) {
        throw new Error("Aucune donnée retournée par Supabase");
      }

      console.log("✅ Sous-traitant inséré :", data);
      setSousTraitants((prev) => [data, ...(prev || [])]);
      return data;
    } catch (err) {
      console.error("❌ Exception addSousTraitant:", err);
      throw err;
    }
  };

  // ---- Mise à jour d'un sous-traitant ----
  const updateSousTraitant = async (id, updates) => {
    console.log('📤 updateSousTraitant - ID:', id);
    console.log('📤 updateSousTraitant - Updates BRUT:', updates);
    console.log('📤 updateSousTraitant - nomsociete:', profile?.nomsociete);
    
    try {
      // ✅ NETTOYER les updates : enlever id, created_at, updated_at, user_id, nomsociete, nomsocieteST
      const cleanUpdates = { ...updates };
      delete cleanUpdates.id;
      delete cleanUpdates.created_at;
      delete cleanUpdates.updated_at;
      delete cleanUpdates.user_id;
      delete cleanUpdates.nomsociete;
      delete cleanUpdates.nomsocieteST;
      
      console.log('📤 updateSousTraitant - Updates NETTOYÉS:', cleanUpdates);
      
      const { data, error } = await supabase
        .from("soustraitants")
        .update(cleanUpdates)
        .eq("id", id)
        .eq("nomsociete", profile?.nomsociete)
        .select()
        .single();

      console.log('📥 Réponse Supabase:', { data, error });

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
      throw error;
    }
  };

  // ---- Suppression d'un ST ----
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

// ---- Hook sécurisé ----
export function useSousTraitant() {
  const ctx = useContext(SousTraitantContext);
  if (!ctx) {
    console.error("🚨 useSousTraitant doit être utilisé dans un <SousTraitantProvider>");
    throw new Error("useSousTraitant utilisé hors provider !");
  }
  return ctx;
}