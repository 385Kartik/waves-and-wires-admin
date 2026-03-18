import { useEffect, useState, useCallback } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight, X, Mail, Phone, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface Customer { id:string; full_name:string|null; phone:string|null; email:string; created_at:string; order_count?:number; total_spent?:number; }
interface CustomerOrder { id:string; order_number:string; status:string; total:number; created_at:string; shipping_address:any; }

const INR = (n:number) => `₹${n.toLocaleString('en-IN')}`;
const S_STYLE: Record<string,string> = {
  delivered:  'bg-emerald-50 text-emerald-700',
  cancelled:  'bg-red-50 text-red-600',
  pending:    'bg-amber-50 text-amber-700',
  confirmed:  'bg-blue-50 text-blue-700',
  processing: 'bg-violet-50 text-violet-700',
  shipped:    'bg-indigo-50 text-indigo-700',
};
const PAGE = 20;

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(0);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<Customer|null>(null);
  const [orders,    setOrders]    = useState<CustomerOrder[]>([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('profiles')
      .select('*', { count: 'exact' })
      .eq('is_admin', false)
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (search.trim()) q = q.ilike('full_name', `%${search.trim()}%`);
    const { data, count } = await q;

    const ids = (data ?? []).map((c:any) => c.id);
    let statsMap: Record<string, { count:number; total:number; phone:string }> = {};

    if (ids.length) {
      // Fetch all non-cancelled orders to get count, total spent, and phone
      const { data: orderStats } = await supabase
        .from('orders')
        .select('user_id, total, shipping_address')
        .in('user_id', ids)
        .not('status', 'in', '("cancelled")');

      (orderStats ?? []).forEach((o:any) => {
        if (!statsMap[o.user_id]) statsMap[o.user_id] = { count: 0, total: 0, phone: '' };
        statsMap[o.user_id].count += 1;
        statsMap[o.user_id].total += Number(o.total);
        // Get phone from latest order's shipping address
        if (!statsMap[o.user_id].phone && o.shipping_address?.phone) {
          statsMap[o.user_id].phone = o.shipping_address.phone;
        }
      });
    }

    setCustomers((data ?? []).map((c:any) => ({
      ...c,
      phone:       statsMap[c.id]?.phone || c.phone || null,
      order_count: statsMap[c.id]?.count ?? 0,
      total_spent: statsMap[c.id]?.total ?? 0,
    })));
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function viewCustomer(c: Customer) {
    setSelected(c);
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, shipping_address')
      .eq('user_id', c.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setOrders(data ?? []);

    // Fill phone from latest order if not set
    if (data && data.length > 0 && !c.phone) {
      const phone = data[0].shipping_address?.phone;
      if (phone) setSelected(prev => prev ? { ...prev, phone } : prev);
    }
  }

  const pages = Math.ceil(total / PAGE);

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Customers</h1>
        <p className="text-sm text-zinc-500">{total} registered</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"/>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name…"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"/>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                {['Customer','Phone','Orders','Total Spent','Joined',''].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider ${h==='Orders'||h==='Total Spent'?'text-right':h===''?'text-right':'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading
                ? [...Array(6)].map((_,i) => (
                    <tr key={i}>{[...Array(6)].map((_,j) => <td key={j} className="px-4 py-4"><div className="h-4 rounded-lg bg-zinc-100 animate-pulse"/></td>)}</tr>
                  ))
                : customers.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-50/70 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {(c.full_name ?? 'G').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-800 text-xs">{c.full_name ?? 'No Name'}</p>
                            <p className="text-[10px] text-zinc-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-500">{c.phone ?? '—'}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-zinc-800 text-xs">{c.order_count}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-700 text-xs">{INR(c.total_spent ?? 0)}</td>
                      <td className="px-4 py-3.5 text-xs text-zinc-400">{format(new Date(c.created_at), 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button onClick={() => viewCustomer(c)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all opacity-0 group-hover:opacity-100">
                          <Eye className="h-4 w-4"/>
                        </button>
                      </td>
                    </tr>
                  ))
              }
              {!loading && customers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-400 text-sm">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
          <p className="text-xs text-zinc-500">Showing {Math.min(page*PAGE+1,total)}–{Math.min((page+1)*PAGE,total)} of {total}</p>
          <div className="flex gap-1">
            <button disabled={page===0} onClick={() => setPage(p => p-1)} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/></button>
            <button disabled={page>=pages-1} onClick={() => setPage(p => p+1)} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"><ChevronRight className="h-4 w-4"/></button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)}/>
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-zinc-900">Customer Profile</h2>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500"><X className="h-4 w-4"/></button>
            </div>
            <div className="flex-1 p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-orange-200">
                  {(selected.full_name ?? 'G').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-zinc-900 text-lg">{selected.full_name ?? 'No Name'}</p>
                  <p className="text-xs text-zinc-400">Joined {format(new Date(selected.created_at), 'PPP')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-50 rounded-2xl p-3.5 col-span-2">
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1"><Mail className="h-3 w-3"/>Email</p>
                  <p className="text-xs font-semibold text-zinc-800 break-all">{selected.email}</p>
                </div>
                <div className="bg-zinc-50 rounded-2xl p-3.5">
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1"><Phone className="h-3 w-3"/>Phone</p>
                  <p className="text-xs font-semibold text-zinc-800">{selected.phone ?? '—'}</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-3.5">
                  <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1"><ShoppingBag className="h-3 w-3"/>Orders</p>
                  <p className="text-xl font-black text-orange-600">{selected.order_count}</p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-3.5 col-span-2">
                  <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider mb-1">Total Spent</p>
                  <p className="text-xl font-black text-emerald-700">{INR(selected.total_spent ?? 0)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5">Order History</p>
                {orders.length === 0
                  ? <p className="text-sm text-zinc-400 text-center py-6">No orders yet</p>
                  : (
                    <div className="border border-zinc-100 rounded-2xl overflow-hidden divide-y divide-zinc-50">
                      {orders.map(o => (
                        <div key={o.id} className="flex items-center justify-between p-3.5 bg-white">
                          <div>
                            <p className="font-bold text-xs text-orange-500">#{o.order_number}</p>
                            <p className="text-[10px] text-zinc-400">{format(new Date(o.created_at), 'dd MMM yyyy')}</p>
                            {o.shipping_address?.phone && (
                              <p className="text-[10px] text-zinc-400">📞 {o.shipping_address.phone}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${S_STYLE[o.status] ?? 'bg-zinc-100 text-zinc-600'}`}>{o.status}</span>
                            <span className="font-bold text-sm text-zinc-800">{INR(o.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}