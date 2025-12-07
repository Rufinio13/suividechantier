// src/context/FournisseurContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const FournisseurContext = createContext();

export function FournisseurProvider({ children }) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);

  const [fournisseurs, setFournisseurs] = useState([]);

  // -----------------------------
  // CHARGEMENT DES FOURNISSEURS
  // -----------------------------
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

  // -----------------------------
  // AJOUTER UN FOURNISSEUR
  // -----------------------------
  const addFournisseur = async (fournisseurData) => {
    if (!profile?.nomsociete || !user) return;

    const payload = {
      nomsocieteF: fournisseurData.nomsocieteF,
      nomcontact: fournisseurData.nomcontact || null,
      email: fournisseurData.email || null,
      telephone: fournisseurData.telephone || null,
      adresse: fournisseurData.adresse || null,
      assignedlots: fournisseurData.assignedlots || [],
      nomsociete: profile.nomsociete,
    };

    const { data, error } = await supabase
      .from("fournisseurs")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      console.error("Erreur insertion fournisseur Supabase :", error);
      throw error;
    }

    setFournisseurs((prev) => [data, ...prev]);
    return data;
  };

  // -----------------------------
  // METTRE À JOUR UN FOURNISSEUR
  // -----------------------------
  const updateFournisseur = async (id, updates) => {
    const { data, error } = await supabase
      .from("fournisseurs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    setFournisseurs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...data } : f))
    );

    return data;
  };

  // -----------------------------
  // SUPPRIMER UN FOURNISSEUR
  // -----------------------------
  const deleteFournisseur = async (id) => {
    const { error } = await supabase.from("fournisseurs").delete().eq("id", id);
    if (error) throw error;

    setFournisseurs((prev) => prev.filter((f) => f.id !== id));
  };

  // -----------------------------
  // AUTO LOAD
  // -----------------------------
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
