import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { authService } from '@/services/auth.service';

export interface AuthUser {
  id: string; 
  email: string; 
  full_name: string;
  phone?: string; 
  is_admin: boolean;
  role?: string;
  designation?: string;
  permissions?: string[];
  can_receive_leads?: boolean;
}

interface AuthContextType {
  user: AuthUser | null; 
  session: any | null;
  isLoading: boolean; 
  isAdmin: boolean;
  hasPermission: (key: string) => boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (data: { full_name?: string; phone?: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchSession() {
      try {
        const res = await authService.session();
        if (!mounted) return;
        if (res.data?.user) {
          setUser(res.data.user);
          setSession({ user: res.data.user });
        } else {
          setUser(null);
          setSession(null);
        }
      } catch (err) {
        if (!mounted) return;
        setUser(null);
        setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSession();

    return () => { mounted = false; };
  }, []);

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.email === 'admin@wavesandwires.in' || user.permissions?.includes('*')) {
      return true;
    }
    return Boolean(user.permissions?.includes(permissionKey));
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await authService.login({ email, password });
      if (res.success && res.data?.user) {
        // Must be admin to login to admin panel
        if (!res.data.user.is_admin) {
          toast.error('Access denied. You are not an administrator.');
          await authService.logout();
          return false;
        }
        setUser(res.data.user);
        setSession({ user: res.data.user });
        return true;
      }
      toast.error(res.message || 'Login failed');
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
      return false;
    }
  };

  const signOut = async () => {
    try {
      await authService.logout();
    } catch (e) {}
    setUser(null);
    setSession(null);
  };

  const updateProfile = async (data: { full_name?: string; phone?: string }) => {
    if (!user) return false;
    try {
      const res = await authService.updateProfile(data);
      if (res.success && res.data) {
        setUser(res.data);
        toast.success('Updated successfully');
        return true;
      }
      toast.error(res.message || 'Failed to update profile');
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Update failed');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, isLoading, isAdmin: user?.is_admin ?? false,
      hasPermission, signIn, signOut, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
