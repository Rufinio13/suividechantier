// src/context/SAVContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, supabaseWithSessionCheck } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const SAVContext = createContext();

export function SAVProvider({ children }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [demandesSAV, setDemandesSAV] = useState([]);

  // CHARGEMENT (sans wrapper - c'est juste une lecture)
  const loadSAV = useCallback(async () => {
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
  }, [profile?.nomsociete]);

  // ✅ AJOUTER (AVEC wrapper)
  const addSAV = async (savData) => {
    return await supabaseWithSessionCheck(async () => {
      if (!profile?.nomsociete || !user) return;

      const descriptionsJSON = JSON.stringify(savData.descriptions || []);

      const payload = {
        nomClient: savData.nomClient,
        description: descriptionsJSON,
        soustraitant_id: savData.soustraitant_id || null,
        dateOuverture: savData.dateOuverture || new Date().toISOString(),
        datePrevisionnelle: savData.datePrevisionnelle || null,
        constructeur_valide: savData.constructeur_valide || false,
        constructeur_valide_date: savData.constructeur_valide_date || null,
        nomsociete: profile.nomsociete,
      };

      const { data, error } = await supabase
        .from("sav")
        .insert([payload])
        .select("*")
        .single();

      if (error) {
        console.error("❌ Erreur insertion SAV Supabase :", error);
        throw error;
      }

      setDemandesSAV((prev) => [data, ...prev]);
      return data;
    });
  };

  // ✅ METTRE À JOUR (AVEC wrapper)
  const updateSAV = async (id, updates) => {
    return await supabaseWithSessionCheck(async () => {
      if (updates.descriptions) {
        updates.description = JSON.stringify(updates.descriptions);
        delete updates.descriptions;
      }

      const { data, error } = await supabase
        .from("sav")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        console.error("❌ Erreur update SAV:", error);
        throw error;
      }

      setDemandesSAV((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s))
      );

      return data;
    });
  };

  // ✅ TOGGLE LIGNE (AVEC wrapper)
  const toggleDescriptionLigne = async (savId, ligneIndex) => {
    return await supabaseWithSessionCheck(async () => {
      const sav = demandesSAV.find(s => s.id === savId);
      if (!sav) return;

      let descriptions = [];
      try {
        descriptions = typeof sav.description === 'string' 
          ? JSON.parse(sav.description) 
          : sav.description;
      } catch {
        descriptions = [{ texte: sav.description, checked: false }];
      }

      descriptions[ligneIndex].checked = !descriptions[ligneIndex].checked;

      await updateSAV(savId, {
        description: JSON.stringify(descriptions)
      });
    });
  };

  // ✅ SUPPRIMER (AVEC wrapper)
  const deleteSAV = async (id) => {
    return await supabaseWithSessionCheck(async () => {
      const { error } = await supabase.from("sav").delete().eq("id", id);
      if (error) {
        console.error("❌ Erreur delete SAV:", error);
        throw error;
      }

      setDemandesSAV((prev) => prev.filter((s) => s.id !== id));
    });
  };

  useEffect(() => {
    if (!profile?.nomsociete) return;
    loadSAV();
  }, [profile?.nomsociete, loadSAV]);

  return (
    <SAVContext.Provider
      value={{
        loading,
        demandesSAV,
        loadSAV,
        addSAV,
        updateSAV,
        deleteSAV,
        toggleDescriptionLigne,
      }}
    >
      {children}
    </SAVContext.Provider>
  );
}

export function useSAV() {
  return useContext(SAVContext);
}