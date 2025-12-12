// src/context/AuthProvider.jsx
import { createContext, useEffect, useState } from "react";
import { supabase, setSupabaseRLSContext } from "@/lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger le profil via API REST directement
  const loadProfile = async (userId) => {
    console.log('🔍 loadProfile via API REST pour userId:', userId);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
      
      console.log('📡 Appel API REST...');
      
      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      );
      
      console.log('📡 Réponse API:', response.status);
      
      if (!response.ok) {
        console.error('❌ Erreur HTTP:', response.status, response.statusText);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('📡 Data reçue:', data);
      
      if (!data || data.length === 0) {
        console.error('❌ Aucun profile trouvé');
        setProfile(null);
        setLoading(false);
        return;
      }
      
      const profileData = data[0];
      console.log('✅ Profile chargé:', profileData);
      
      setProfile(profileData);
      setLoading(false);
      
      if (profileData?.nomsociete) {
        await setSupabaseRLSContext(profileData.nomsociete);
      }
      
    } catch (err) {
      console.error("❌ Exception loadProfile:", err);
      setProfile(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 AuthProvider useEffect DÉMARRE');
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      console.log('📡 getSession retour');
      
      if (!mounted) return;

      if (data?.session?.user) {
        console.log('👤 User trouvé:', data.session.user.id);
        setUser(data.session.user);
        loadProfile(data.session.user.id);
      } else {
        console.log('❌ Pas de session');
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 onAuthStateChange:', event);
        
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          console.log('✅ SIGNED_IN - userId:', session.user.id);
          setUser(session.user);
          await loadProfile(session.user.id);
        }

        if (event === "SIGNED_OUT") {
          console.log('👋 SIGNED_OUT');
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('🧹 AuthProvider cleanup');
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = async () => {
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