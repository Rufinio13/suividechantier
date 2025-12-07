// src/context/AuthProvider.jsx
import { createContext, useEffect, useState } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fonction pour charger le profil depuis Supabase
  const loadProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      setProfile(data || null);
      
      // ✅ AJOUT : Définir le contexte RLS après avoir chargé le profil
      if (data?.nomsociete) {
        await setSupabaseRLSContext(data.nomsociete);
      }
    } catch (err) {
      console.error("Erreur loadProfile:", err);
      setProfile(null);
    }
  };

  useEffect(() => {
    let firstLoad = true;

    // Récupère la session initiale
    supabase.auth.getSession().then(({ data }) => {
      console.log("AuthProvider: session initiale", data?.session);
      if (data?.session?.user) {
        setUser(data.session.user);
        loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    // Écoute les changements d'auth
    const authListener = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("onAuthStateChange reçu:", event);

        if (event === "SIGNED_IN") {
          if (session?.user) {
            setUser(session.user);
            await loadProfile(session.user.id);
          }
          setLoading(false);
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }

        // Pour TOKEN_REFRESHED ou autres événements, on ne force pas le loading si user déjà présent
        if (firstLoad) {
          setLoading(false);
          firstLoad = false;
        }
      }
    );

    // Cleanup safe
    return () => {
      if (authListener && typeof authListener.unsubscribe === "function") {
        authListener.unsubscribe();
      }
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}