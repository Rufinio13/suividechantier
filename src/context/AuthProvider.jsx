// src/context/AuthProvider.jsx
import { createContext, useEffect, useState, useRef } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ Refs pour éviter doubles appels
  const isLoadingProfile = useRef(false);
  const isMounted = useRef(true);

  // Charger le profil via le client Supabase authentifié
  const loadProfile = async (userId) => {
    // ✅ Éviter doubles appels
    if (isLoadingProfile.current) {
      console.log('⚠️ loadProfile déjà en cours, ignoré');
      return;
    }
    
    isLoadingProfile.current = true;
    console.log('🔍 loadProfile pour userId:', userId);
    
    try {
      console.log('📡 Appel Supabase client...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      console.log('📡 Réponse Supabase:', { hasData: !!data, error });
      
      if (error) {
        console.error('❌ Erreur Supabase:', error);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      if (!data) {
        console.error('❌ Aucun profile trouvé');
        setProfile(null);
        setLoading(false);
        return;
      }
      
      console.log('✅ Profile chargé:', data);
      
      if (isMounted.current) {
        setProfile(data);
        setLoading(false);
      }
      
      if (data?.nomsociete) {
        await setSupabaseRLSContext(data.nomsociete);
      }
      
    } catch (err) {
      console.error("❌ Exception loadProfile:", err);
      if (isMounted.current) {
        setProfile(null);
        setLoading(false);
      }
    } finally {
      isLoadingProfile.current = false;
    }
  };

  const signOut = async () => {
    console.log('👋 Déconnexion...');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  useEffect(() => {
    console.log('🚀 AuthProvider useEffect DÉMARRE');
    isMounted.current = true;

    // ✅ NETTOYER LES TOKENS INVALIDES AU DÉMARRAGE
    const cleanInvalidTokens = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Erreur getSession:', error);
          
          // Si erreur de refresh token, nettoyer TOUT
          if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid')) {
            console.warn('⚠️ Token invalide détecté, nettoyage complet...');
            
            // Nettoyer localStorage
            localStorage.clear();
            
            // Nettoyer sessionStorage
            sessionStorage.clear();
            
            // Déconnecter proprement
            await supabase.auth.signOut();
            
            console.log('✅ Nettoyage complet effectué');
          }
          
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (data?.session?.user) {
          console.log('👤 User trouvé:', data.session.user.id);
          setUser(data.session.user);
          await loadProfile(data.session.user.id);
        } else {
          console.log('❌ Pas de session');
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ Exception critique getSession:', err);
        
        // Nettoyage d'urgence
        localStorage.clear();
        sessionStorage.clear();
        await supabase.auth.signOut();
        
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    // ✅ VÉRIFIER LA SESSION INITIALE
    cleanInvalidTokens();

    // ✅ ÉCOUTER LES CHANGEMENTS D'AUTH
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 onAuthStateChange:', event);
        
        if (!isMounted.current) return;

        if (event === "SIGNED_IN" && session?.user) {
          console.log('✅ SIGNED_IN - userId:', session.user.id);
          
          // ✅ Ne charger le profile QUE si on n'a pas déjà un user avec le même ID
          if (user?.id !== session.user.id) {
            setUser(session.user);
            await loadProfile(session.user.id);
          } else {
            console.log('ℹ️ User déjà chargé, ignoré');
          }
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
      isMounted.current = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []); // ✅ Dépendances vides pour éviter re-déclenchements

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  console.log('📊 AuthProvider render - user:', !!user, 'profile:', !!profile, 'loading:', loading);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}