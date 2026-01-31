// src/context/AuthProvider.jsx
import { createContext, useEffect, useState, useRef } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const refreshIntervalRef = useRef(null);
  const loadProfileTimeoutRef = useRef(null); // ✅ NOUVEAU

  // ✅ CORRIGÉ : Charger le profil avec timeout
  const loadProfile = async (userId) => {
    console.log('🔍 loadProfile START pour userId:', userId);
    
    // ✅ Nettoyer le timeout précédent
    if (loadProfileTimeoutRef.current) {
      clearTimeout(loadProfileTimeoutRef.current);
    }
    
    // ✅ Timeout de sécurité : débloquer après 8 secondes
    loadProfileTimeoutRef.current = setTimeout(() => {
      console.warn('⏱️ TIMEOUT loadProfile après 8 secondes - déconnexion');
      setProfile(null);
      setUser(null);
      setLoading(false);
      localStorage.clear();
      supabase.auth.signOut();
    }, 8000);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      // ✅ Nettoyer le timeout si réponse reçue
      if (loadProfileTimeoutRef.current) {
        clearTimeout(loadProfileTimeoutRef.current);
        loadProfileTimeoutRef.current = null;
      }
      
      console.log('📡 loadProfile RESPONSE:', { 
        hasData: !!data, 
        errorCode: error?.code,
        errorMessage: error?.message,
        data: data
      });
      
      if (error) {
        console.error('❌ Erreur loadProfile:', error);
        
        // Si erreur RLS/JWT, forcer déconnexion
        if (error.code === 'PGRST301' || error.code === 'PGRST116' || error.message?.includes('JWT')) {
          console.warn('⚠️ Erreur authentification, déconnexion forcée');
          localStorage.clear();
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        // Si pas de données trouvées (PGRST116)
        if (error.code === 'PGRST116') {
          console.error('❌ AUCUN PROFIL TROUVÉ pour cet utilisateur !');
          alert(`Erreur : Aucun profil trouvé pour l'utilisateur ${userId}. Veuillez contacter l'administrateur.`);
        }
        
        setProfile(null);
        setLoading(false);
        return;
      }
      
      if (!data) {
        console.error('❌ Pas de profile dans la réponse');
        setProfile(null);
        setLoading(false);
        return;
      }
      
      console.log('✅ Profile chargé avec succès:', data.nomsociete);
      setProfile(data);
      setLoading(false);
      
      if (data?.nomsociete) {
        await setSupabaseRLSContext(data.nomsociete);
      }
      
    } catch (err) {
      console.error("❌ EXCEPTION loadProfile:", err);
      
      // ✅ Nettoyer le timeout
      if (loadProfileTimeoutRef.current) {
        clearTimeout(loadProfileTimeoutRef.current);
        loadProfileTimeoutRef.current = null;
      }
      
      setProfile(null);
      setLoading(false);
    }
  };

  // Déconnexion
  const signOut = async () => {
    console.log('👋 Déconnexion');
    
    // ✅ Nettoyer les timeouts
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    if (loadProfileTimeoutRef.current) {
      clearTimeout(loadProfileTimeoutRef.current);
      loadProfileTimeoutRef.current = null;
    }
    
    setUser(null);
    setProfile(null);
    setLoading(false);
    
    await supabase.auth.signOut();
  };

  // Auto-refresh
  const startAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    refreshIntervalRef.current = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry < 10 * 60 * 1000) {
        console.log('🔄 Rafraîchissement session');
        await supabase.auth.refreshSession();
      }
    }, 15 * 60 * 1000);
  };

  // Effect principal
  useEffect(() => {
    console.log('🚀 AuthProvider INIT');
    
    let isMounted = true;

    const initAuth = async () => {
      try {
        // ✅ Vérifier si la session est expirée
        const { data, error } = await supabase.auth.getSession();
        
        console.log('🔍 Session check:', { 
          hasSession: !!data?.session, 
          hasError: !!error,
          userId: data?.session?.user?.id
        });
        
        if (error) {
          console.error('❌ Erreur session:', error);
          
          if (error.message?.includes('JWT') || error.message?.includes('Invalid') || error.message?.includes('expired')) {
            console.warn('⚠️ Token invalide, nettoyage');
            localStorage.clear();
            await supabase.auth.signOut();
          }
          
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (!data?.session) {
          console.log('ℹ️ Pas de session');
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        // ✅ Vérifier si la session est expirée
        const session = data.session;
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        
        if (now > expiresAt) {
          console.warn('⚠️ Session expirée, déconnexion');
          localStorage.clear();
          await supabase.auth.signOut();
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        console.log('✅ Session trouvée:', session.user.id);
        
        if (isMounted) {
          setUser(session.user);
        }
        
        // Charger le profil
        console.log('📞 Appel loadProfile...');
        await loadProfile(session.user.id);
        
        console.log('✅ loadProfile terminé');
        
        startAutoRefresh();

      } catch (err) {
        console.error('❌ Exception initAuth:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listener auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth event:', event);
        
        if (!isMounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          console.log('✅ SIGNED_IN:', session.user.id);
          setUser(session.user);
          console.log('📞 Appel loadProfile depuis SIGNED_IN...');
          await loadProfile(session.user.id);
          console.log('✅ loadProfile terminé depuis SIGNED_IN');
          startAutoRefresh();
        }

        if (event === "SIGNED_OUT") {
          console.log('👋 SIGNED_OUT');
          if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
          }
          if (loadProfileTimeoutRef.current) {
            clearTimeout(loadProfileTimeoutRef.current);
            loadProfileTimeoutRef.current = null;
          }
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        
        // ✅ NOUVEAU : Gérer TOKEN_REFRESHED
        if (event === "TOKEN_REFRESHED") {
          console.log('🔄 Token rafraîchi');
          if (session?.user && !profile) {
            console.log('📞 Recharger le profil après refresh token');
            await loadProfile(session.user.id);
          }
        }
      }
    );

    return () => {
      console.log('🧹 Cleanup');
      isMounted = false;
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      if (loadProfileTimeoutRef.current) {
        clearTimeout(loadProfileTimeoutRef.current);
      }
      
      subscription?.unsubscribe();
    };
  }, []);

  // Connexion
  const signIn = async (email, password) => {
    console.log('🔐 SignIn START:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('❌ SignIn error:', error);
        return { data: null, error };
      }
      
      console.log('✅ SignIn SUCCESS');
      return { data, error: null };
      
    } catch (error) {
      console.error('❌ SignIn exception:', error);
      return { data: null, error };
    }
  };

  console.log('📊 Render - user:', !!user, 'profile:', !!profile, 'loading:', loading);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}