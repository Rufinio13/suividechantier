// src/context/AuthProvider.jsx
import { createContext, useEffect, useState, useRef } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const isLoadingProfile = useRef(false);
  const isMounted = useRef(true);
  const refreshIntervalRef = useRef(null);
  const sessionCheckAttempts = useRef(0);

  const loadProfile = async (userId) => {
    if (isLoadingProfile.current) {
      console.log('⚠️ loadProfile déjà en cours, ignoré');
      return;
    }
    
    isLoadingProfile.current = true;
    console.log('🔍 loadProfile pour userId:', userId);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      console.log('📡 Réponse Supabase profiles:', { hasData: !!data, error });
      
      if (error) {
        console.error('❌ Erreur chargement profile:', error);
        
        // Si erreur JWT, nettoyer la session
        if (error.message?.includes('JWT') || error.code === 'PGRST301') {
          console.warn('⚠️ Token JWT invalide, déconnexion...');
          await forceLogout();
          return;
        }
        
        if (isMounted.current) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      
      if (!data) {
        console.error('❌ Aucun profile trouvé');
        if (isMounted.current) {
          setProfile(null);
          setLoading(false);
        }
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

  // ✅ NOUVEAU : Forcer la déconnexion propre
  const forceLogout = async () => {
    console.log('🧹 Force logout - Nettoyage complet');
    
    // Arrêter l'intervalle
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    // Nettoyer le state
    setUser(null);
    setProfile(null);
    setLoading(false);
    
    // Nettoyer les storages
    try {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    } catch (e) {
      console.error('Erreur nettoyage storage:', e);
    }
    
    // Déconnecter de Supabase
    await supabase.auth.signOut();
  };

  const signOut = async () => {
    console.log('👋 Déconnexion...');
    await forceLogout();
  };

  const startAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    refreshIntervalRef.current = setInterval(async () => {
      console.log('⏰ Vérification périodique de la session...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.warn('⚠️ Session invalide ou expirée');
        clearInterval(refreshIntervalRef.current);
        return;
      }
      
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const minutesLeft = Math.round(timeUntilExpiry / 1000 / 60);
      
      console.log(`⏰ Session expire dans ${minutesLeft} minutes`);
      
      if (timeUntilExpiry < 10 * 60 * 1000) {
        console.log('🔄 Rafraîchissement préventif de la session...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Erreur rafraîchissement:', refreshError);
        } else {
          console.log('✅ Session rafraîchie avec succès');
        }
      }
    }, 15 * 60 * 1000);
    
    console.log('✅ Auto-refresh activé (toutes les 15 minutes)');
  };

  useEffect(() => {
    console.log('🚀 AuthProvider useEffect DÉMARRE');
    isMounted.current = true;
    sessionCheckAttempts.current = 0;

    const initAuth = async () => {
      try {
        console.log('🔍 Vérification session existante...');
        
        // ✅ Tentative 1 : getSession normale
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Erreur getSession:', error);
          
          // Si token invalide ou expiré, nettoyer
          if (
            error.message?.includes('Refresh Token') || 
            error.message?.includes('Invalid') ||
            error.message?.includes('JWT') ||
            error.message?.includes('expired')
          ) {
            console.warn('⚠️ Session corrompue détectée, nettoyage...');
            await forceLogout();
            return;
          }
          
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // ✅ Pas de session = pas connecté (normal)
        if (!data?.session) {
          console.log('ℹ️ Pas de session active (utilisateur non connecté)');
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // ✅ Session existe, vérifier si elle est valide
        const session = data.session;
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        
        console.log('📅 Session expire à:', new Date(expiresAt).toLocaleString());
        console.log('🕐 Maintenant:', new Date(now).toLocaleString());
        
        // Si session expirée
        if (expiresAt < now) {
          console.warn('⚠️ Session expirée, tentative de refresh...');
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            console.error('❌ Impossible de rafraîchir, déconnexion');
            await forceLogout();
            return;
          }
          
          console.log('✅ Session rafraîchie avec succès');
          setUser(refreshData.session.user);
          await loadProfile(refreshData.session.user.id);
          startAutoRefresh();
          return;
        }

        // ✅ Session valide
        console.log('✅ Session valide, userId:', session.user.id);
        setUser(session.user);
        await loadProfile(session.user.id);
        startAutoRefresh();

      } catch (err) {
        console.error('❌ Exception critique initAuth:', err);
        await forceLogout();
      }
    };

    initAuth();

    // ✅ ÉCOUTER LES CHANGEMENTS D'AUTH
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 onAuthStateChange:', event, session?.user?.id);
        
        if (!isMounted.current) return;

        if (event === "SIGNED_IN" && session?.user) {
          console.log('✅ SIGNED_IN - userId:', session.user.id);
          
          if (user?.id !== session.user.id) {
            setUser(session.user);
            await loadProfile(session.user.id);
            startAutoRefresh();
          }
        }

        if (event === "TOKEN_REFRESHED") {
          console.log('✅ TOKEN_REFRESHED');
        }

        if (event === "SIGNED_OUT") {
          console.log('👋 SIGNED_OUT');
          await forceLogout();
        }
        
        if (event === "USER_UPDATED") {
          console.log('👤 USER_UPDATED');
        }
      }
    );

    return () => {
      console.log('🧹 AuthProvider cleanup');
      isMounted.current = false;
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      console.log('🔐 Tentative de connexion pour:', email);
      
      // ✅ Nettoyer d'abord toute session existante
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('❌ Erreur signIn:', error);
        throw error;
      }
      
      console.log('✅ Connexion réussie');
      
      if (data?.session) {
        startAutoRefresh();
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('❌ Exception signIn:', error);
      return { data: null, error };
    }
  };

  console.log('📊 AuthProvider render - user:', !!user, 'profile:', !!profile, 'loading:', loading);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}