import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShoppingCart, Users, Package, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface Stats { total_orders:number; pending_orders:number; total_revenue:number; today_revenue:number; total_customers:number; new_customers_30d:number; active_products:number; low_stock_count:number; pending_refunds:number; unread_messages:number; }
interface Order { id:string; order_number:string; status:string; total:number; created_at:string; customer_name?:string; }
interface DayRev { date:string; revenue:number; order_count:number; }

const STATUS_STYLES: Record<string,string> = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:  'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-violet-50 text-violet-700 border-violet-200',
  shipped:    'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
};
const INR = (n:number) => `₹${n.toLocaleString('en-IN')}`;

function StatCard({ label, value, sub, icon: Icon, color, trend }:{ label:string; value:string; sub:string; icon:any; color:string; trend?:number }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 hover:shadow-md hover:border-zinc-300 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {trend >= 0 ? <ArrowUp className="h-3 w-3"/> : <ArrowDown className="h-3 w-3"/>}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</p>
      <p className="text-sm font-medium text-zinc-500 mt-0.5">{label}</p>
      <p className="text-xs text-zinc-400 mt-1.5">{sub}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState<Stats|null>(null);
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [chart,   setChart]   = useState<DayRev[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, o, c] = await Promise.all([
        supabase.from('admin_dashboard_stats').select('*').single(),
        supabase.from('orders')
          .select('id, order_number, status, total, created_at, shipping_address')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('admin_revenue_by_day').select('*').order('date', { ascending: true }).limit(30),
      ]);
      if (s.data) setStats(s.data as Stats);
      if (o.data) setOrders(o.data.map((x:any) => ({
        ...x,
        customer_name: x.shipping_address?.full_name ?? 'Guest',
      })));
      if (c.data) setChart(c.data as DayRev[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_,i) => <div key={i} className="h-36 rounded-2xl bg-zinc-200 animate-pulse"/>)}
      </div>
      <div className="h-72 rounded-2xl bg-zinc-200 animate-pulse"/>
    </div>
  );

  return (
    <div className="p-5 sm:p-6 space-y-5 sm:space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'} 👋</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {(stats?.low_stock_count ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0"/>
          <p className="text-sm text-amber-800"><strong>{stats?.low_stock_count}</strong> products running low on stock.</p>
          <button onClick={() => navigate('/dashboard/inventory')} className="ml-auto text-xs font-semibold text-amber-700 underline">View →</button>
        </div>
      )}
      {(stats?.pending_refunds ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0"/>
          <p className="text-sm text-red-800"><strong>{stats?.pending_refunds}</strong> refund request{(stats?.pending_refunds ?? 0) > 1 ? 's' : ''} awaiting review.</p>
          <button onClick={() => navigate('/dashboard/refunds')} className="ml-auto text-xs font-semibold text-red-700 underline">Review →</button>
        </div>
      )}
      {(stats?.unread_messages ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0"/>
          <p className="text-sm text-blue-800"><strong>{stats?.unread_messages}</strong> unread message{(stats?.unread_messages ?? 0) > 1 ? 's' : ''}.</p>
          <button onClick={() => navigate('/dashboard/messages')} className="ml-auto text-xs font-semibold text-blue-700 underline">View →</button>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Revenue"  value={INR(stats?.total_revenue ?? 0)}           sub={`${INR(stats?.today_revenue ?? 0)} today`}          icon={TrendingUp} color="bg-orange-50 text-orange-500"  trend={12}/>
        <StatCard label="Total Orders"   value={(stats?.total_orders ?? 0).toString()}     sub={`${stats?.pending_orders ?? 0} pending`}            icon={ShoppingCart} color="bg-blue-50 text-blue-500"   trend={8}/>
        <StatCard label="Customers"      value={(stats?.total_customers ?? 0).toLocaleString()} sub={`+${stats?.new_customers_30d ?? 0} this month`} icon={Users}      color="bg-violet-50 text-violet-500" trend={5}/>
        <StatCard label="Products"       value={(stats?.active_products ?? 0).toString()}  sub={`${stats?.low_stock_count ?? 0} low stock`}         icon={Package}    color="bg-emerald-50 text-emerald-600" trend={-2}/>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 sm:gap-6">
        <div className="xl:col-span-3 bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-zinc-900">Revenue Overview</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Last 30 days</p>
          </div>
          {chart.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-zinc-400">No revenue data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chart} margin={{top:0,right:0,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="og" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false}/>
                <XAxis dataKey="date" tick={{fontSize:11,fill:'#a1a1aa'}} tickLine={false} axisLine={false} tickFormatter={d => format(new Date(d), 'MMM d')}/>
                <YAxis tick={{fontSize:11,fill:'#a1a1aa'}} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={{background:'#18181b',border:'1px solid #27272a',borderRadius:12,fontSize:12,color:'#fff'}}
                  labelFormatter={l => format(new Date(l), 'PPP')} formatter={(v:number) => [INR(v), 'Revenue']}/>
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#og)"/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-zinc-900">Recent Orders</h2>
            <button onClick={() => navigate('/dashboard/orders')} className="text-xs font-semibold text-orange-500 hover:text-orange-600">View all →</button>
          </div>
          <div className="space-y-2">
            {orders.length === 0 && <p className="text-sm text-zinc-400 text-center py-8">No orders yet</p>}
            {orders.map(o => (
              <div key={o.id} onClick={() => navigate('/dashboard/orders')}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 truncate">#{o.order_number}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{o.customer_name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[o.status] ?? 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                    {o.status}
                  </span>
                  <span className="text-xs font-bold text-zinc-800">{INR(o.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}