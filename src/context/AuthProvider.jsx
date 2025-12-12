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
    console.log('🔍 === DÉBUT loadProfile ===');
    console.log('🔍 userId:', userId);
    
    try {
      console.log('🔍 Avant requête Supabase...');
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      console.log('🔍 Après requête Supabase');
      console.log('🔍 data:', data);
      console.log('🔍 error:', error);
      
      if (error) {
        console.error("❌ Erreur loadProfile:", error);
        console.error("❌ error.message:", error.message);
        console.error("❌ error.code:", error.code);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!data) {
        console.warn('⚠️ Pas de data retourné');
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('✅ Profile chargé:', data);
      console.log('✅ nomsociete:', data.nomsociete);
      
      setProfile(data);
      setLoading(false);
      
      // Définir le contexte RLS
      if (data?.nomsociete) {
        console.log('🔐 Appel setSupabaseRLSContext...');
        await setSupabaseRLSContext(data.nomsociete);
        console.log('🔐 RLS context défini');
      }
      
      console.log('🔍 === FIN loadProfile (succès) ===');
    } catch (err) {
      console.error("❌ Exception loadProfile:", err);
      console.error("❌ Exception stack:", err.stack);
      setProfile(null);
      setLoading(false);
      console.log('🔍 === FIN loadProfile (erreur) ===');
    }
  };

  useEffect(() => {
    console.log('🚀 === AuthProvider useEffect DÉMARRE ===');
    
    // Flag pour éviter les appels multiples
    let mounted = true;

    // Récupérer la session initiale
    console.log('📡 Appel getSession...');
    supabase.auth.getSession().then(({ data }) => {
      console.log('📡 getSession retour:', data);
      
      if (!mounted) {
        console.log('⚠️ Composant démonté, abandon');
        return;
      }

      if (data?.session?.user) {
        console.log('👤 User trouvé:', data.session.user.id);
        setUser(data.session.user);
        loadProfile(data.session.user.id);
      } else {
        console.log('❌ Pas de session');
        setLoading(false);
      }
    });

    // Écouter les changements d'auth
    console.log('👂 Installation listener onAuthStateChange...');
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 === onAuthStateChange ===');
        console.log('🔔 event:', event);
        console.log('🔔 session:', session);
        
        if (!mounted) {
          console.log('⚠️ Composant démonté, abandon');
          return;
        }

        if (event === "SIGNED_IN" && session?.user) {
          console.log('✅ SIGNED_IN - userId:', session.user.id);
          setUser(session.user);
          await loadProfile(session.user.id);
        }

        if (event === "SIGNED_OUT") {
          console.log('👋 SIGNED_OUT');
          setUser(null);
          setProfile(null);
          setLoading(false);
        }

        if (event === "TOKEN_REFRESHED") {
          console.log('🔄 TOKEN_REFRESHED (ignoré)');
        }

        console.log('🔔 === Fin onAuthStateChange ===');
      }
    );

    console.log('✅ Listener installé');

    // Cleanup
    return () => {
      console.log('🧹 AuthProvider cleanup');
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = (email, password) => {
    console.log('🔑 signIn appelé');
    return supabase.auth.signInWithPassword({ email, password });
  };

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