import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3,
  Tag, Settings, LogOut, Bell, Boxes, FolderOpen, ChevronRight, RefreshCw, Mail,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const NAV = [
  { to: '/dashboard',            label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/dashboard/orders',     label: 'Orders',     icon: ShoppingCart },
  { to: '/dashboard/products',   label: 'Products',   icon: Package },
  { to: '/dashboard/categories', label: 'Categories', icon: FolderOpen },
  { to: '/dashboard/customers',  label: 'Customers',  icon: Users },
  { to: '/dashboard/analytics',  label: 'Analytics',  icon: BarChart3 },
  { to: '/dashboard/inventory',  label: 'Inventory',  icon: Boxes },
  { to: '/dashboard/coupons',    label: 'Coupons',    icon: Tag },
  { to: '/dashboard/refunds',    label: 'Refunds',    icon: RefreshCw },
  { to: '/dashboard/messages',   label: 'Messages',   icon: Mail },
  { to: '/dashboard/settings',   label: 'Settings',   icon: Settings },
];

export default function AdminLayout() {
  const { user, signOut, isAdmin, isLoading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed,   setCollapsed]   = useState(false);
  const [showAlerts,  setShowAlerts]  = useState(false);
  const [alerts,      setAlerts]      = useState({ refunds: 0, messages: 0 });

  const totalAlerts = alerts.refunds + alerts.messages;

  useEffect(() => {
    if (!isAdmin) return;
    async function loadAlerts() {
      const { data } = await supabase
        .from('admin_dashboard_stats')
        .select('pending_refunds, unread_messages')
        .single();
      if (data) setAlerts({
        refunds:  data.pending_refunds  ?? 0,
        messages: data.unread_messages  ?? 0,
      });
    }
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-yellow-500/20 border-t-yellow-400 animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-4xl">🚫</div>
          <h2 className="text-white font-black text-lg">Access Denied</h2>
          <p className="text-zinc-400 text-sm">
            <span className="text-zinc-200 font-mono">{user.email}</span> doesn't have admin access.
          </p>
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 font-mono text-[10px] text-emerald-400 text-left leading-relaxed">
            UPDATE public.profiles<br/>
            SET is_admin = TRUE<br/>
            WHERE id = (SELECT id FROM auth.users<br/>
            &nbsp;&nbsp;WHERE email = '{user.email}');
          </div>
          <button onClick={() => signOut().then(() => navigate('/login'))}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors underline underline-offset-2">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const initials = (user.full_name || user.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const currentPage = NAV.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to));

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f3ef' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col bg-[#111113] border-r border-white/5 transition-all duration-300 shrink-0 relative"
        style={{ width: collapsed ? 68 : 240 }}>

        <div className="flex items-center gap-3 h-16 px-4 border-b border-white/5 shrink-0">
          <div className="h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
            <span className="text-[10px] font-black text-black">W&W</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate leading-tight">Waves & Wires</p>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-semibold">Admin</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-medium transition-all relative group ${
                  isActive ? 'bg-yellow-400/12 text-yellow-400' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
                }`
              }>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-yellow-400" />}
                  <Icon className={`h-[17px] w-[17px] shrink-0 ${isActive ? 'text-yellow-400' : ''}`} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 p-2 space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-black">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-zinc-300 truncate">{user.full_name || 'Admin'}</p>
                <p className="text-[9px] text-zinc-600 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button onClick={() => signOut().then(() => navigate('/login'))}
            className="flex items-center gap-2.5 w-full rounded-xl px-2.5 py-2 text-xs text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-all font-medium">
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
        </div>

        <button onClick={() => setCollapsed(v => !v)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-[#1a1a1d] border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-all z-10">
          <ChevronRight className={`h-3 w-3 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <header className="flex items-center justify-between bg-white border-b border-zinc-200/80 px-6 h-14 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400 text-xs font-medium">Admin</span>
            {currentPage && (
              <>
                <ChevronRight className="h-3 w-3 text-zinc-300" />
                <span className="font-bold text-zinc-800 text-sm">{currentPage.label}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Bell with dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAlerts(v => !v)}
                className="relative h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors">
                <Bell className="h-4 w-4" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center">
                    {totalAlerts > 9 ? '9+' : totalAlerts}
                  </span>
                )}
              </button>

              {showAlerts && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAlerts(false)} />
                  <div className="absolute right-0 top-10 z-50 w-64 rounded-2xl bg-white border border-zinc-200 shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-100">
                      <p className="text-xs font-bold text-zinc-900">Notifications</p>
                    </div>
                    {totalAlerts === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-zinc-400">
                        No new notifications
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-50">
                        {alerts.refunds > 0 && (
                          <button
                            onClick={() => { navigate('/dashboard/refunds'); setShowAlerts(false); }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-zinc-50 transition-colors text-left">
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                              <RefreshCw className="h-3.5 w-3.5 text-red-600" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-800">
                                {alerts.refunds} Refund Request{alerts.refunds > 1 ? 's' : ''}
                              </p>
                              <p className="text-[10px] text-zinc-400">Awaiting your review</p>
                            </div>
                          </button>
                        )}
                        {alerts.messages > 0 && (
                          <button
                            onClick={() => { navigate('/dashboard/messages'); setShowAlerts(false); }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-zinc-50 transition-colors text-left">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                              <Mail className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-800">
                                {alerts.messages} Unread Message{alerts.messages > 1 ? 's' : ''}
                              </p>
                              <p className="text-[10px] text-zinc-400">From customers</p>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm">
              <span className="text-[10px] font-black text-black">{initials}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: '#f4f3ef' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}