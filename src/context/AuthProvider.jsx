// src/context/AuthProvider.jsx
import { createContext, useEffect, useState } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger le profil depuis Supabase
  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error("❌ Erreur loadProfile:", error);
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('✅ Profile chargé:', data);
      setProfile(data);
      setLoading(false);
      
      // Définir le contexte RLS
      if (data?.nomsociete) {
        await setSupabaseRLSContext(data.nomsociete);
      }
    } catch (err) {
      console.error("❌ Exception loadProfile:", err);
      setProfile(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Flag pour éviter les appels multiples
    let mounted = true;

    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      if (data?.session?.user) {
        setUser(data.session.user);
        loadProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Écouter les changements d'auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }

        // Ignorer les autres événements (TOKEN_REFRESHED, etc.)
      }
    );

    // Cleanup
    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []); // ✅ IMPORTANT : Dépendances vides pour ne s'exécuter qu'une fois

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