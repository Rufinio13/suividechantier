// src/context/AuthProvider.jsx
import { createContext, useEffect, useState, useRef } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const refreshIntervalRef = useRef(null);
  const isLoadingProfileRef = useRef(false);

  // ✅ Charger le profil avec timeout et logs détaillés
  const loadProfile = async (userId) => {
    // Éviter les appels simultanés
    if (isLoadingProfileRef.current) {
      console.log('⚠️ loadProfile déjà en cours, skip');
      return;
    }
    
    isLoadingProfileRef.current = true;
    console.log('🔍 loadProfile START pour userId:', userId);
    
    try {
      console.log('📡 Envoi requête Supabase...');
      
      // ✅ Timeout de 10 secondes
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.error('⏱️ TIMEOUT atteint après 10s');
          reject(new Error('Timeout après 10s'));
        }, 10000)
      );
      
      // Requête Supabase avec logs
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(result => {
          console.log('📥 Réponse Supabase reçue:', {
            hasData: !!result.data,
            hasError: !!result.error,
            errorCode: result.error?.code,
            errorMessage: result.error?.message
          });
          return result;
        });
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      
      console.log('📡 loadProfile RESPONSE:', { 
        hasData: !!data, 
        errorCode: error?.code,
        errorMessage: error?.message,
        nomsociete: data?.nomsociete
      });
      
      if (error) {
        console.error('❌ Erreur loadProfile:', error);
        
        // ✅ NE JAMAIS déconnecter automatiquement
        console.warn('⚠️ Impossible de charger le profil, mais session conservée');
        setProfile(null);
        setLoading(false);
        isLoadingProfileRef.current = false;
        return;
      }
      
      if (!data) {
        console.error('❌ Pas de profil trouvé pour userId:', userId);
        setProfile(null);
        setLoading(false);
        isLoadingProfileRef.current = false;
        return;
      }
      
      console.log('✅ Profil chargé avec succès:', {
        id: data.id,
        email: data.email,
        nomsociete: data.nomsociete,
        prenom: data.prenom,
        nom: data.nom
      });
      
      // ✅ Définir le contexte RLS
      if (data?.nomsociete) {
        console.log('🔐 Définition du contexte RLS:', data.nomsociete);
        await setSupabaseRLSContext(data.nomsociete);
      }
      
      setProfile(data);
      setLoading(false);
      
    } catch (err) {
      console.error("❌ EXCEPTION loadProfile:", {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      
      // ✅ NE JAMAIS déconnecter automatiquement
      console.warn('⚠️ Erreur chargement profil, mais session conservée');
      setProfile(null);
      setLoading(false);
      
    } finally {
      isLoadingProfileRef.current = false;
      console.log('🏁 loadProfile TERMINÉ');
    }
  };

  // ✅ Déconnexion MANUELLE uniquement
  const signOut = async () => {
    console.log('👋 Déconnexion manuelle');
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    isLoadingProfileRef.current = false;
    setUser(null);
    setProfile(null);
    setLoading(false);
    
    // Reset du contexte RLS
    await setSupabaseRLSContext(null);
    await supabase.auth.signOut();
    
    console.log('✅ Déconnexion terminée');
  };

  // ✅ Auto-refresh session (sans déconnexion)
  const startAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    console.log('🔄 Démarrage auto-refresh session (vérification toutes les 5min)');
    
    refreshIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('⚠️ Plus de session active');
          return;
        }
        
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        console.log(`⏱️ Session expire dans ${Math.floor(timeUntilExpiry / 60000)} minutes`);
        
        // Rafraîchir 10 minutes avant expiration
        if (timeUntilExpiry < 10 * 60 * 1000 && timeUntilExpiry > 0) {
          console.log('🔄 Rafraîchissement automatique de la session');
          const { error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('❌ Erreur refresh session:', error);
            console.warn('⚠️ Impossible de rafraîchir la session, mais on continue');
          } else {
            console.log('✅ Session rafraîchie avec succès');
          }
        }
      } catch (err) {
        console.error('❌ Erreur auto-refresh:', err);
      }
    }, 5 * 60 * 1000); // Vérifier toutes les 5 minutes
  };

  // Effect principal
  useEffect(() => {
    console.log('🚀 AuthProvider INIT');
    
    let isMounted = true;

    const initAuth = async () => {
      try {
        console.log('🔍 Vérification session initiale...');
        const { data, error } = await supabase.auth.getSession();
        
        console.log('📊 Session check:', { 
          hasSession: !!data?.session, 
          hasError: !!error,
          userId: data?.session?.user?.id,
          email: data?.session?.user?.email
        });
        
        // ✅ Erreur de session
        if (error) {
          console.error('❌ Erreur session:', error);
          
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        // Pas de session
        if (!data?.session) {
          console.log('ℹ️ Pas de session active');
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        // ✅ Session expirée : essayer de rafraîchir
        const session = data.session;
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        
        if (now >= expiresAt) {
          console.warn('⚠️ Session expirée, tentative de rafraîchissement...');
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            console.error('❌ Impossible de rafraîchir la session:', refreshError);
            if (isMounted) {
              setUser(null);
              setProfile(null);
              setLoading(false);
            }
            return;
          }
          
          console.log('✅ Session rafraîchie avec succès');
          if (isMounted) {
            setUser(refreshData.session.user);
            await loadProfile(refreshData.session.user.id);
            startAutoRefresh();
          }
          return;
        }

        // Session valide
        console.log('✅ Session valide:', {
          userId: session.user.id,
          email: session.user.email,
          expiresIn: Math.floor((expiresAt - now) / 60000) + ' minutes'
        });
        
        if (isMounted) {
          setUser(session.user);
          await loadProfile(session.user.id);
          startAutoRefresh();
        }

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

    // Listener auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth event:', event, {
          hasSession: !!session,
          userId: session?.user?.id
        });
        
        if (!isMounted) return;

        switch (event) {
          case "SIGNED_IN":
            if (session?.user) {
              console.log('✅ SIGNED_IN:', session.user.id);
              setUser(session.user);
              await loadProfile(session.user.id);
              startAutoRefresh();
            }
            break;

          case "SIGNED_OUT":
            console.log('👋 SIGNED_OUT');
            if (refreshIntervalRef.current) {
              clearInterval(refreshIntervalRef.current);
              refreshIntervalRef.current = null;
            }
            isLoadingProfileRef.current = false;
            await setSupabaseRLSContext(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            break;

          case "TOKEN_REFRESHED":
            console.log('🔄 TOKEN_REFRESHED');
            if (session?.user && !profile && !isLoadingProfileRef.current) {
              await loadProfile(session.user.id);
            }
            break;

          case "USER_UPDATED":
            console.log('🔄 USER_UPDATED');
            if (session?.user) {
              await loadProfile(session.user.id);
            }
            break;
        }
      }
    );

    // Cleanup
    return () => {
      console.log('🧹 AuthProvider cleanup');
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

  console.log('📊 AuthProvider state - user:', !!user, 'profile:', !!profile, 'loading:', loading, 'nomsociete:', profile?.nomsociete);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}