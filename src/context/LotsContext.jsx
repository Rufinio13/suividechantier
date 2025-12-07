import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

const LotsContext = createContext();

export function LotsProvider({ children }) {
  const { toast } = useToast();
  const { profile } = useAuth(); // Société de l’utilisateur
  const nomsociete = profile?.nomsociete;

  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🎯 Charger tous les lots pour la société
  const loadLots = async () => {
    if (!nomsociete) {
      console.warn("LotsContext : aucune société définie → stop");
      setLots([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("lots")
      .select("*")
      .eq("nomsociete", nomsociete)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les lots",
        variant: "destructive",
      });
    } else {
      setLots(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadLots();
  }, [nomsociete]);

  // 🎯 Ajouter un lot
  const addLot = async (lotData) => {
    if (!nomsociete) throw new Error("Société non définie");
    // lotData doit contenir { lot, description }
    const { data, error } = await supabase
      .from("lots")
      .insert([{ ...lotData, nomsociete }])
      .select()
      .single();

    if (error) {
      console.error(error);
      throw error;
    }

    setLots((prev) => [...prev, data]);
    return data;
  };

  // 🎯 Mettre à jour un lot
  const updateLot = async (id, lotData) => {
    const { data, error } = await supabase
      .from("lots")
      .update({ ...lotData }) // lotData = { lot, description }
      .eq("id", id)
      .eq("nomsociete", nomsociete)
      .select()
      .single();

    if (error) {
      console.error(error);
      throw error;
    }

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
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le lot",
        variant: "destructive",
      });
      return;
    }

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
