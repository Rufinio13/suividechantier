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

  // 🎯 Rafraîchir les lots
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

  // 🎯 Ajouter un lot
  const addLot = async (lotData) => {
    try {
      if (!profile?.nomsociete) throw new Error("Société non définie");

      console.log('🔵 addLot - Début');
      
      const payload = { ...lotData, nomsociete: profile.nomsociete };
      console.log('📦 Payload:', payload);
      console.log('🔍 Client Supabase:', { 
        hasSupabase: !!supabase,
        hasFrom: !!supabase?.from,
        type: typeof supabase
      });
      
      if (!supabase || typeof supabase.from !== 'function') {
        throw new Error('Client Supabase non disponible ou corrompu');
      }
      
      console.log('🚀 Appel Supabase.from("lots").insert()...');
      
      // ✅ Timeout de 30 secondes
      const insertPromise = supabase
        .from("lots")
        .insert([payload])
        .select()
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.error('⏰ TIMEOUT addLot ! 30 secondes dépassées');
          reject(new Error('Timeout: la requête a pris plus de 30 secondes'));
        }, 30000) // 30 secondes
      );

      console.log('⏳ En attente réponse Supabase...');
      const result = await Promise.race([insertPromise, timeoutPromise]);
      const { data, error } = result;

      console.log('📡 Réponse Supabase:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error("❌ addLot :", error);
        throw error;
      }

      console.log("✅ Lot ajouté :", data);
      
      // ✅ Recharger IMMÉDIATEMENT
      await loadLots();
      
      // ✅ Notifier ChantierContext
      window.dispatchEvent(new CustomEvent('lots-updated'));
      
      return data;
    } catch (error) {
      console.error('❌ Exception addLot:', error);
      alert(`Erreur lors de la création du lot: ${error.message}`);
      throw error;
    }
  };

  // 🎯 Mettre à jour un lot
  const updateLot = async (id, lotData) => {
    try {
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
    } catch (error) {
      console.error('❌ Exception updateLot:', error);
      alert(`Erreur lors de la modification du lot: ${error.message}`);
      throw error;
    }
  };

  // 🎯 Supprimer un lot
  const deleteLot = async (id) => {
    try {
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
    } catch (error) {
      console.error('❌ Exception deleteLot:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le lot",
        variant: "destructive",
      });
    }
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