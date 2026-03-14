import { createContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId) => {
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

    // ✅ FIX : setTimeout(0) pour éviter le blocage
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // ✅ CRITIQUE : Déplacer dans la file d'événements
        setTimeout(() => {
          console.log('🔐 Auth state change:', event);
          
          setUser(session?.user ?? null);
          
          if (event === "SIGNED_IN" && session?.user) {
            loadProfile(session.user.id);
          } else if (event === "SIGNED_OUT") {
            setProfile(null);
            setLoading(false);
          }
        }, 0); // ✅ Le 0 est important !
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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