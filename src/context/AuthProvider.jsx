// src/context/AuthProvider.jsx
import { createContext, useEffect, useState } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ TEMPORAIRE : Créer le profile directement depuis le user
  const createProfileFromUser = async (userId) => {
    console.log('🔧 Création profile temporaire pour:', userId);
    
    // Profile en dur pour débloquer
    const tempProfile = {
      id: userId,
      nomsociete: 'EVABOIS',
      nom: 'EVARISTE',
      prenom: 'Raphaël',
      mail: 'revariste@maisonsnaturea.fr',
      tel: '0663262974'
    };
    
    console.log('✅ Profile temporaire créé:', tempProfile);
    setProfile(tempProfile);
    setLoading(false);
    
    // Définir le contexte RLS
    if (tempProfile.nomsociete) {
      console.log('🔐 Définition RLS context pour:', tempProfile.nomsociete);
      await setSupabaseRLSContext(tempProfile.nomsociete);
    }
  };

  useEffect(() => {
    console.log('🚀 AuthProvider useEffect - Initialisation');
    
    // Récupère la session initiale
    supabase.auth.getSession().then(({ data, error }) => {
      console.log("AuthProvider: session initiale", data?.session);
      
      if (error) {
        console.error("❌ Erreur getSession:", error);
        setLoading(false);
        return;
      }
      
      if (data?.session?.user) {
        console.log('👤 User trouvé dans session:', data.session.user.id);
        setUser(data.session.user);
        createProfileFromUser(data.session.user.id);
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
          await createProfileFromUser(session.user.id);
        }

        if (event === "SIGNED_OUT") {
          console.log('👋 SIGNED_OUT');
          setUser(null);
          setProfile(null);
          setLoading(false);
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