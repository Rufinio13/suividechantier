// src/context/AuthProvider.jsx
import { createContext, useEffect, useState, useRef } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const refreshIntervalRef = useRef(null);

  // ✅ CORRIGÉ : Charger depuis 'utilisateurs' au lieu de 'profiles'
  const loadProfile = async (userId) => {
    console.log('🔍 loadProfile START pour userId:', userId);
    
    try {
      const { data, error } = await supabase
        .from('utilisateurs')  // ✅ CORRECTION ICI
        .select('*')
        .eq('id', userId)
        .single();
      
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
      setProfile(null);
      setLoading(false);
    }
  };

  // Déconnexion
  const signOut = async () => {
    console.log('👋 Déconnexion');
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
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

        // Session existe
        const session = data.session;
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
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('🧹 Cleanup');
      isMounted = false;
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
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