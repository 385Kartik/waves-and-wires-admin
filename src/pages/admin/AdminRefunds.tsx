import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, Eye, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RefundRequest {
  id: string; order_id: string; reason: string; status: string;
  admin_note: string|null; created_at: string;
  order_number: string; total: number;
  payment_method: string; payment_status: string; payment_ref: string|null;
  customer_name: string; customer_phone: string;
}

const SS: Record<string,string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  approved:  'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected:  'bg-red-50 text-red-700 border-red-200',
};
const INR = (n:number) => `₹${n.toLocaleString('en-IN')}`;

export default function AdminRefunds() {
  const [requests,     setRequests]     = useState<RefundRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<RefundRequest|null>(null);
  const [adminNote,    setAdminNote]    = useState('');
  const [updating,     setUpdating]     = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('refund_requests')
      .select(`
        id, order_id, reason, status, admin_note, created_at,
        orders (
          order_number, total, payment_method, payment_status,
          payment_ref, shipping_address
        )
      `)
      .order('created_at', { ascending: false });

    if (error) { toast.error(error.message); setLoading(false); return; }

    setRequests((data ?? []).map((r:any) => ({
      id:             r.id,
      order_id:       r.order_id,
      reason:         r.reason,
      status:         r.status,
      admin_note:     r.admin_note,
      created_at:     r.created_at,
      order_number:   r.orders?.order_number   ?? '—',
      total:          r.orders?.total          ?? 0,
      payment_method: r.orders?.payment_method ?? '—',
      payment_status: r.orders?.payment_status ?? '—',
      payment_ref:    r.orders?.payment_ref    ?? null,
      customer_name:  r.orders?.shipping_address?.full_name ?? 'Guest',
      customer_phone: r.orders?.shipping_address?.phone     ?? '—',
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, newStatus: string, orderId: string) {
    setUpdating(true);
    try {
      const { error: rErr } = await supabase
        .from('refund_requests')
        .update({ status: newStatus, admin_note: adminNote || null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (rErr) throw rErr;

      if (newStatus === 'completed') {
        await supabase.from('orders').update({
          status: 'refunded', payment_status: 'refunded', updated_at: new Date().toISOString()
        }).eq('id', orderId);
      } else if (newStatus === 'rejected') {
        await supabase.from('orders').update({
          status: 'delivered', updated_at: new Date().toISOString()
        }).eq('id', orderId);
      }

      toast.success(`Refund ${newStatus} successfully`);
      setSelected(null); setAdminNote('');
      await load();
    } catch (err:any) {
      toast.error(err.message ?? 'Failed to update');
    } finally { setUpdating(false); }
  }

  const filtered = filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus);

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Refund Requests</h1>
          <p className="text-sm text-zinc-500">{requests.filter(r => r.status === 'pending').length} pending</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-xl px-3.5 py-2 hover:bg-zinc-50 transition-all">
          <RefreshCw className="h-3.5 w-3.5"/>Refresh
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {['all','pending','approved','completed','rejected'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${filterStatus===s?'bg-zinc-900 text-white':'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300'}`}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                {['Order','Customer','Status','Payment','Amount','Requested',''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading
                ? [...Array(4)].map((_,i) => (
                    <tr key={i}>{[...Array(7)].map((_,j) => <td key={j} className="px-4 py-4"><div className="h-4 rounded-lg bg-zinc-100 animate-pulse"/></td>)}</tr>
                  ))
                : filtered.map(r => (
                    <tr key={r.id} className="hover:bg-zinc-50/70 transition-colors group">
                      <td className="px-4 py-3.5 font-bold text-amber-600 text-xs">#{r.order_number}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-zinc-800 text-xs">{r.customer_name}</p>
                        <p className="text-[11px] text-zinc-400">{r.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${SS[r.status] ?? ''}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-500 capitalize">
                        {r.payment_method === 'cod' ? 'COD' : 'Online'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-zinc-800 text-xs">{INR(r.total)}</td>
                      <td className="px-4 py-3.5 text-[11px] text-zinc-400">{format(new Date(r.created_at), 'dd MMM, h:mm a')}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button onClick={() => { setSelected(r); setAdminNote(r.admin_note ?? ''); }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all opacity-0 group-hover:opacity-100">
                          <Eye className="h-4 w-4"/>
                        </button>
                      </td>
                    </tr>
                  ))
              }
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-400 text-sm">No refund requests found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)}/>
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-zinc-900">#{selected.order_number}</h2>
                <p className="text-xs text-zinc-400">Refund Request · {INR(selected.total)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500">
                <X className="h-4 w-4"/>
              </button>
            </div>

            <div className="flex-1 p-6 space-y-5">
              <div className="flex gap-2 items-center">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${SS[selected.status] ?? ''}`}>{selected.status}</span>
                <span className="text-xs text-zinc-400">{format(new Date(selected.created_at), 'PPp')}</span>
              </div>

              <div className="bg-zinc-50 rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Customer</p>
                  <p className="font-semibold text-zinc-900 text-sm">{selected.customer_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Phone</p>
                  <p className="font-semibold text-zinc-900 text-sm">{selected.customer_phone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Payment</p>
                  <p className="font-semibold text-zinc-900 text-sm capitalize">
                    {selected.payment_method === 'cod' ? 'Cash on Delivery' : 'Online (Razorpay)'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Amount</p>
                  <p className="font-bold text-zinc-900 text-sm">{INR(selected.total)}</p>
                </div>
                {selected.payment_ref && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Payment Ref</p>
                    <p className="font-mono text-xs text-zinc-700 bg-zinc-100 rounded-lg px-3 py-2">{selected.payment_ref}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Customer's Reason</p>
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm text-zinc-600 leading-relaxed">
                  {selected.reason}
                </div>
              </div>

              {selected.status === 'pending' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 block">Admin Note (optional)</label>
                    <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3}
                      placeholder="Internal note or reason for decision…"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all resize-none"/>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(selected.id, 'approved', selected.order_id)} disabled={updating}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                      <CheckCircle className="h-4 w-4"/>Approve
                    </button>
                    <button onClick={() => updateStatus(selected.id, 'rejected', selected.order_id)} disabled={updating}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                      <XCircle className="h-4 w-4"/>Reject
                    </button>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-500">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-zinc-400"/>
                    <span><strong>Reject</strong> → order back to "delivered". <strong>Approve</strong> → process the refund, then mark Completed.</span>
                  </div>
                </>
              )}

              {selected.status === 'approved' && (
                <>
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
                    <strong>Approved.</strong> Once you've sent the refund, mark as Completed below.
                    {selected.payment_ref && (
                      <p className="mt-2 text-xs">Payment Ref: <span className="font-mono font-bold">{selected.payment_ref}</span></p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 block">Admin Note (optional)</label>
                    <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2}
                      placeholder="e.g. Refunded via NEFT, UTR: 123456…"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all resize-none"/>
                  </div>
                  <button onClick={() => updateStatus(selected.id, 'completed', selected.order_id)} disabled={updating}
                    className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                    <CheckCircle className="h-4 w-4"/>Mark as Refunded
                  </button>
                </>
              )}

              {selected.admin_note && selected.status !== 'pending' && (
                <div>
                  <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Admin Note</p>
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm text-zinc-600">
                    {selected.admin_note}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}