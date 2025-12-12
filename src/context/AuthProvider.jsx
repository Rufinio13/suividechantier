// src/context/AuthProvider.jsx
import { createContext, useEffect, useState, useRef } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes en millisecondes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef(null);

  // Fonction pour déconnecter l'utilisateur
  const forceSignOut = async () => {
    console.log('⏰ Déconnexion automatique (inactivité)');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = '/login';
  };

  // Réinitialiser le timer d'inactivité
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    
    if (user) {
      inactivityTimer.current = setTimeout(() => {
        forceSignOut();
      }, INACTIVITY_TIMEOUT);
    }
  };

  // Fonction pour charger le profil depuis Supabase
  const loadProfile = async (userId) => {
    console.log('📥 loadProfile appelé pour userId:', userId);
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error("❌ Erreur loadProfile:", error);
        // Si le profil ne charge pas après 3 secondes, forcer déconnexion
        setTimeout(() => {
          if (!profile) {
            console.error("❌ Timeout loadProfile - déconnexion forcée");
            forceSignOut();
          }
        }, 3000);
        return;
      }

      console.log('✅ Profile chargé:', data);
      setProfile(data || null);
      setLoading(false);
      
      // ✅ Définir le contexte RLS après avoir chargé le profil
      if (data?.nomsociete) {
        console.log('🔐 Définition RLS context pour:', data.nomsociete);
        await setSupabaseRLSContext(data.nomsociete);
      } else {
        console.warn('⚠️ Pas de nomsociete dans le profile');
      }
    } catch (err) {
      console.error("❌ Exception loadProfile:", err);
      forceSignOut();
    }
  };

  useEffect(() => {
    console.log('🚀 AuthProvider useEffect - Initialisation');
    
    // Récupère la session initiale
    supabase.auth.getSession().then(({ data, error }) => {
      console.log("AuthProvider: session initiale", data?.session);
      
      if (error) {
        console.error("❌ Erreur getSession:", error);
        setLoading(false);
        return;
      }
      
      if (data?.session?.user) {
        console.log('👤 User trouvé dans session:', data.session.user.id);
        setUser(data.session.user);
        loadProfile(data.session.user.id);
        resetInactivityTimer();
      } else {
        console.log('❌ Pas de session');
        setLoading(false);
      }
    });

    // Écoute les changements d'auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔔 onAuthStateChange reçu:", event);

        if (event === "SIGNED_IN" && session?.user) {
          console.log('✅ SIGNED_IN - User:', session.user.id);
          setUser(session.user);
          await loadProfile(session.user.id);
          resetInactivityTimer();
        }

        if (event === "SIGNED_OUT") {
          console.log('👋 SIGNED_OUT');
          setUser(null);
          setProfile(null);
          setLoading(false);
          if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
          }
        }
      }
    );

    // Écouter les événements d'activité pour réinitialiser le timer
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    // Écouter la visibilité de la page
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 Page cachée');
      } else {
        console.log('📱 Page visible - vérification session');
        // Vérifier si la session est toujours valide
        supabase.auth.getSession().then(({ data }) => {
          if (!data?.session) {
            console.log('❌ Session expirée - redirection');
            forceSignOut();
          } else {
            resetInactivityTimer();
          }
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      console.log('🧹 AuthProvider cleanup');
      authListener?.subscription?.unsubscribe();
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = async () => {
    console.log('🚪 signOut appelé');
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