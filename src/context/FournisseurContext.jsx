import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseWithSessionCheck } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const FournisseurContext = createContext();

export function FournisseurProvider({ children }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);

  const [fournisseurs, setFournisseurs] = useState([]);

  // CHARGEMENT DES FOURNISSEURS (sans wrapper - lecture)
  const loadFournisseurs = async () => {
    if (!profile?.nomsociete) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("fournisseurs")
      .select("*")
      .eq("nomsociete", profile.nomsociete)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur loadFournisseurs:", error);
    } else {
      setFournisseurs(data || []);
      console.log(`✅ ${data?.length || 0} fournisseurs chargés pour`, profile.nomsociete);
    }

    setLoading(false);
  };

  // ✅ AJOUTER UN FOURNISSEUR (AVEC wrapper)
  const addFournisseur = async (fournisseurData) => {
    return await supabaseWithSessionCheck(async () => {
      console.log("🔵 addFournisseur - Début");
      
      if (!profile?.nomsociete || !user) {
        throw new Error("User ou société non définis");
      }

      const payload = {
        nomsocieteF: fournisseurData.nomsocieteF,
        nomcontact: fournisseurData.nomcontact || null,
        email: fournisseurData.email || null,
        telephone: fournisseurData.telephone || null,
        adresse: fournisseurData.adresse || null,
        assignedlots: fournisseurData.assignedlots || [],
        nomsociete: profile.nomsociete,
      };

      console.log("📦 Payload fournisseur:", payload);
      console.log('🚀 Appel Supabase.from("fournisseurs").insert()...');

      const { data, error } = await supabase
        .from("fournisseurs")
        .insert([payload])
        .select("*")
        .single();

      console.log('📡 Réponse Supabase:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error("❌ Erreur insertion fournisseur:", error);
        throw error;
      }

      console.log("✅ Fournisseur ajouté:", data);
      setFournisseurs((prev) => [data, ...prev]);
      return data;
    });
  };

  // ✅ METTRE À JOUR UN FOURNISSEUR (AVEC wrapper)
  const updateFournisseur = async (id, updates) => {
    return await supabaseWithSessionCheck(async () => {
      console.log('📤 updateFournisseur - ID:', id);
      
      const cleanUpdates = { ...updates };
      delete cleanUpdates.id;
      delete cleanUpdates.created_at;
      delete cleanUpdates.updated_at;
      delete cleanUpdates.user_id;
      delete cleanUpdates.nomsociete;
      
      const { data, error } = await supabase
        .from("fournisseurs")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("❌ Erreur Supabase updateFournisseur:", error);
        throw error;
      }

      console.log("✅ Fournisseur mis à jour:", data);
      setFournisseurs((prev) =>
        prev.map((f) => (f.id === id ? data : f))
      );

      return data;
    });
  };

  // ✅ SUPPRIMER UN FOURNISSEUR (AVEC wrapper)
  const deleteFournisseur = async (id) => {
    return await supabaseWithSessionCheck(async () => {
      const { error } = await supabase.from("fournisseurs").delete().eq("id", id);
      if (error) throw error;

      setFournisseurs((prev) => prev.filter((f) => f.id !== id));
    });
  };

  // AUTO LOAD
  useEffect(() => {
    if (!profile?.nomsociete) return;
    loadFournisseurs();
  }, [profile?.nomsociete]);

  return (
    <FournisseurContext.Provider
      value={{
        loading,
        fournisseurs,
        loadFournisseurs,
        addFournisseur,
        updateFournisseur,
        deleteFournisseur,
      }}
    >
      {children}
    </FournisseurContext.Provider>
  );
}

export function useFournisseur() {
  return useContext(FournisseurContext);
}