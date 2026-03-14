import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

const LotsContext = createContext();

export function LotsProvider({ children }) {
  const { toast } = useToast();
  const { profile } = useAuth();

  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🎯 Charger tous les lots pour la société
  useEffect(() => {
    const loadLotsInitial = async () => {
      if (!profile?.nomsociete) {
        console.log("LotsContext : En attente de nomsociete...");
        setLots([]);
        setLoading(false);
        return;
      }

      console.log("⏳ Chargement lots pour société :", profile.nomsociete);
      setLoading(true);

      const { data, error } = await supabase
        .from("lots")
        .select("*")
        .eq("nomsociete", profile.nomsociete)
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

    loadLotsInitial();
  }, [profile?.nomsociete]);

  // 🎯 Rafraîchir les lots (sans wrapper - c'est une lecture)
  const loadLots = async () => {
    if (!profile?.nomsociete) return;

    console.log("🔄 Rechargement lots...");

    const { data, error } = await supabase
      .from("lots")
      .select("*")
      .eq("nomsociete", profile.nomsociete)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ loadLots :", error);
      setLots([]);
    } else {
      console.log("✅ Lots rechargés :", data?.length);
      setLots(data || []);
    }
  };

  // ✅ Ajouter un lot (AVEC wrapper)
  const addLot = async (lotData) => {
    
      if (!profile?.nomsociete) throw new Error("Société non définie");

      console.log('🔵 addLot - Début');
      
      const payload = { ...lotData, nomsociete: profile.nomsociete };
      console.log('📦 Payload:', payload);
      console.log('🚀 Appel Supabase.from("lots").insert()...');
      
      const { data, error } = await supabase
        .from("lots")
        .insert([payload])
        .select()
        .single();

      console.log('📡 Réponse Supabase:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error("❌ addLot :", error);
        throw error;
      }

      console.log("✅ Lot ajouté :", data);
      
      // Recharger immédiatement
      await loadLots();
      
      // Notifier ChantierContext
      window.dispatchEvent(new CustomEvent('lots-updated'));
      
      return data;
    
  };

  // ✅ Mettre à jour un lot (AVEC wrapper)
  const updateLot = async (id, lotData) => {
    
      const { data, error } = await supabase
        .from("lots")
        .update({ ...lotData })
        .eq("id", id)
        .eq("nomsociete", profile?.nomsociete)
        .select()
        .single();

      if (error) {
        console.error("❌ updateLot :", error);
        throw error;
      }

      console.log("✅ Lot mis à jour :", data);
      await loadLots();
      window.dispatchEvent(new CustomEvent('lots-updated'));
      
      return data;
    
  };

  // ✅ Supprimer un lot (AVEC wrapper)
  const deleteLot = async (id) => {
    
      const { error } = await supabase
        .from("lots")
        .delete()
        .eq("id", id)
        .eq("nomsociete", profile?.nomsociete);

      if (error) {
        console.error("❌ deleteLot :", error);
        throw error;
      }

      console.log("✅ Lot supprimé");
      await loadLots();
      window.dispatchEvent(new CustomEvent('lots-updated'));
    
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