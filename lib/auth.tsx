'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { syncTripsToSupabase, mergeAndSaveTrips, saveTrips } from './trips';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const syncOnLogin = useCallback(async (userId: string) => {
    try {
      const { synced, failed } = await syncTripsToSupabase(userId);
      if (synced > 0) {
        console.log(`Synced ${synced} trips to Supabase`);
      }
      if (failed > 0) {
        console.warn(`Failed to sync ${failed} trips`);
      }
    } catch (err) {
      console.error('Trip sync error:', err);
    }
  }, []);

  const loadMergedTrips = useCallback(async (userId: string) => {
    try {
      const merged = await mergeAndSaveTrips(userId);
      console.log(`Loaded ${merged.length} total trips (merged local + Supabase)`);
    } catch (err) {
      console.error('Error loading merged trips:', err);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      
      if (data.session?.user) {
        loadMergedTrips(data.session.user.id);
      }
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        syncOnLogin(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncOnLogin, loadMergedTrips]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error?.message || null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      await supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
        if (data.session?.user) {
          syncOnLogin(data.session.user.id);
        }
      });
    }
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
