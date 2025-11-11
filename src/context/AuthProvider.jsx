// src/context/AuthProvider.jsx
import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);    // user profil (depuis table users)
  const [loading, setLoading] = useState(true);

  // récupère session existante + initialise listener
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;
        if (session?.user) {
          // si besoin, récupère profil depuis table users (optionnel)
          const { data: profile } = await supabase
            .from('users')
            .select('id, nom, prenom, mail, profil, nomSociete')
            .eq('id', session.user.id)
            .single();
          if (mounted) setUser(profile ?? session.user);
        } else {
          if (mounted) setUser(null);
        }
      } catch (err) {
        console.error('init session error', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      // Sur chaque changement d'auth on charge le profil complet
      (async () => {
        if (session?.user) {
          try {
            const { data: profile } = await supabase
              .from('users')
              .select('id, nom, prenom, mail, profil, nomSociete')
              .eq('id', session.user.id)
              .single();
            setUser(profile ?? session.user);
          } catch (err) {
            console.error('fetch after onAuthStateChange error', err);
            setUser(session.user);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      // nettoyage compatible v2
      if (subscription?.unsubscribe) subscription.unsubscribe();
      else if (subscription?.subscription?.unsubscribe) subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }
    // attendre que onAuthStateChange mette à jour le user via listener
    return data;
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) console.error('signOut error', error);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
