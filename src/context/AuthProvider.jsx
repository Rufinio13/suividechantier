import { createContext, useEffect, useState, useRef } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const refreshIntervalRef = useRef(null);
  const pingIntervalRef = useRef(null); // ✅ NOUVEAU
  const isLoadingProfileRef = useRef(false);

  const loadProfile = async (userId) => {
    if (isLoadingProfileRef.current) {
      return;
    }
    
    isLoadingProfileRef.current = true;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        console.error('❌ Erreur loadProfile:', error);
        setProfile(null);
        setLoading(false);
        isLoadingProfileRef.current = false;
        return;
      }
      
      if (data?.nomsociete) {
        await setSupabaseRLSContext(data.nomsociete);
      }
      
      setProfile(data);
      setLoading(false);
      
    } catch (err) {
      console.error("❌ Exception loadProfile:", err);
      setProfile(null);
      setLoading(false);
    } finally {
      isLoadingProfileRef.current = false;
    }
  };

  const signOut = async () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    isLoadingProfileRef.current = false;
    setUser(null);
    setProfile(null);
    setLoading(false);
    
    await setSupabaseRLSContext(null);
    await supabase.auth.signOut();
  };

  // ✅ NOUVEAU : Ping régulier pour garder la connexion active
  const startPing = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    
    pingIntervalRef.current = setInterval(async () => {
      try {
        // Ping léger : juste récupérer la session
        await supabase.auth.getSession();
      } catch (err) {
        console.error('❌ Erreur ping:', err);
      }
    }, 2 * 60 * 1000); // ✅ Toutes les 2 minutes
  };

  const startAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    refreshIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;
        
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        if (timeUntilExpiry < 10 * 60 * 1000 && timeUntilExpiry > 0) {
          await supabase.auth.refreshSession();
        }
      } catch (err) {
        console.error('❌ Erreur auto-refresh:', err);
      }
    }, 5 * 60 * 1000);
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error || !data?.session) {
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const session = data.session;
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        
        if (now >= expiresAt) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            if (isMounted) {
              setUser(null);
              setProfile(null);
              setLoading(false);
            }
            return;
          }
          
          if (isMounted) {
            setUser(refreshData.session.user);
            await loadProfile(refreshData.session.user.id);
            startAutoRefresh();
            startPing(); // ✅ NOUVEAU
          }
          return;
        }
        
        if (isMounted) {
          setUser(session.user);
          await loadProfile(session.user.id);
          startAutoRefresh();
          startPing(); // ✅ NOUVEAU
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        switch (event) {
          case "SIGNED_IN":
            if (session?.user) {
              setUser(session.user);
              await loadProfile(session.user.id);
              startAutoRefresh();
              startPing(); // ✅ NOUVEAU
            }
            break;

          case "SIGNED_OUT":
            if (refreshIntervalRef.current) {
              clearInterval(refreshIntervalRef.current);
              refreshIntervalRef.current = null;
            }
            if (pingIntervalRef.current) {
              clearInterval(pingIntervalRef.current);
              pingIntervalRef.current = null;
            }
            isLoadingProfileRef.current = false;
            await setSupabaseRLSContext(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            break;

          case "TOKEN_REFRESHED":
            if (session?.user && !profile && !isLoadingProfileRef.current) {
              await loadProfile(session.user.id);
            }
            break;

          case "USER_UPDATED":
            if (session?.user) {
              await loadProfile(session.user.id);
            }
            break;
        }
      }
    );

    return () => {
      isMounted = false;
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        return { data: null, error };
      }
      
      return { data, error: null };
      
    } catch (error) {
      return { data: null, error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}