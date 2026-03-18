import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface AuthUser {
  id: string; email: string; full_name: string;
  phone?: string; is_admin: boolean;
}

interface AuthContextType {
  user: AuthUser | null; session: Session | null;
  isLoading: boolean; isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (data: { full_name?: string; phone?: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [session, setSession]   = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function handleSession(sess: Session | null) {
      if (!mounted) return;
      if (!sess?.user) { setUser(null); setSession(null); setLoading(false); return; }
      setSession(sess);
      const { data: profile } = await supabase
        .from('profiles').select('id,full_name,phone,is_admin').eq('id', sess.user.id).single();
      if (!mounted) return;
      setUser({
        id: sess.user.id, email: sess.user.email ?? '',
        full_name: profile?.full_name ?? sess.user.user_metadata?.full_name ?? '',
        phone: profile?.phone ?? undefined,
        is_admin: profile?.is_admin ?? false,
      });
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      handleSession(session);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const updateProfile = async (data: { full_name?: string; phone?: string }) => {
    if (!user) return false;
    const { error } = await supabase.from('profiles').update(data).eq('id', user.id);
    if (error) { toast.error(error.message); return false; }
    setUser(prev => prev ? { ...prev, ...data } : prev);
    toast.success('Updated'); return true;
  };

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, isAdmin: user?.is_admin ?? false,
      signIn, signOut, updateProfile,
    }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
