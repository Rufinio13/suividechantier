// src/context/AuthProvider.jsx
import { createContext, useEffect, useState } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

const SESSION_DURATION = 10 * 60 * 1000; // 10 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifier si la session est expirée
  const isSessionExpired = () => {
    const lastActivity = localStorage.getItem('lastActivity');
    if (!lastActivity) return true;
    
    const elapsed = Date.now() - parseInt(lastActivity);
    return elapsed > SESSION_DURATION;
  };

  // Mettre à jour l'activité
  const updateActivity = () => {
    localStorage.setItem('lastActivity', Date.now().toString());
  };

  // Forcer la déconnexion
  const forceSignOut = async () => {
    console.log('🚪 Session expirée - déconnexion');
    await supabase.auth.signOut();
    localStorage.removeItem('lastActivity');
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  // Charger le profil depuis Supabase
  const loadProfile = async (userId) => {
    console.log('📥 Chargement profile depuis Supabase...');
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error("❌ Erreur loadProfile:", error);
        // Si le profile ne charge pas, déconnecter
        await forceSignOut();
        return;
      }

      console.log('✅ Profile chargé:', data);
      setProfile(data);
      setLoading(false);
      
      if (data?.nomsociete) {
        await setSupabaseRLSContext(data.nomsociete);
      }
      
      updateActivity();
    } catch (err) {
      console.error("❌ Exception loadProfile:", err);
      await forceSignOut();
    }
  };

  useEffect(() => {
    let mounted = true;
    let activityCheckInterval = null;

    const initAuth = async () => {
      // Vérifier si la session est expirée
      if (isSessionExpired()) {
        console.log('⏰ Session expirée au démarrage');
        await forceSignOut();
        return;
      }

      // Récupérer la session
      const { data } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (data?.session?.user) {
        setUser(data.session.user);
        await loadProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    };

    initAuth();

    // Écouter les changements d'auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          console.log('✅ SIGNED_IN');
          setUser(session.user);
          await loadProfile(session.user.id);
        }

        if (event === "SIGNED_OUT") {
          console.log('👋 SIGNED_OUT');
          await forceSignOut();
        }
      }
    );

    // Vérifier la session toutes les minutes
    activityCheckInterval = setInterval(() => {
      if (user && isSessionExpired()) {
        console.log('⏰ Inactivité détectée - déconnexion');
        forceSignOut();
      }
    }, 60 * 1000); // Vérifier chaque minute

    // Mettre à jour l'activité sur les interactions
    const updateOnActivity = () => {
      if (user) {
        updateActivity();
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateOnActivity);
    });

    // Vérifier la session au focus de la page
    const handleFocus = async () => {
      if (user && isSessionExpired()) {
        console.log('⏰ Session expirée au retour');
        await forceSignOut();
      } else if (user) {
        updateActivity();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
      
      if (activityCheckInterval) {
        clearInterval(activityCheckInterval);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, updateOnActivity);
      });
      
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.data?.user) {
      updateActivity();
    }
    return result;
  };

  const signOut = async () => {
    await forceSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}