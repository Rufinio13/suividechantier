// src/context/AuthProvider.jsx
import { createContext, useEffect, useState, useRef } from "react";
import { supabase, setSupabaseRLSContext, ensureValidSession } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ Refs pour éviter doubles appels
  const isLoadingProfile = useRef(false);
  const isMounted = useRef(true);
  const refreshIntervalRef = useRef(null);

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

  const signOut = async () => {
    console.log('👋 Déconnexion...');
    
    // ✅ Arrêter l'intervalle de rafraîchissement
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // ✅ NOUVEAU : Démarrer le rafraîchissement automatique
  const startAutoRefresh = () => {
    // Nettoyer l'ancien intervalle si existant
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    // Vérifier et rafraîchir la session toutes les 15 minutes
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
      
      // Si expire dans moins de 10 minutes, rafraîchir
      if (timeUntilExpiry < 10 * 60 * 1000) {
        console.log('🔄 Rafraîchissement préventif de la session...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Erreur rafraîchissement:', refreshError);
        } else {
          console.log('✅ Session rafraîchie avec succès');
        }
      }
    }, 15 * 60 * 1000); // Toutes les 15 minutes
    
    console.log('✅ Auto-refresh activé (toutes les 15 minutes)');
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
          
          // ✅ Démarrer le rafraîchissement automatique
          startAutoRefresh();
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
            
            // ✅ Démarrer le rafraîchissement automatique
            startAutoRefresh();
          } else {
            console.log('ℹ️ User déjà chargé, ignoré');
          }
        }

        if (event === "TOKEN_REFRESHED") {
          console.log('✅ TOKEN_REFRESHED - Session rafraîchie automatiquement');
        }

        if (event === "SIGNED_OUT") {
          console.log('👋 SIGNED_OUT');
          
          // ✅ Arrêter le rafraîchissement
          if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
          }
          
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        
        if (event === "USER_UPDATED") {
          console.log('👤 USER_UPDATED');
        }
      }
    );

    return () => {
      console.log('🧹 AuthProvider cleanup');
      isMounted.current = false;
      
      // ✅ Nettoyer l'intervalle
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      authListener?.subscription?.unsubscribe();
    };
  }, []); // ✅ Dépendances vides pour éviter re-déclenchements

  // ✅ CORRIGÉ : signIn doit retourner la promesse ET gérer l'auto-refresh
  const signIn = async (email, password) => {
    try {
      console.log('🔐 Tentative de connexion pour:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('❌ Erreur signIn:', error);
        throw error;
      }
      
      console.log('✅ Connexion réussie');
      
      // ✅ Si connexion réussie, démarrer l'auto-refresh
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