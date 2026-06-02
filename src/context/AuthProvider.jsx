import { createContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Ref pour éviter les rechargements de profil en double
  const loadingProfileRef = useRef(false);

  const loadProfile = async (userId) => {
    if (loadingProfileRef.current) return;
    loadingProfileRef.current = true;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
      setLoading(false);

    } catch (err) {
      console.error("❌ Erreur loadProfile:", err);
      setProfile(null);
      setLoading(false);
    } finally {
      loadingProfileRef.current = false;
    }
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  };

  useEffect(() => {
    // ✅ Charger la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setTimeout(() => {
          console.log('🔐 Auth state change:', event);

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // ✅ Connexion ou refresh token (retour arrière-plan mobile)
            setUser(session?.user ?? null);
            if (session?.user) {
              loadProfile(session.user.id);
            }

          } else if (event === 'SIGNED_OUT') {
            // ✅ Vérifier que c'est bien une vraie déconnexion
            // et non un refresh temporaire sur mobile Safari
            supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
              if (!currentSession) {
                // ✅ Vraie déconnexion — vider le state
                setUser(null);
                setProfile(null);
                setLoading(false);
              } else {
                // ✅ Faux SIGNED_OUT (Safari arrière-plan) — session toujours valide
                console.log('⚠️ SIGNED_OUT ignoré — session toujours active');
                setUser(currentSession.user);
                if (!profile) loadProfile(currentSession.user.id);
              }
            });

          } else if (event === 'USER_UPDATED') {
            setUser(session?.user ?? null);
            if (session?.user) loadProfile(session.user.id);
          }

        }, 0);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ✅ Gérer le retour au premier plan sur mobile (Page Visibility API)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 App revenue au premier plan — vérification session...');
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          // Recharger profil si perdu
          if (!profile) {
            loadProfile(session.user.id);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [profile]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}