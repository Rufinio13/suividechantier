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
    console.log('📥 loadProfile appelé pour userId:', userId);
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error("❌ Erreur loadProfile:", error);
        setProfile(null);
        return;
      }

      console.log('✅ Profile chargé:', data);
      setProfile(data || null);
      
      // ✅ Définir le contexte RLS après avoir chargé le profil
      if (data?.nomsociete) {
        console.log('🔐 Définition RLS context pour:', data.nomsociete);
        await setSupabaseRLSContext(data.nomsociete);
      } else {
        console.warn('⚠️ Pas de nomsociete dans le profile:', data);
      }
    } catch (err) {
      console.error("❌ Exception loadProfile:", err);
      setProfile(null);
    }
  };

  useEffect(() => {
    console.log('🚀 AuthProvider useEffect - Initialisation');
    
    // Récupère la session initiale
    supabase.auth.getSession().then(({ data, error }) => {
      console.log("AuthProvider: session initiale", data?.session);
      
      if (error) {
        console.error("❌ Erreur getSession:", error);
      }
      
      if (data?.session?.user) {
        console.log('👤 User trouvé dans session:', data.session.user.id);
        setUser(data.session.user);
        loadProfile(data.session.user.id);
      } else {
        console.log('❌ Pas de session');
        setLoading(false);
      }
    });

    // Écoute les changements d'auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔔 onAuthStateChange reçu:", event);

        if (event === "SIGNED_IN" && session?.user) {
          console.log('✅ SIGNED_IN - User:', session.user.id);
          setUser(session.user);
          await loadProfile(session.user.id);
          setLoading(false);
        }

        if (event === "SIGNED_OUT") {
          console.log('👋 SIGNED_OUT');
          setUser(null);
          setProfile(null);
          setLoading(false);
        }

        if (event === "TOKEN_REFRESHED") {
          console.log('🔄 TOKEN_REFRESHED');
          // Ne rien faire, juste loguer
        }
      }
    );

    // Cleanup
    return () => {
      console.log('🧹 AuthProvider cleanup');
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = async () => {
    console.log('🚪 signOut appelé');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  console.log('📊 AuthProvider render - user:', !!user, 'profile:', !!profile, 'loading:', loading);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}