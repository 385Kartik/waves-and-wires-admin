import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3,
  Tag, Settings, LogOut, Bell, Boxes, FolderOpen, ChevronRight, RefreshCw, Mail,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
  const [collapsed, setCollapsed] = useState(false);

  // 1. Still loading — show dark spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0c10] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-yellow-500/20 border-t-yellow-400 animate-spin" />
      </div>
    );
  }

  // 2. Not logged in at all — declarative redirect (no useEffect, no loop possible)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Logged in but NOT admin — show clear message, NO redirect (prevents loop)
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

  // 4. Fully authenticated admin — render the dashboard
  const initials = (user.full_name || user.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const currentPage = NAV.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to));

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f3ef' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col bg-[#111113] border-r border-white/5 transition-all duration-300 shrink-0 relative"
        style={{ width: collapsed ? 68 : 240 }}>

        {/* Logo */}
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-medium transition-all relative group ${
                  isActive
                    ? 'bg-yellow-400/12 text-yellow-400'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
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

        {/* User + signout */}
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

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(v => !v)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-[#1a1a1d] border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-all z-10">
          <ChevronRight className={`h-3 w-3 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Topbar */}
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
            <button className="relative h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors">
              <Bell className="h-4 w-4" />
            </button>
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
