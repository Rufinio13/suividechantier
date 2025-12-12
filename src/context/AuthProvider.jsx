// src/context/AuthProvider.jsx
import { createContext, useEffect, useState } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

// Fonction helper avec timeout
const fetchWithTimeout = (promise, timeoutMs = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
};

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
      
      // Ajouter un timeout de 5 secondes
      const result = await fetchWithTimeout(
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single(),
        5000
      );
      
      console.log('🔍 Après requête Supabase');
      console.log('🔍 result:', result);
      
      const { data, error } = result;
      
      console.log('🔍 data:', data);
      console.log('🔍 error:', error);
      
      if (error) {
        console.error("❌ Erreur loadProfile:", error);
        console.error("❌ error.message:", error.message);
        
        // TEMPORAIRE : Si erreur, créer un profile par défaut
        console.log('⚠️ Création profile temporaire...');
        const tempProfile = {
          id: userId,
          nomsociete: 'EVABOIS',
          nom: 'EVARISTE',
          prenom: 'Raphaël',
          mail: 'revariste@maisonsnaturea.fr',
          tel: '0663262974'
        };
        
        setProfile(tempProfile);
        setLoading(false);
        
        if (tempProfile.nomsociete) {
          await setSupabaseRLSContext(tempProfile.nomsociete);
        }
        return;
      }

      if (!data) {
        console.warn('⚠️ Pas de data retourné');
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('✅ Profile chargé:', data);
      setProfile(data);
      setLoading(false);
      
      if (data?.nomsociete) {
        await setSupabaseRLSContext(data.nomsociete);
      }
      
      console.log('🔍 === FIN loadProfile (succès) ===');
    } catch (err) {
      console.error("❌ Exception/Timeout loadProfile:", err);
      
      // Si timeout, utiliser profile temporaire
      if (err.message === 'Timeout') {
        console.log('⏰ TIMEOUT détecté - utilisation profile temporaire');
        const tempProfile = {
          id: userId,
          nomsociete: 'EVABOIS',
          nom: 'EVARISTE',
          prenom: 'Raphaël',
          mail: 'revariste@maisonsnaturea.fr',
          tel: '0663262974'
        };
        
        setProfile(tempProfile);
        setLoading(false);
        
        if (tempProfile.nomsociete) {
          await setSupabaseRLSContext(tempProfile.nomsociete);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
      
      console.log('🔍 === FIN loadProfile (erreur) ===');
    }
  };

  useEffect(() => {
    console.log('🚀 === AuthProvider useEffect DÉMARRE ===');
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      console.log('📡 getSession retour:', data);
      
      if (!mounted) return;

      if (data?.session?.user) {
        console.log('👤 User trouvé:', data.session.user.id);
        setUser(data.session.user);
        loadProfile(data.session.user.id);
      } else {
        console.log('❌ Pas de session');
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 onAuthStateChange:', event);
        
        if (!mounted) return;

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
      }
    );

    return () => {
      console.log('🧹 AuthProvider cleanup');
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = async () => {
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