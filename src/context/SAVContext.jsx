// src/context/SAVContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const SAVContext = createContext();

export function SAVProvider({ children }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [demandesSAV, setDemandesSAV] = useState([]);

  // -----------------------------
  // CHARGEMENT DES DEMANDES SAV
  // -----------------------------
  const loadSAV = async () => {
    if (!profile?.nomsociete) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("sav")
      .select("*")
      .eq("nomsociete", profile.nomsociete)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur loadSAV:", error);
    } else {
      setDemandesSAV(data || []);
      console.log(`✅ ${data?.length || 0} SAV chargées pour`, profile.nomsociete);
    }

    setLoading(false);
  };

  // -----------------------------
  // AJOUTER UNE DEMANDE SAV
  // -----------------------------
  const addSAV = async (savData) => {
    if (!profile?.nomsociete || !user) return;

    const payload = {
      nomClient: savData.nomClient,
      description: savData.description || null,
      responsable: savData.responsable || null,
      dateOuverture: savData.dateOuverture || new Date().toISOString(),
      datePrevisionnelle: savData.datePrevisionnelle || null,
      repriseValidee: savData.repriseValidee || false,
      dateValidationReprise: savData.dateValidationReprise || null,
      notes: savData.notes || null,
      nomsociete: profile.nomsociete,
    };

    const { data, error } = await supabase
      .from("sav")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      console.error("Erreur insertion SAV Supabase :", error);
      throw error;
    }

    setDemandesSAV((prev) => [data, ...prev]);
    return data;
  };

  // -----------------------------
  // METTRE À JOUR UNE DEMANDE SAV
  // -----------------------------
  const updateSAV = async (id, updates) => {
    const { data, error } = await supabase
      .from("sav")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    setDemandesSAV((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data } : s))
    );

    return data;
  };

  // -----------------------------
  // SUPPRIMER UNE DEMANDE SAV
  // -----------------------------
  const deleteSAV = async (id) => {
    const { error } = await supabase.from("sav").delete().eq("id", id);
    if (error) throw error;

    setDemandesSAV((prev) => prev.filter((s) => s.id !== id));
  };

  // -----------------------------
  // AUTO LOAD
  // -----------------------------
  useEffect(() => {
    if (!profile?.nomsociete) return;
    loadSAV();
  }, [profile?.nomsociete]);

  return (
    <SAVContext.Provider
      value={{
        loading,
        demandesSAV,
        loadSAV,
        addSAV,
        updateSAV,
        deleteSAV,
      }}
    >
      {children}
    </SAVContext.Provider>
  );
}

export function useSAV() {
  return useContext(SAVContext);
}
