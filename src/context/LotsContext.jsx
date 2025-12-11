import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

const LotsContext = createContext();

export function LotsProvider({ children }) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const nomsociete = profile?.nomsociete;

  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🎯 Charger tous les lots pour la société
  const loadLots = async () => {
    if (!nomsociete) {
      console.log("LotsContext : En attente de nomsociete...");
      setLots([]);
      setLoading(false);
      return;
    }

    console.log("⏳ Chargement lots pour société :", nomsociete);
    setLoading(true);

    const { data, error } = await supabase
      .from("lots")
      .select("*")
      .eq("nomsociete", nomsociete)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ loadLots :", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les lots",
        variant: "destructive",
      });
      setLots([]);
    } else {
      console.log("✅ Lots chargés :", data?.length || 0);
      setLots(data || []);
    }

    setLoading(false);
  };

  // ✅ CORRIGÉ : Attendre que nomsociete soit défini
  useEffect(() => {
    if (nomsociete) {
      loadLots();
    } else {
      console.log("LotsContext : En attente de nomsociete...");
      setLoading(false);
    }
  }, [nomsociete]);

  // 🎯 Ajouter un lot
  const addLot = async (lotData) => {
    if (!nomsociete) throw new Error("Société non définie");
    
    const { data, error } = await supabase
      .from("lots")
      .insert([{ ...lotData, nomsociete }])
      .select()
      .single();

    if (error) {
      console.error("❌ addLot :", error);
      throw error;
    }

    console.log("✅ Lot ajouté :", data);
    setLots((prev) => [...prev, data]);
    return data;
  };

  // 🎯 Mettre à jour un lot
  const updateLot = async (id, lotData) => {
    const { data, error } = await supabase
      .from("lots")
      .update({ ...lotData })
      .eq("id", id)
      .eq("nomsociete", nomsociete)
      .select()
      .single();

    if (error) {
      console.error("❌ updateLot :", error);
      throw error;
    }

    console.log("✅ Lot mis à jour :", data);
    setLots((prev) => prev.map((l) => (l.id === id ? data : l)));
    return data;
  };

  // 🎯 Supprimer un lot
  const deleteLot = async (id) => {
    const { error } = await supabase
      .from("lots")
      .delete()
      .eq("id", id)
      .eq("nomsociete", nomsociete);

    if (error) {
      console.error("❌ deleteLot :", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le lot",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ Lot supprimé");
    setLots((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <LotsContext.Provider
      value={{ lots, loading, loadLots, addLot, updateLot, deleteLot }}
    >
      {children}
    </LotsContext.Provider>
  );
}

export const useLots = () => useContext(LotsContext);