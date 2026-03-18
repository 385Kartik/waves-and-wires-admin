import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const { signIn, user, isAdmin, isLoading } = useAuth();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  // 1. Still loading session — show spinner, never redirect yet
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-yellow-500/20 border-t-yellow-400 animate-spin" />
      </div>
    );
  }

  // 2. Loaded + logged in + is admin — declarative redirect (no useEffect, no loop)
  if (user && isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const ok = await signIn(email, password);
    setSubmitting(false);
    if (!ok) setError('Invalid email or password.');
    // If ok: auth state updates → component re-renders → case 2 above triggers
  }

  return (
    <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-yellow-500/6 blur-[100px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-xl shadow-yellow-500/20">
              <span className="text-[11px] font-black text-black leading-none">W&W</span>
            </div>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">Waves & Wires</h1>
          <p className="text-[10px] text-zinc-500 mt-1 font-medium uppercase tracking-widest">Admin Console</p>
        </div>

        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-7 shadow-2xl shadow-black/60">
          {/* Logged in but no admin access */}
          {user && !isAdmin ? (
            <div className="space-y-4 text-center">
              <div className="text-3xl">🚫</div>
              <div>
                <p className="text-white font-bold text-sm">No Admin Access</p>
                <p className="text-zinc-400 text-xs mt-1 break-all">{user.email}</p>
              </div>
              <div className="rounded-xl bg-zinc-800/80 border border-zinc-700/50 p-3 text-left font-mono text-[10px] text-emerald-400 leading-relaxed">
                Run in Supabase SQL Editor:<br/>
                <span className="text-zinc-300">UPDATE</span> public.profiles<br/>
                <span className="text-zinc-300">SET</span> is_admin = <span className="text-yellow-400">TRUE</span><br/>
                <span className="text-zinc-300">WHERE</span> id = (<span className="text-zinc-300">SELECT</span> id<br/>
                &nbsp;&nbsp;<span className="text-zinc-300">FROM</span> auth.users<br/>
                &nbsp;&nbsp;<span className="text-zinc-300">WHERE</span> email = <span className="text-amber-400">'{user.email}'</span>);
              </div>
              <button
                onClick={async () => { await supabase.auth.signOut(); }}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors underline underline-offset-2">
                Sign out → try another account
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-white mb-5">Sign in to continue</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="admin@example.com" autoComplete="email"
                      className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/10 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                    <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" autoComplete="current-password"
                      className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/10 transition-all" />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2">{error}</p>
                )}
                <button type="submit" disabled={submitting}
                  className="w-full bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 disabled:opacity-50 text-black font-black rounded-xl py-2.5 text-sm transition-all shadow-lg shadow-yellow-500/15 active:scale-[0.99]">
                  {submitting
                    ? <span className="flex items-center justify-center gap-2"><span className="h-3.5 w-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />Signing in…</span>
                    : 'Sign In'}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-[10px] text-zinc-700 mt-5 uppercase tracking-wider">Restricted · Waves & Wires Admin</p>
      </div>
    </div>
  );
}
