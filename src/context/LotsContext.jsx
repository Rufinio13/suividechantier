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
    const loadLots = async () => {
      if (!profile?.nomsociete) { // ✅ Utiliser profile?.nomsociete directement
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
        .eq("nomsociete", profile.nomsociete) // ✅ Utiliser profile.nomsociete
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

    loadLots();
  }, [profile?.nomsociete]); // ✅ Dépendre de profile?.nomsociete

  // 🎯 Ajouter un lot
  const addLot = async (lotData) => {
    // ✅ VÉRIFIER LA SESSION
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

    if (!profile?.nomsociete) throw new Error("Société non définie");
    
    const { data, error } = await supabase
      .from("lots")
      .insert([{ ...lotData, nomsociete: profile.nomsociete }])
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
      .eq("nomsociete", profile?.nomsociete)
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
      .eq("nomsociete", profile?.nomsociete);

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

  // 🎯 Rafraîchir les lots
  const loadLots = async () => {
    if (!profile?.nomsociete) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("lots")
      .select("*")
      .eq("nomsociete", profile.nomsociete)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ loadLots :", error);
      setLots([]);
    } else {
      setLots(data || []);
    }

    setLoading(false);
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