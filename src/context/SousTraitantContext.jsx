import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { getConformiteArtisan, optionsConformite } from "@/lib/attestations";

const BUCKET_ATTESTATIONS = "documents-chantiers";

export const SousTraitantContext = createContext();

export function SousTraitantProvider({ children }) {
  const { user, profile } = useAuth();

  const [sousTraitants, setSousTraitants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [indisponibilites, setIndisponibilites] = useState([]);
  const [attestations, setAttestations] = useState([]);

  // Décennales + URSSAF de tous les artisans chargés (pastilles de conformité)
  const loadAttestations = async (soustraitantIds) => {
    const ids = (soustraitantIds || []).filter(Boolean);
    if (ids.length === 0) {
      setAttestations([]);
      return;
    }

    const { data, error } = await supabase
      .from("artisan_attestations")
      .select("*")
      .in("soustraitant_id", ids);

    if (error) {
      console.error("❌ loadAttestations :", error);
      setAttestations([]);
    } else {
      setAttestations(data || []);
    }
  };

  const loadIndisponibilites = async (soustraitantIds) => {
    const ids = (soustraitantIds || []).filter(Boolean);
    if (ids.length === 0) {
      setIndisponibilites([]);
      return;
    }

    const { data, error } = await supabase
      .from("indisponibilites_artisan")
      .select("*")
      .in("soustraitant_id", ids);

    if (error) {
      console.error("❌ loadIndisponibilites :", error);
      setIndisponibilites([]);
    } else {
      setIndisponibilites(data || []);
    }
  };

  const loadSousTraitants = async () => {
    if (!profile) {
      console.log("SousTraitantContext : En attente de profile...");
      setSousTraitants([]);
      setIndisponibilites([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // ✅ ARTISAN : charger uniquement son propre enregistrement via user_id
    if (profile.user_type === 'artisan') {
      if (!user?.id) {
        setSousTraitants([]);
        setIndisponibilites([]);
        setLoading(false);
        return;
      }

      console.log("⏳ Chargement sous-traitant artisan pour user_id :", user.id);

      const { data, error } = await supabase
        .from("soustraitants")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("❌ loadSousTraitants (artisan) :", error);
        setSousTraitants([]);
      } else {
        console.log("✅ Sous-traitant artisan chargé :", data?.length || 0, data);
        setSousTraitants(data || []);
      }

      const ids = (data || []).map(s => s.id);
    await Promise.all([loadIndisponibilites(ids), loadAttestations(ids)]);
      setLoading(false);
      return;
    }

    // ✅ CONSTRUCTEUR : charger tous les sous-traitants de sa société
    if (!profile.nomsociete) {
      console.log("SousTraitantContext : En attente de nomsociete...");
      setSousTraitants([]);
      setIndisponibilites([]);
      setLoading(false);
      return;
    }

    console.log("⏳ Chargement sous-traitants pour société :", profile.nomsociete);

    const { data, error } = await supabase
      .from("soustraitants")
      .select("*")
      .eq("nomsociete", profile.nomsociete)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ loadSousTraitants (constructeur) :", error);
      setSousTraitants([]);
    } else {
      console.log("✅ Sous-traitants chargés :", data?.length || 0);
      setSousTraitants(data || []);
    }

    const ids = (data || []).map(s => s.id);
    await Promise.all([loadIndisponibilites(ids), loadAttestations(ids)]);
    setLoading(false);
  };

  useEffect(() => {
    loadSousTraitants();
  }, [profile?.user_type, profile?.nomsociete, user?.id]);

  useEffect(() => {
    const handleReconnect = () => {
      console.log('🔄 SousTraitantContext : Supabase reconnecté → Rechargement...');
      setTimeout(() => loadSousTraitants(), 500);
    };
    window.addEventListener('supabase-reconnected', handleReconnect);
    return () => window.removeEventListener('supabase-reconnected', handleReconnect);
  }, [profile?.user_type, profile?.nomsociete, user?.id]);

  const addSousTraitant = async (st) => {
    console.log("🔵 addSousTraitant - Début");

    if (!user || !profile?.nomsociete) {
      throw new Error("User ou société non définis");
    }

    const payload = {
      nomST: st.nomST || null,
      PrenomST: st.PrenomST || null,
      email: st.email || null,
      telephone: st.telephone || null,
      adresseST: st.adresseST || null,
      code_postal: st.code_postal || null,
      ville: st.ville || null,
      siret: (st.siret || "").replace(/\D/g, "") || null,
      decennale_non_requise: !!st.decennale_non_requise,
      urssaf_non_requise: !!st.urssaf_non_requise,
      assigned_lots: st.assigned_lots || [],
      nomsociete: profile.nomsociete,
      nomsocieteST: st.nomsocieteST,
    };

    const { data, error } = await supabase
      .from("soustraitants")
      .insert([payload])
      .select()
      .single();

    if (error) { console.error("❌ Erreur Supabase:", error); throw error; }

    console.log("✅ Sous-traitant inséré :", data);
    setSousTraitants((prev) => [data, ...(prev || [])]);
    return data;
  };

  const updateSousTraitant = async (id, updates) => {
    console.log('📤 updateSousTraitant - ID:', id);

    // ✅ Récupérer le sous-traitant actuel pour avoir le user_id
    const stActuel = sousTraitants.find(s => s.id === id);

    const cleanUpdates = { ...updates };
    delete cleanUpdates.id;
    delete cleanUpdates.created_at;
    delete cleanUpdates.updated_at;
    delete cleanUpdates.user_id;
    delete cleanUpdates.nomsociete;
    // ✅ nomsocieteST N'EST PLUS supprimé — le constructeur peut modifier le nom

    const { data, error } = await supabase
      .from("soustraitants")
      .update(cleanUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) { console.error("❌ Erreur Supabase updateSousTraitant:", error); throw error; }

    // ✅ Si l'artisan a un compte, synchroniser nom/prénom dans profiles
    if (stActuel?.user_id) {
      const profileUpdates = {};
      if (cleanUpdates.nomST !== undefined) profileUpdates.nom = cleanUpdates.nomST || '';
      if (cleanUpdates.PrenomST !== undefined) profileUpdates.prenom = cleanUpdates.PrenomST || '';
      if (cleanUpdates.email !== undefined) profileUpdates.mail = cleanUpdates.email || '';
      if (cleanUpdates.telephone !== undefined) profileUpdates.tel = cleanUpdates.telephone || '';

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', stActuel.user_id);

        if (profileError) {
          console.error('⚠️ Erreur sync profiles:', profileError);
        } else {
          console.log('✅ Profil artisan synchronisé:', profileUpdates);
        }
      }
    }

    console.log("✅ Sous-traitant mis à jour:", data);
    setSousTraitants((prev) => (prev || []).map((s) => (s.id === id ? data : s)));
    return data;
  };

  const indisponibiliteSet = React.useMemo(() => {
    const s = new Set();
    (indisponibilites || []).forEach(i => s.add(`${i.soustraitant_id}-${i.date}`));
    return s;
  }, [indisponibilites]);

  const isArtisanIndisponible = (soustraitantId, dateStr) =>
    indisponibiliteSet.has(`${soustraitantId}-${dateStr}`);

  const addIndisponibilite = async (soustraitantId, dateStr) => {
    const { data, error } = await supabase
      .from("indisponibilites_artisan")
      .insert([{ soustraitant_id: soustraitantId, date: dateStr }])
      .select()
      .single();

    if (error) { console.error("❌ addIndisponibilite :", error); throw error; }

    setIndisponibilites((prev) => [...prev, data]);
    return data;
  };

  const removeIndisponibilite = async (soustraitantId, dateStr) => {
    const { error } = await supabase
      .from("indisponibilites_artisan")
      .delete()
      .eq("soustraitant_id", soustraitantId)
      .eq("date", dateStr);

    if (error) { console.error("❌ removeIndisponibilite :", error); throw error; }

    setIndisponibilites((prev) =>
      prev.filter((i) => !(i.soustraitant_id === soustraitantId && i.date === dateStr))
    );
  };

  const deleteSousTraitant = async (id) => {
    console.log("📤 Delete ST :", id);

    // Fichiers des attestations (lignes supprimées en cascade par la RPC)
    const { data: attestations } = await supabase
      .from("artisan_attestations")
      .select("storage_path")
      .eq("soustraitant_id", id);

    // ✅ RPC : vérifie en base que l'utilisateur est gérant, supprime l'artisan
    // et toutes ses données, puis renvoie les fichiers storage à effacer
    const { data: fichiersRpc, error } = await supabase.rpc("supprimer_soustraitant", { p_id: id });

    if (error) { console.error("❌ deleteSousTraitant :", error); throw error; }

    const fichiers = [
      ...(fichiersRpc || []),
      ...(attestations || []).map((a) => a.storage_path).filter(Boolean),
    ];

    if (fichiers?.length) {
      const { error: storageError } = await supabase.storage.from("documents-chantiers").remove(fichiers);
      if (storageError) console.error("⚠️ Fichiers de l'artisan non supprimés :", storageError);
    }

    setSousTraitants((prev) => (prev || []).filter((s) => s.id !== id));
    setAttestations((prev) => prev.filter((a) => a.soustraitant_id !== id));
    console.log("✅ ST supprimé du state local");
    return true;
  };

  // ✅ Ajout d'une décennale / URSSAF (fichier dans artisans/<soustraitant_id>/…)
  const addAttestation = async (ligne, file) => {
    let storagePath = null;
    try {
      if (file) {
        const ext = file.name.split(".").pop();
        storagePath = `artisans/${ligne.soustraitant_id}/${ligne.type}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET_ATTESTATIONS).upload(storagePath, file);
        if (uploadError) throw uploadError;
      }

      const { data, error } = await supabase
        .from("artisan_attestations")
        .insert({ ...ligne, nom_fichier: file?.name || null, storage_path: storagePath })
        .select()
        .single();
      if (error) throw error;

      setAttestations((prev) => [...prev, data]);
      return data;
    } catch (err) {
      console.error("❌ addAttestation :", err);
      if (storagePath) await supabase.storage.from(BUCKET_ATTESTATIONS).remove([storagePath]);
      throw err;
    }
  };

  const deleteAttestation = async (attestation) => {
    const { error } = await supabase.from("artisan_attestations").delete().eq("id", attestation.id);
    if (error) { console.error("❌ deleteAttestation :", error); throw error; }

    if (attestation.storage_path) {
      const { error: storageError } = await supabase.storage.from(BUCKET_ATTESTATIONS).remove([attestation.storage_path]);
      if (storageError) console.error("⚠️ Fichier de l'attestation non supprimé :", storageError);
    }
    setAttestations((prev) => prev.filter((a) => a.id !== attestation.id));
  };

  // ✅ Conformité (décennale valide + URSSAF < 6 mois) par artisan
  const conformites = useMemo(() => {
    const parArtisan = {};
    for (const a of attestations) (parArtisan[a.soustraitant_id] = parArtisan[a.soustraitant_id] || []).push(a);
    return Object.fromEntries(
      (sousTraitants || []).map((st) => [
        st.id,
        getConformiteArtisan(parArtisan[st.id] || [], new Date(), optionsConformite(st)),
      ])
    );
  }, [sousTraitants, attestations]);

  const getConformite = (soustraitantId) =>
    conformites[soustraitantId] || getConformiteArtisan([]);

  const nbArtisansNonConformes = useMemo(
    () => Object.values(conformites).filter((c) => !c.ok).length,
    [conformites]
  );

  return (
    <SousTraitantContext.Provider
      value={{
        sousTraitants: sousTraitants || [],
        loading,
        loadSousTraitants,
        addSousTraitant,
        updateSousTraitant,
        deleteSousTraitant,
        indisponibilites: indisponibilites || [],
        isArtisanIndisponible,
        addIndisponibilite,
        removeIndisponibilite,
        attestations,
        addAttestation,
        deleteAttestation,
        getConformite,
        nbArtisansNonConformes,
      }}
    >
      {children}
    </SousTraitantContext.Provider>
  );
}

export function useSousTraitant() {
  const ctx = useContext(SousTraitantContext);
  if (!ctx) throw new Error("useSousTraitant utilisé hors provider !");
  return ctx;
}